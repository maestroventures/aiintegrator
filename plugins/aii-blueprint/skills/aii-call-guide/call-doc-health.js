'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════
   call-doc-health.js — THE HEALTH BADGE AND THE "SOMETHING WRONG? REPORT IT" BUTTON
   on every call guide and every call debrief.

   RULING: dr_every_call_document_carries_a_problem_badge_and_a_report_button_20260925. The
   operator, verbatim: "isn't there a badge that you could put on the guide and or the call guide
   and or the debrief that basically identifies a problem? With a copy paste into a session or
   something that says report this ... I need to know to give you that feedback. I can't go
   searching for it."
   SPEC: Call-Record-Lifecycle-SPEC-v1.0 section 8 (the badge, the button, the report path).

   ONE MODULE, TWO SKILLS. The plugin format has no shared folder, so this file is bundled into
   aii-call-guide AND aii-call-debrief; the pack's G12 gate proves each copy byte-identical to
   the one source (04/scripts/call-doc-health.js). Same rule as register-call-doc.js.

   THE SHAPE, in three moves, all pure (no fs, no network, no clock except the one `now` a
   caller passes in):
     1. guideFacts() / debriefFacts()  — the builder hands in what it KNOWS at build time (the
        email lookup, the transcript flag, the promises, the CRM link) and gets back a JUDGED
        health object: { v, tone, head, line, reasons:[{code,tone,say}], asOf, asOfSay }.
     2. The builder stores that object in the page CONFIG (cfg.health). Kept state stores the
        config, so a re-render from kept state draws the SAME badge from the SAME facts and the
        bytes still match the recorded sha256. Nothing is re-judged at render time.
     3. badgeHtml(cfg) draws it at the top of the page, with the report button. A page built
        before badges existed (no cfg.health) draws a grey "Not checked" badge — and still gets
        the button, because the button is for every page, not only a red one.

   EVERY SENTENCE IS PLAIN WORDS. A reason a session supplies (content.health.problems) is
   refused if it carries internal jargon (a table name, an exit code, an underscore) — the badge
   is read by the person who took the call, not by the person who built the builder.

   THE BUTTON, two paths carrying ONE payload {doc_id, kind, person, meeting_date, tone, reasons,
   note}:
     · served by the Command Center (http/https): one POST to /api/cc/call-doc-report, relative
       and cookie-signed — the same door shape "Update this guide" already uses.
     · opened from a file (file://), where no POST can sign in: the button COPIES a prefilled
       message — "Report: guide <doc_id> for <person> <date> — <reasons> — <note>" plus the
       payload as one JSON line — and says "Copied — paste it into any Claude session".
     · a POST that fails for any reason falls back to the copy and says why. A report is never
       silently lost.
   ════════════════════════════════════════════════════════════════════════════════════════════ */

const HEALTH_V = 1;
const TONE_RANK = { green: 0, amber: 1, red: 2 };
const HEAD = { green: 'Checked', amber: 'Needs a look', red: 'Something is wrong', grey: 'Not checked' };
const DEFAULT_ZONE = 'America/Boise';
const REPORT_PATH = '/api/cc/call-doc-report';
const NOTE_MAX = 200;
const SAY_MIN = 8;
const SAY_MAX = 140;

/* The reason codes. The Command Center's report store keys routing on these, so they are a
   contract: add a code here and in call_doc_report_kind() in the same change. */
const CODES = Object.freeze({
  RECAP_ONLY: 'recap-only',
  NOTES_ONLY: 'no-transcript',
  NO_SOURCE: 'no-transcript-no-notes',
  NO_NOTES: 'no-notes',
  PROMISE_NO_DUE: 'promise-no-due',
  CRM_MISSING: 'crm-missing-email',
  NO_CRM_RECORD: 'no-crm-record',
  NOTED: 'noted',
});

/* Words that mean nothing to the person reading the page. A session-supplied reason carrying one
   is refused at build — the builder exits before a byte is written, like every other gate. */
const JARGON_RX = /(_|\bcall_doc\b|\bkept[- ]state\b|\bhosted[- ]gap\b|\bexit \d+\b|\bsha\d*\b|\bnull\b|\bundefined\b|\bjson\b|\bsql\b|\bregistrar\b|\bquarantin)/i;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

/* A date with a time of day, in the operator's zone: "Sep 24, 3:12 PM MDT". Computed ONCE at
   build and stored, so a re-render never depends on the machine's time-zone data. */
function fmtWhen(iso, zone) {
  const t = Date.parse(String(iso || ''));
  if (isNaN(t)) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone || DEFAULT_ZONE, month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(t)).replace(' at ', ', ');
  } catch (e) {
    return new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }
}
function fmtDay(iso, zone) {
  const t = Date.parse(String(iso || ''));
  if (isNaN(t)) return null;
  try { return new Intl.DateTimeFormat('en-US', { timeZone: zone || DEFAULT_ZONE, month: 'short', day: 'numeric' }).format(new Date(t)); }
  catch (e) { return new Date(t).toISOString().slice(0, 10); }
}

