// setup-check-told.js - records what a person was TOLD about their plugin, instructions box and privileges.
//
// WHY. Card job_4_5_20260810. setup-check-readings.js reads the three categories and returns readings, but
// nothing called setup_check_reading_told_put, so a telling left no row: no repeat count, no "a newer version
// reset this", no remind-me-later to honour. setup_check_due only hands back sentences for rows that exist.
// This file is that wiring.
//
// WHAT THIS IS: pure. No I/O. Each builder returns { sql, params } for the connector's run_sql, run against the
// person's own company store. Same contract as privilege-answer.js.
//
// THE MAPPING (reading -> door):
//   p_reading_kind = reading.category   (plugin | preferences | privileges - the house word setup-check:reading_kind)
//   p_item         = reading.item       (preferences: the surface the box lives on, passed in - the due sentence
//                                         reads "Your instructions box on <item>")
//   p_expected     = reading.expected   p_found = reading.found   p_remedy = reading.fix
// The row id is tenant:person:account:kind:item, so the SAME coordinate told again increments told_count, and a
// different expected/found at that coordinate (a newer plugin shipped) resets it to 1. Both rules live in the
// door; this file only guarantees the coordinate is stable, which is what the proof holds.
//
// WHAT IS NOT RECORDED, and why (returned as not_recorded, never dropped silently):
//   - quiet buckets (live, no box here, ahead, differs_from_suggestion): not a difference the person must fix;
//     the door refuses expected = found, and a differing wall answer is the owner's call.
//   - ask / unreadable: a reading nobody made. Recording it would invent a difference.
//   - a reading with no fix sentence: the door refuses NO-REMEDY; better refused here with the reason.
//   - permission: its own door, setup_check_told_put.
//
// WHAT THIS IS NOT: a fixer. Nothing here changes a setting. We tell; the person changes it.

'use strict';

const R = require('./setup-check-readings.js');

const TOLD_SQL = 'SELECT id, told_count, declared, observed FROM setup_check_reading_told_put($1, $2, $3, $4, $5, $6, $7, $8, $9)';
const REPLY_SQL = 'SELECT id, reply, reply_until FROM setup_check_reply_put($1, $2, $3, $4, $5, $6, $7, $8)';
const DUE_SQL = 'SELECT line, told_count, why_due FROM setup_check_due($1, $2, $3, $4)';

const KINDS = Object.freeze(['plugin', 'preferences', 'privileges']);
const TELLABLE = new Set([R.BUCKET.NEEDS_UPDATE, R.BUCKET.REVERTED, R.BUCKET.VERSION_LAG, R.BUCKET.MISSING, R.BUCKET.NOT_A_CHOICE]);

function blank(v) { return typeof v !== 'string' || !v.trim(); }

function who({ tenant, person_key, account, by }) {
  for (const [name, v] of [['tenant', tenant], ['person_key', person_key], ['account', account], ['by', by]]) {
    if (blank(v)) return name + ' is required.';
  }
  return null;
}

/* The coordinate a reading is stored at. Exposed so a reply lands on exactly the row that was told. */
function coordinate(reading, { surface } = {}) {
  const kind = reading && reading.category;
  const item = kind === 'preferences' ? surface : reading && reading.item;
  return { kind, item };
}

/* One reading -> one door call, or { ok:false, why }. */
function toldCall(reading, ctx = {}) {
  const missing = who(ctx);
  if (missing) return { ok: false, why: missing };
  if (!reading || !KINDS.includes(reading.category)) {
    return { ok: false, why: 'not a plugin, preferences or privileges reading (' + (reading && reading.category) + '); permissions go through setup_check_told_put.' };
  }
  if (!TELLABLE.has(reading.bucket)) return { ok: false, why: 'bucket ' + reading.bucket + ' is not a difference to tell.' };
  const { kind, item } = coordinate(reading, ctx);
  if (blank(item)) return { ok: false, why: 'preferences needs the surface the box lives on (e.g. claude.ai).' };
  if (blank(reading.expected) || blank(reading.found)) return { ok: false, why: 'the reading carries no expected/found values.' };
  if (reading.expected.trim() === reading.found.trim()) return { ok: false, why: 'expected equals found; not a difference.' };
  if (blank(reading.fix)) return { ok: false, why: 'the reading carries no fix sentence, and the door refuses a telling without a remedy.' };
  return { ok: true, sql: TOLD_SQL,
    params: [ctx.tenant, ctx.person_key, ctx.account, kind, item.trim(), reading.expected.trim(), reading.found.trim(), reading.fix.trim(), ctx.by] };
}

