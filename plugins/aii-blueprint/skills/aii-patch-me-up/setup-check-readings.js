// setup-check-readings.js - the three setup categories the setup check never read: PLUGIN,
// PREFERENCES (the Settings box) and PRIVILEGES (who can see each company answer).
//
// WHY THIS EXISTS. Card job_4_5_20260810: "The system can tell each person what is still not right
// on THEIR OWN setup - skills, plugins, connectors, preferences and privileges." The shipped skill
// aii-patch-me-up (plugin 0.9.29) reads connectors (Step 2), skills (2b), storage doors (2c),
// per-verb permissions (2d), assets (2e) and the poke schedule (2f). Measured 2026-09-16 on the
// shipped SKILL.md: 'plugin' 0 hits, 'wall_' 0, 'AIOS-GI-FP' 0. Nothing reads the other three.
//
// THE CARD'S OPEN QUESTION WAS "CAN ANY DOOR READ THEM?" - MEASURED 2026-09-16, ALL THREE CAN:
//   plugin      installed: the aii-job-poke skill description carries "Installed AI Integrator
//               Blueprint plugin version: X.Y.Z" in every session's skill listing.
//               newest:    GET /api/onb/plugin?meta=1 -> {version} (read live: 0.9.29), and the
//               store's plugin_bundle.version.
//   preferences the box the session was handed is in its own context; the source carries an
//               "AIOS-GI-FP: <date>-r<N>" token. A surface with NO box is honest-unknown, not red.
//   privileges  the wall_* answers are onb_answer rows; the suggestion is requirement.recommended
//               (house store: everyone x4, named for wall_playbook).
// So no screenshot-or-unknown fork exists for readability. What remains is presence: when nobody
// is on the line a reading the session cannot make is reported as unknown; when someone is, the
// session asks. That is the one mode switch below (attended).
//
// WHAT THIS IS: pure functions. No I/O, no SQL, no clock. Something else fetches the inputs;
// something else draws the result. Same contract as profile-payload.js.
//
// EXPECTED / FOUND (added 2026-09-17): every not-right reading a person can be TOLD about carries the two values
// the told store compares (expected, found). lib/onb/setup-check-told.js turns them into
// setup_check_reading_told_put calls; a reading without them (ask / unreadable) is a reading nobody made.
//
// WHAT THIS IS NOT: a writer. It never changes a setting. The standing rule in the skill holds:
// a session reports a setting; the person changes it.
//
// HONEST LIMITS, STATED:
//   - wall_* answers have NO write door today (requirement_prompt.write_door is null on all five,
//     house store read 2026-09-15). So on a store where nobody answered, every privilege reads
//     'missing'. That is a true reading, and it is also the next build: the answers must land.
//     Built 2026-09-16: lib/onb/privilege-answer.js (writes through onb_answer_put).
//   - A differing wall answer is the owner's call. It is reported as 'differs_from_suggestion',
//     never as wrong.
//   - Box tokens are only as good as the generator that stamps them. profile-payload.js stamped
//     none until 2026-09-16; it now stamps opts.box_version into every box it builds and refuses
//     to build a box without one (prove-profile-box-version-token.js).

'use strict';

const PLUGIN_STAMP = /Installed AI Integrator Blueprint plugin version:\s*(\d+\.\d+\.\d+)/;
const BOX_TOKEN = /AIOS-GI-FP:\s*(\d{4}-\d{2}-\d{2})-r(\d+)/;

/* The plain buckets. One word per state, shared with the skill's own bucket language. */
const BUCKET = Object.freeze({
  LIVE: 'live',
  NEEDS_UPDATE: 'needs_update',
  AHEAD: 'ahead_of_published',
  NO_BOX_HERE: 'no_box_on_this_surface',
  REVERTED: 'no_token',
  VERSION_LAG: 'version_lag',
  MISSING: 'missing',
  DIFFERS: 'differs_from_suggestion',
  NOT_A_CHOICE: 'not_a_listed_choice',
  UNREADABLE: 'unreadable',
  ASK: 'ask_the_person',
});

function parseVersion(v) {
  if (typeof v !== 'string' || !/^\d+\.\d+\.\d+$/.test(v.trim())) return null;
  return v.trim().split('.').map(Number);
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; }
  return 0;
}

/* The installed version, read off the skill listing text a session is handed. null if absent. */
function installedPluginVersion(skillListingText) {
  const m = PLUGIN_STAMP.exec(String(skillListingText || ''));
  return m ? m[1] : null;
}

/* A box token {date, rev} or null. */
function boxToken(text) {
  const m = BOX_TOKEN.exec(String(text || ''));
  return m ? { date: m[1], rev: Number(m[2]), label: m[1] + '-r' + m[2] } : null;
}

function compareTokens(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.rev === b.rev ? 0 : (a.rev < b.rev ? -1 : 1);
}

/* An unreadable input becomes ASK when someone is there, UNREADABLE when nobody is. */
function unknown(category, item, attended, why, question) {
  return attended
    ? { category, item, bucket: BUCKET.ASK, plain: why, ask: question }
    : { category, item, bucket: BUCKET.UNREADABLE, plain: why };
}