function reason(code, tone, say) { return { code, tone, say }; }

/* A problem a session knows about and this module cannot derive ("the transcript cut off at
   minute 12"). Validated, never trusted: plain words, one sentence, amber or red. */
function sessionProblems(content) {
  const h = content && content.health;
  const list = h && Array.isArray(h.problems) ? h.problems : [];
  return list.map(function (p, i) {
    const where = 'health.problems[' + i + ']';
    const say = String((p && p.say) || '').replace(/\s+/g, ' ').trim();
    const tone = p && p.tone;
    if (tone !== 'amber' && tone !== 'red') throw healthRefuse(where + '.tone must be "amber" or "red" — got ' + JSON.stringify(tone));
    if (say.length < SAY_MIN || say.length > SAY_MAX) throw healthRefuse(where + '.say must be one plain sentence of ' + SAY_MIN + '-' + SAY_MAX + ' characters');
    if (JARGON_RX.test(say)) throw healthRefuse(where + '.say "' + say + '" carries internal words. Say it the way you would say it to the person who took the call.');
    return reason(CODES.NOTED, tone, say);
  });
}

function healthRefuse(sentence) {
  const e = new Error('call-doc-health: REFUSED — ' + sentence + '\nNo document was written.');
  e.exitCode = 23; e.healthCode = true;
  return e;
}

function judge(reasons, asOf, zone, now, greenLine) {
  let tone = 'green';
  reasons.forEach(function (r) { if (TONE_RANK[r.tone] > TONE_RANK[tone]) tone = r.tone; });
  const asOfSay = asOf ? fmtWhen(asOf, zone) : null;
  const line = tone === 'green' ? greenLine(asOfSay)
    : (reasons.length === 1 ? reasons[0].say : plural(reasons.length, 'problem', 'problems') + ' found');
  return { v: HEALTH_V, tone, head: HEAD[tone], line, reasons, asOf: asOf || null, asOfSay,
           checkedAt: (now instanceof Date ? now : new Date(now || Date.now())).toISOString() };
}

/* ── THE GUIDE ─────────────────────────────────────────────────────────────────────────────
   facts.emailRecord: the gate file's `newestEmail` (already validated by readEmailRecord):
     { crm: {id,date}|null, mailbox: {message_id,date,account}|null, crmMissing?: <count> }
   facts.crmAttached: crmRecordGate(config).attached. facts.content: the guide JSON. */
function guideFacts(facts) {
  const f = facts || {};
  const zone = f.zone || DEFAULT_ZONE;
  const rec = f.emailRecord || {};
  const reasons = [];
  const crmT = rec.crm && Date.parse(rec.crm.date);
  const boxT = rec.mailbox && Date.parse(rec.mailbox.date);
  const n = Number.isInteger(rec.crmMissing) && rec.crmMissing >= 0 ? rec.crmMissing : null;
  if (n !== null) {
    if (n > 0) reasons.push(reason(CODES.CRM_MISSING, 'amber', 'The CRM is missing ' + plural(n, 'email', 'emails') + ' with this person'));
  } else if (boxT && (!crmT || boxT - crmT > 60000)) {
    reasons.push(reason(CODES.CRM_MISSING, 'amber', 'The CRM is missing your newest email with this person (' + fmtDay(rec.mailbox.date, zone) + ')'));
  }
  if (f.crmAttached === false) reasons.push(reason(CODES.NO_CRM_RECORD, 'amber', 'Not linked to this person in your CRM'));
  sessionProblems(f.content).forEach(function (r) { reasons.push(r); });
  const newest = [rec.crm && rec.crm.date, rec.mailbox && rec.mailbox.date]
    .filter(function (d) { return d && !isNaN(Date.parse(d)); })
    .sort(function (a, b) { return Date.parse(b) - Date.parse(a); })[0] || null;
  return judge(reasons, newest, zone, f.now, function (asOfSay) {
    return asOfSay ? 'Checked — current as of ' + asOfSay : 'Checked — no email with this person yet';
  });
}