/* A readSetup() result -> the calls to make once the person has been shown it, plus what was not recorded and why. */
function toldCalls(setup, ctx = {}) {
  const calls = [], not_recorded = [];
  for (const r of (setup && setup.not_right) || []) {
    const c = toldCall(r, ctx);
    if (c.ok) calls.push({ category: r.category, item: r.item, sql: c.sql, params: c.params });
    else not_recorded.push({ category: r.category, item: r.item, bucket: r.bucket, why: c.why });
  }
  return { calls, not_recorded };
}

/* What the person said back (remind-me-later / i-meant-it). The WORD is not checked here: the store's vocabulary
   wall refuses an unregistered reply, and pre-refusing would leave that wall untested. until: 'YYYY-MM-DD' or null. */
function replyCall(reading, { reply, until = null, ...ctx } = {}) {
  const missing = who(ctx);
  if (missing) return { ok: false, why: missing };
  if (blank(reply)) return { ok: false, why: 'reply is required.' };
  const { kind, item } = coordinate(reading, ctx);
  if (!KINDS.includes(kind) || blank(item)) return { ok: false, why: 'no told coordinate for this reading.' };
  return { ok: true, sql: REPLY_SQL, params: [ctx.tenant, ctx.person_key, ctx.account, kind, item.trim(), reply.trim(), ctx.by, until] };
}

function dueCall({ tenant, person_key, account, occasion }) {
  for (const [name, v] of [['tenant', tenant], ['person_key', person_key], ['account', account], ['occasion', occasion]]) {
    if (blank(v)) return { ok: false, why: name + ' is required.' };
  }
  return { ok: true, sql: DUE_SQL, params: [tenant, person_key, account, occasion] };
}

/* THE SENTENCE A PERSON SEES. setup_check_due hands back a line built from the told row, and for privileges that row
   holds keys and values (wall_icp, everyone, unanswered) - words a person never chose. This renders privilege rows
   from the question store instead: the question's own wording and the choice's own label. requirements: the served
   question rows ({req_key, wording, options:[{value,label}]}) from requirement_prompt / the snapshot.
   A key with no served question is named generically, never shown raw. Plugin and preferences lines are already
   plain and pass through. */
const UNANSWERED = 'unanswered';
function topicOf(wording) {
  const t = String(wording || '').replace(/\s*[\u2014\u2013-]\s*who can see it\??\s*$/i, '').trim();
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : null;
}
function dueLine(row, requirements) {
  if (!row || row.connector_id !== 'privileges') return row && row.line;
  const req = (requirements || []).find((r) => r && (r.req_key || r.key) === row.tool_name);
  const label = (v) => {
    const o = req && (req.options || []).find((x) => x && x.value === v);
    return o && o.label ? o.label : null;
  };
  const topic = req && topicOf(req.wording || req.prompt);
  const what = topic ? 'who can see ' + topic : 'who can see one of your company answers';
  const suggestion = label(row.declared);
  const now = row.observed === UNANSWERED ? 'nobody has decided ' + what + ' yet'
    : (label(row.observed) ? what + ' is set to "' + label(row.observed) + '"' : what + ' is set to something that is not one of the choices');
  const first = now.charAt(0).toUpperCase() + now.slice(1);
  return first + (suggestion ? '; the suggestion is "' + suggestion + '".' : '.') + (row.remedy ? ' ' + row.remedy : '');
}

module.exports = { TOLD_SQL, dueLine, REPLY_SQL, DUE_SQL, KINDS, coordinate, toldCall, toldCalls, replyCall, dueCall };