function pluginReading({ installed, newest, attended = false }) {
  const item = 'aii-blueprint plugin';
  const n = parseVersion(newest);
  if (!n) return unknown('plugin', item, attended,
    'The newest published plugin version could not be read.',
    'Which version does your Plugins screen show for AI Integrator Blueprint?');
  const i = parseVersion(installed);
  if (!i) return unknown('plugin', item, attended,
    'This session could not read which plugin version is installed.',
    'Which version does your Plugins screen show for AI Integrator Blueprint?');
  const c = compareVersions(i, n);
  if (c === 0) return { category: 'plugin', item, bucket: BUCKET.LIVE, plain: 'You have the newest plugin, ' + newest + '.' };
  if (c < 0) return {
    category: 'plugin', item, bucket: BUCKET.NEEDS_UPDATE, expected: newest.trim(), found: installed.trim(),
    plain: 'You have plugin ' + installed + '; the newest is ' + newest + '.',
    fix: 'Install the newest plugin from the plugin link, then start a new session.',
  };
  return { category: 'plugin', item, bucket: BUCKET.AHEAD,
    plain: 'You have plugin ' + installed + ', newer than the published ' + newest + '. Nothing for you to do; the published copy is behind.' };
}

/* boxText === null means this surface has no box at all (e.g. Claude Code). That is not a fault. */
function preferenceReading({ boxText, sourceText, attended = false }) {
  const item = 'Instructions for Claude box';
  const src = boxToken(sourceText);
  if (!src) return unknown('preferences', item, attended,
    'The saved copy of your instructions carries no version token, so there is nothing to compare against.',
    'Can you open Settings and tell me the first line of your Instructions for Claude box?');
  if (boxText === null || boxText === undefined) {
    return { category: 'preferences', item, bucket: BUCKET.NO_BOX_HERE,
      plain: 'This surface has no instructions box, so there is nothing here to check.' };
  }
  const box = boxToken(boxText);
  if (!box) return {
    category: 'preferences', item, bucket: BUCKET.REVERTED, expected: src.label, found: 'no-token',
    plain: 'Your instructions box has no version token. It has likely reverted or was never pasted.',
    fix: 'Paste the saved copy (' + src.label + ') into Settings, Instructions for Claude.',
  };
  const c = compareTokens(box, src);
  if (c === 0) return { category: 'preferences', item, bucket: BUCKET.LIVE, plain: 'Your instructions box is current (' + src.label + ').' };
  if (c < 0) return {
    category: 'preferences', item, bucket: BUCKET.VERSION_LAG, expected: src.label, found: box.label,
    plain: 'Your box is ' + box.label + '; the saved copy is ' + src.label + '. The copy was edited after you pasted it.',
    fix: 'Paste the saved copy (' + src.label + ') into Settings, Instructions for Claude.',
  };
  return { category: 'preferences', item, bucket: BUCKET.AHEAD,
    plain: 'Your box (' + box.label + ') is newer than the saved copy (' + src.label + '). The saved copy is behind, not you.' };
}

/* requirements: [{req_key, recommended, options:[{value,label}]}]; answers: [{req_key|question_key, answer, status}].
   An EMPTY requirement list is a named state, never an empty (all-clear) result. */
function privilegeReadings({ requirements, answers, attended = false }) {
  const walls = (requirements || []).filter((r) => /^wall_/.test(String(r && r.req_key)));
  if (walls.length === 0) {
    return [unknown('privileges', 'who can see each company answer', attended,
      'No visibility questions were found to check against, so privileges could not be read.',
      'Who in your company should be able to see what your company does, its customers, its prices, its voice and its playbook?')];
  }
  const byKey = new Map();
  for (const a of answers || []) {
    const k = a && (a.req_key || a.question_key);
    if (!k || a.status === 'retired') continue;
    byKey.set(k, a);
  }
  return walls.map((r) => {
    const item = r.req_key;
    const question = r.wording || null;
    const a = byKey.get(r.req_key);
    const raw = a ? a.answer : null;
    const said = raw && typeof raw === 'object' ? (raw.value !== undefined ? raw.value : null) : raw;
    const labelOf = (v) => ((r.options || []).find((o) => o.value === v) || {}).label || v;
    if (said === null || said === undefined || String(said).trim() === '') {
      return { category: 'privileges', item, question, bucket: BUCKET.MISSING, expected: r.recommended, found: 'unanswered',
        plain: 'Nobody has decided who can see this yet. The suggestion is "' + labelOf(r.recommended) + '".',
        fix: 'The company owner decides this one; nobody else can.' };
    }
    const values = (r.options || []).map((o) => o.value);
    if (values.length && !values.includes(said)) {
      return { category: 'privileges', item, question, bucket: BUCKET.NOT_A_CHOICE, expected: r.recommended, found: String(said),
        plain: 'The saved answer "' + said + '" is not one of the choices.',
        fix: 'The company owner picks one of: ' + values.map(labelOf).join(', ') + '.' };
    }
    if (said !== r.recommended) {
      return { category: 'privileges', item, question, bucket: BUCKET.DIFFERS,
        plain: 'Set to "' + labelOf(said) + '"; the suggestion is "' + labelOf(r.recommended) + '". That is the owner\'s call, not a fault.' };
    }
    return { category: 'privileges', item, question, bucket: BUCKET.LIVE, plain: 'Set to "' + labelOf(said) + '", as suggested.' };
  });
}

/* One person's readings for the three categories. The fix list is only what is not live. */
function readSetup(input) {
  const attended = !!(input && input.attended);
  const readings = [
    pluginReading({ ...(input.plugin || {}), attended }),
    preferenceReading({ ...(input.preferences || {}), attended }),
    ...privilegeReadings({ ...(input.privileges || {}), attended }),
  ];
  const quiet = new Set([BUCKET.LIVE, BUCKET.NO_BOX_HERE, BUCKET.AHEAD, BUCKET.DIFFERS]);
  return { readings, not_right: readings.filter((r) => !quiet.has(r.bucket)) };
}

module.exports = {
  BUCKET, installedPluginVersion, boxToken, pluginReading, preferenceReading, privilegeReadings, readSetup,
};