/* ── THE DEBRIEF ───────────────────────────────────────────────────────────────────────────
   facts.content: the debrief JSON. facts.tx: { text } for a transcript, { none: <reason> } for a
   declared --no-transcript. facts.crmAttached. facts.callEndedAt (config).
   content.health (optional, from the session): { source: transcript|recap|notes,
   operatorNotes: boolean, crmMissingEmails: <count>, newestEmailAt: <ISO>, problems: [...] }. */
function sourceOf(content, tx) {
  const h = (content && content.health) || {};
  if (['transcript', 'recap', 'notes'].indexOf(h.source) >= 0) return h.source;
  if (tx && tx.none != null) return /recap/i.test(String(tx.none)) ? 'recap' : 'notes';
  const s = sourcesLine(content);
  if (/recap/i.test(s) && !/transcript/i.test(s)) return 'recap';
  return 'transcript';
}
function sourcesLine(content) {
  const bar = content && Array.isArray(content.contextBar) ? content.contextBar : [];
  const hit = bar.filter(function (x) { return x && /^sources?$/i.test(String(x.label || '').trim()); })[0];
  return hit ? String(hit.value || '') : '';
}
function hasOperatorNotes(content, source) {
  const h = (content && content.health) || {};
  if (typeof h.operatorNotes === 'boolean') return h.operatorNotes;
  if (source === 'notes') return true;
  if (/notes/i.test(sourcesLine(content))) return true;
  return !!(content && Array.isArray(content.conflicts) && content.conflicts.some(function (c) { return c && String(c.operatorSaid || '').trim(); }));
}
function debriefFacts(facts) {
  const f = facts || {};
  const zone = f.zone || DEFAULT_ZONE;
  const d = f.content || {};
  const h = d.health || {};
  const reasons = [];
  const source = sourceOf(d, f.tx);
  const notes = hasOperatorNotes(d, source);
  if (source !== 'transcript' && !notes) {
    reasons.push(reason(CODES.NO_SOURCE, 'red', source === 'recap'
      ? 'Built from a recap email only — no transcript and no notes from you'
      : 'No transcript and no notes from you — there is little to stand on'));
  } else {
    if (source === 'recap') reasons.push(reason(CODES.RECAP_ONLY, 'amber', 'Built from a recap email only — no transcript'));
    if (source === 'notes') reasons.push(reason(CODES.NOTES_ONLY, 'amber', 'No transcript — built from your notes only'));
    if (!notes) reasons.push(reason(CODES.NO_NOTES, 'amber', 'No notes from you on this call'));
  }
  const noDue = (Array.isArray(d.promises) ? d.promises : []).filter(function (p) {
    return p && (p.spokenDue == null || String(p.spokenDue).trim() === '');
  }).length;
  if (noDue) reasons.push(reason(CODES.PROMISE_NO_DUE, 'amber', plural(noDue, 'promise has', 'promises have') + ' no due date'));
  if (Number.isInteger(h.crmMissingEmails) && h.crmMissingEmails > 0) {
    reasons.push(reason(CODES.CRM_MISSING, 'amber', 'The CRM is missing ' + plural(h.crmMissingEmails, 'email', 'emails') + ' with this person'));
  }
  if (f.crmAttached === false) reasons.push(reason(CODES.NO_CRM_RECORD, 'amber', 'Not linked to this person in your CRM'));
  sessionProblems(d).forEach(function (r) { reasons.push(r); });
  const asOf = [h.newestEmailAt, f.callEndedAt, d.callEndedAt].filter(function (x) { return x && !isNaN(Date.parse(x)); })[0] || null;
  return judge(reasons, asOf, zone, f.now, function (asOfSay) {
    return asOfSay ? 'Checked — current as of ' + asOfSay : 'Checked — built from the transcript and your notes';
  });
}

/* ── THE BADGE ─────────────────────────────────────────────────────────────────────────────
   Reads cfg.health ONLY. cfg = the config the page embeds (kind, docId, prospect, meetingDate). */
const BADGE_CSS =
  '.cdh{max-width:820px;margin:12px auto 0;border-radius:10px;padding:10px 14px;border:1px solid;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif}' +
  '.cdh-green{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}.cdh-amber{background:#fffbeb;border-color:#fcd34d;color:#92400e}' +
  '.cdh-red{background:#fef2f2;border-color:#fecaca;color:#991b1b}.cdh-grey{background:#f5f5fa;border-color:#e5e5ef;color:#4b4b63}' +
  '.cdh-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cdh-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;background:currentColor}' +
  '.cdh-head{font-size:.8rem;font-weight:800;letter-spacing:.03em;text-transform:uppercase}.cdh-line{flex:1;font-size:.84rem;font-weight:500;min-width:180px}' +
  '.cdh-btn{border:1px solid currentColor;background:#fff;color:inherit;border-radius:7px;padding:6px 12px;font-size:.76rem;font-weight:700;cursor:pointer}' +
  '.cdh-list{margin:8px 0 0 22px;font-size:.82rem;line-height:1.55}.cdh-form{display:none;gap:8px;margin-top:10px;flex-wrap:wrap}.cdh-form.show{display:flex}' +
  '.cdh-tawrap{position:relative;flex:1;min-width:200px;display:flex}.cdh-tawrap .cgb-mic{position:absolute;top:3px;right:4px;border:1px solid #d5d5e5;background:#fff;border-radius:7px;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1;padding:0}' +
  '.cdh-note{flex:1;min-width:200px;border:1px solid #d5d5e5;border-radius:7px;padding:7px 40px 7px 10px;font:inherit;font-size:.82rem;color:#0d0d24}' +
  '.cdh-send{background:#4f46e5;color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:.78rem;font-weight:700;cursor:pointer}' +
  '.cdh-cancel{background:transparent;color:inherit;border:1px solid #d5d5e5;border-radius:7px;padding:7px 12px;font-size:.78rem;cursor:pointer}' +
  '.cdh-status{font-size:.78rem;margin-top:6px;min-height:1em}.cdh-status.ok{color:#047857}.cdh-status.warn{color:#b91c1c}';

/* The page runtime, ES5, no dependency on either builder's own runtime. */
const BADGE_RUNTIME =
  'function cdhEl(i){return document.getElementById(i);}' +
  'function cdhSay(t,c){var s=cdhEl("cdhStatus");if(s){s.textContent=t;s.className="cdh-status "+(c||"");}}' +
  'function cdhOpen(){var f=cdhEl("cdhForm");if(f){f.className="cdh-form show";var n=cdhEl("cdhNote");if(n)n.focus();}}' +
  'function cdhClose(){var f=cdhEl("cdhForm");if(f)f.className="cdh-form";}' +
  'function cdhServed(){return String(location.protocol).indexOf("http")===0;}' +
  'function cdhPayload(note){return{doc_id:CDH.doc_id||null,kind:CDH.kind,person:CDH.person||"",meeting_date:CDH.meeting_date||"",tone:CDH.tone,reasons:CDH.reasons,note:note||""};}' +
  'function cdhDay(d){d=String(d||"");return /^\\d{8}$/.test(d)?d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6):d;}' +
  'function cdhText(p){var r=p.reasons.length?p.reasons.map(function(x){return x.say;}).join("; "):"nothing showing on the badge";' +
    'return "Report: "+p.kind+" "+(p.doc_id||"(no id)")+" for "+(p.person||"?")+" "+cdhDay(p.meeting_date)+" \\u2014 "+r+" \\u2014 "+(p.note||"no note")+"\\n[call-doc-report "+JSON.stringify(p)+"]";}' +
  'function cdhClip(t){if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(t).then(function(){return true;},function(){return cdhClipOld(t);});}return Promise.resolve(cdhClipOld(t));}' +
  'function cdhClipOld(t){try{var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();var ok=document.execCommand("copy");document.body.removeChild(a);return ok;}catch(e){return false;}}' +
  'function cdhCopy(p,why){var t=cdhText(p);cdhClip(t).then(function(ok){if(ok){cdhSay("Copied \\u2014 paste it into any Claude session."+(why?" ("+why+")":""),"ok");cdhClose();}' +
    'else{cdhSay("Could not copy. Select this and paste it into any Claude session: "+t,"warn");}});}' +
  'function cdhSend(){var n=cdhEl("cdhNote");var note=String((n&&n.value)||"").replace(/\\s+/g," ").trim().slice(0,' + NOTE_MAX + ');var p=cdhPayload(note);' +
    'if(!cdhServed()){cdhCopy(p,"");return;}cdhSay("Sending\\u2026");' +
    'fetch("' + REPORT_PATH + '",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)})' +
    '.then(function(r){return r.json().catch(function(){return{};}).then(function(j){if(r.ok&&j&&j.ok){cdhSay(j.say||"Sent. It is on its way to us.","ok");cdhClose();}' +
    'else{cdhCopy(p,(j&&j.say)?j.say:"the Command Center said "+r.status);}});})' +
    '.catch(function(){cdhCopy(p,"could not reach the Command Center");});}';

/* The page's own header for the report: who, which document. Drawn from cfg, never re-derived. */
function reportMeta(cfg, kind) {
  const c = cfg || {};
  const h = c.health;
  const tone = h && TONE_RANK[h.tone] != null ? h.tone : 'grey';
  return {
    doc_id: c.docId || null,
    kind: kind,
    person: String(c.prospect || ''),
    meeting_date: String(c.meetingDate || ''),
    tone: tone,
    reasons: h && Array.isArray(h.reasons) ? h.reasons.map(function (r) { return { code: r.code, say: r.say }; }) : [],
  };
}

function badgeHtml(cfg, kind) {
  const h = cfg && cfg.health;
  const meta = reportMeta(cfg, kind);
  const tone = meta.tone;
  const head = HEAD[tone];
  const line = h && h.line ? h.line
    : 'Built before documents carried a health check. If something looks wrong, report it.';
  const list = (h && tone !== 'green' && Array.isArray(h.reasons) && h.reasons.length > 1)
    ? '<ul class="cdh-list">' + h.reasons.map(function (r) { return '<li>' + esc(r.say) + '</li>'; }).join('') + '</ul>' : '';
  return [
    '<style>' + BADGE_CSS + '</style>',
    '<div class="cdh cdh-' + tone + '" id="cdh" data-tone="' + tone + '" role="region" aria-label="Document health">' +
      '<div class="cdh-top"><span class="cdh-dot" aria-hidden="true"></span>' +
      '<span class="cdh-head">' + esc(head) + '</span>' +
      '<span class="cdh-line">' + esc(line) + '</span>' +
      '<button type="button" class="cdh-btn" id="cdhBtn" onclick="cdhOpen()">Something wrong? Report it</button></div>' +
      list +
      '<div class="cdh-form" id="cdhForm"><span class="cdh-tawrap"><input id="cdhNote" class="cdh-note" maxlength="' + NOTE_MAX + '" ' +
        'placeholder="Optional: one line on what is wrong" onkeydown="if(event.key===\'Enter\')cdhSend()">' +
        /* Speakable, like every typed box on the page (the operator: "anywhere there is an input box ... there
           needs to be a microphone"). The page's own canonical warmDictate; never a second one. */
        '<button type="button" class="cgb-mic" id="cdhNoteMic" onclick="warmDictate(\'cdhNote\',\'cdhNoteMic\')" title="Talk instead of type">\uD83C\uDFA4</button></span>' +
        '<button type="button" class="cdh-send" onclick="cdhSend()">Send report</button>' +
        '<button type="button" class="cdh-cancel" onclick="cdhClose()">Cancel</button></div>' +
      '<div class="cdh-status" id="cdhStatus" role="status" aria-live="polite"></div>' +
    '</div>',
    '<script>var CDH=' + JSON.stringify(meta).replace(/</g, '\\u003c') + ';' + BADGE_RUNTIME + '</' + 'script>',
  ].join('\n');
}

module.exports = {
  HEALTH_V, CODES, HEAD, REPORT_PATH, NOTE_MAX, JARGON_RX, DEFAULT_ZONE,
  guideFacts, debriefFacts, badgeHtml, reportMeta, fmtWhen, fmtDay, sourceOf, hasOperatorNotes,
  BADGE_CSS, BADGE_RUNTIME,
};
