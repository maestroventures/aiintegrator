#!/usr/bin/env node
/* prove-promise-writer.js — added 2026-09-24 (v0.9.50, Call Record fix B9; Call-Record-Lifecycle-SPEC-v1.0
   stage 11). Proves the debrief builder's PROMISE WRITER by RUNNING the builder that sits next to this file,
   in a throwaway folder, the way the skill and the sweep run it. It goes RED if any of these regress:

     W1  a debrief JSON with no `promises` key is refused, exit 21, and nothing is written;
     W2  a build that names no transcript (neither --transcript nor --no-transcript) is refused, exit 21;
     W3  THE RULE: a transcript that shows the user's send-promise ("I'll send you…") with no `promises`
         item is refused, exit 21, the refusal quotes the line, and nothing is written;
     W4  the other side's promise is not the user's: it passes when named in `notPromises` with a reason,
         or when config.operatorSpeaker limits the scan to the user's own turns;
     W5  a declared promise builds (exit 0 with --folder): stdout `promises` carries one promise_put call
         whose params are exactly what the store's door takes, and <out>.promises.json is written;
     W6  a transcript-kind sourceLine that is not in the transcript, verbatim, is refused;
     W7  spoken words without a date, or a date without spoken words, are refused (the store's own rule);
     W8  no call end time, or no writer, is refused; a job's builtBy writes as job:<builtBy>;
     W9  two items with one `what` are refused (they would collapse into one row);
     W10 --no-transcript refuses a transcript-kind promise and accepts a recap one;
     C1  --promises-check exits 0 when every promise has its row, and returns the promise ids;
     C2  it exits 22 PROMISE ROWS SHORT, naming each item, when a row is missing;
     C3  it exits 22 on rows for another document;
     C4  a zero-promise plan with zero rows exits 0;
     R1  --regen re-emits the promise plan from kept state (idempotent back-fill), and refuses (21)
         kept promises with no writer;
     K   the 0.9.50 openable rule still holds: without --folder the same promise build exits 20;
     M   MUTATE-TO-PROVE. A builder whose transcript scan finds nothing, a builder that accepts a missing
         `promises` key, and a verdict that ignores missing rows must each turn their test RED. A test
         that passes against a mutant proves nothing.

   Writes only inside a temp folder it removes. Exit 0 = all green, 1 = a check went red.
   Usage: node prove-promise-writer.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const BUILDER = path.join(HERE, 'build-call-debrief.js');
const REGISTRAR = path.join(HERE, 'register-call-doc.js');
const UNRECORDED = 21, ROWS_SHORT = 22, NOT_OPENABLE = 20;

let fail = 0, pass = 0;
function check(name, ok, got) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      got: ' + String(got).slice(0, 500)));
  if (ok) pass++; else fail++;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prove-promise-writer-'));
let seq = 0;
function w(name, obj) { const p = path.join(tmp, name); fs.writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj)); return p; }

const TX = [
  '00:00:04',
  'Alex Rivera: Thanks for making the time, Pat.',
  'Pat Doe: Happy to. I’ll send you our lead numbers from last quarter.',
  'Alex Rivera: Perfect. I’ll send you the one-page summary and the terms by Friday.',
  'Pat Doe: Sounds good.',
].join('\n');
const LINE_US = 'I’ll send you the one-page summary and the terms by Friday.';
const LINE_THEM = 'I’ll send you our lead numbers from last quarter.';
const TX_PATH = w('transcript.txt', TX);
const FOLDER_OK = w('folder-ok.json', [{ drive_folder_id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', path_label: '02 — Clients/Acme Co/Calls' }]);
const BASE_CONFIG = { eventId: '4p9e9u82qq2au5hl31o7tsq21d', meetingDate: '20260918', prospect: 'Pat Doe', company: 'Acme Co',
  domain: 'acme.com', leadId: 'lead_abc', crmName: 'Close', debriefId: 'pat-doe-20260918', callRef: 'ff_abc123',
  callEndedAt: '2026-09-18T10:30:00-06:00' };
const PROMISE = { to: { name: 'Pat Doe', email: 'pat@acme.com' }, what: 'One-page summary and terms', sourceLine: LINE_US,
  sourceKind: 'transcript', spokenDue: 'by Friday', spokenDueAt: '2026-09-19T17:00:00-06:00' };
const NOT_THEIRS = { line: LINE_THEM, why: 'Pat’s promise to us, not ours: it is a needsInfo item.' };

function doc(extra) {
  return Object.assign({ header: { title: 'Debrief — Pat Doe' }, captureQuestions: [],
    nextCallGoal: 'Lock the rooftop and the start date.' }, extra || {});
}
function build(d, opts) {
  opts = opts || {};
  const dir = path.join(tmp, 'run' + (++seq)); fs.mkdirSync(dir);
  const out = path.join(dir, '20260918_debrief_pat-doe_intro.html');
  const args = [opts.builder || BUILDER, w('doc' + seq + '.json', d), w('cfg' + seq + '.json', Object.assign({}, BASE_CONFIG, opts.config || {})), out]
    .concat(opts.tx === false ? [] : ['--transcript', opts.txPath || TX_PATH])
    .concat(opts.folder === false ? [] : ['--folder', FOLDER_OK])
    .concat(opts.by === false ? [] : ['--promise-by', opts.by || 'session:prove_promise'])
    .concat(opts.flags || []);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
  let json = null; try { json = JSON.parse(r.stdout); } catch (_) { /* */ }
  return { rc: r.status, json, stdout: r.stdout, stderr: r.stderr, out, files: fs.readdirSync(dir) };
}
function refusedClean(b) { return b.rc === UNRECORDED && /PROMISE UNRECORDED/.test(b.stderr) && b.files.length === 0; }
function checkRows(planPath, rows, builder) {
  const r = spawnSync(process.execPath, [builder || BUILDER, '--promises-check', planPath, '--rows', w('rows' + (++seq) + '.json', rows)], { encoding: 'utf8' });
  let json = null; try { json = JSON.parse(r.stdout); } catch (_) { /* */ }
  return { rc: r.status, json, stderr: r.stderr };
}

try {
  console.log('prove-promise-writer — ' + path.basename(BUILDER));

  /* W1, W2 */
  const w1 = build(doc({}));
  check('W1 no `promises` key is refused (exit 21) and nothing is written', refusedClean(w1), w1.rc + ' ' + w1.stderr);
  const w2 = build(doc({ promises: [] }), { tx: false });
  check('W2 a build that names no transcript is refused (exit 21)', refusedClean(w2) && /no transcript was handed in/.test(w2.stderr), w2.rc + ' ' + w2.stderr);

  /* W3 — the rule */
  const w3 = build(doc({ promises: [], notPromises: [NOT_THEIRS] }));
  check('W3 the transcript shows the user\'s send-promise and `promises` is empty: refused, exit 21, nothing written',
    refusedClean(w3), w3.rc + ' ' + w3.stderr);
  check('W3b the refusal quotes the uncovered line, with its speaker', /Alex Rivera: Perfect\. I.ll send you the one-page summary/.test(w3.stderr), w3.stderr);

  /* W4 */
  const w4a = build(doc({ promises: [PROMISE] }));
  check('W4a the other side\'s "I\'ll send you" is flagged when nothing names it', refusedClean(w4a) && /Pat Doe: Happy to\. I.ll send you our lead numbers/.test(w4a.stderr), w4a.rc + ' ' + w4a.stderr);
  const w4b = build(doc({ promises: [PROMISE], notPromises: [NOT_THEIRS] }));
  check('W4b ...and passes when named in `notPromises` with a reason', w4b.rc === 0, w4b.rc + ' ' + w4b.stderr);
  const w4c = build(doc({ promises: [PROMISE] }), { config: { operatorSpeaker: 'Alex Rivera' } });
  check('W4c ...or when config.operatorSpeaker limits the scan to the user\'s own turns', w4c.rc === 0, w4c.rc + ' ' + w4c.stderr);
  const w4d = build(doc({ promises: [PROMISE], notPromises: [{ line: LINE_THEM, why: 'theirs' }] }));
  check('W4d a `notPromises` entry with no real reason is refused', refusedClean(w4d) && /why is missing or too short/.test(w4d.stderr), w4d.rc + ' ' + w4d.stderr);

  /* W5 */
  const p = w4b.json && w4b.json.promises;
  const c0 = p && p.calls && p.calls[0];
  const R = require(REGISTRAR);
  const WANT = [R.TENANT, w4b.json && w4b.json.docId, 'Pat Doe', 'pat@acme.com', 'lead_abc', 'One-page summary and terms', LINE_US,
    'transcript', '2026-09-18T10:30:00-06:00', 'by Friday', '2026-09-19T17:00:00-06:00', 'session:prove_promise'];
  check('W5a stdout `promises` carries one promise_put call for this doc', p && p.count === 1 && p.calls.length === 1 &&
    /promise_put\(\$1, \$2/.test(c0.sql) && /call_guide_state_current_v/.test(c0.sql), w4b.stdout.slice(0, 400));
  check('W5b its params are exactly the door\'s 12 (tenant, doc, name, email, lead, what, line, kind, promised_at, spoken_due, spoken_due_at, by)',
    c0 && JSON.stringify(c0.params) === JSON.stringify(WANT), c0 && JSON.stringify(c0.params));
  check('W5c <out>.promises.json is written and matches stdout, with a check read and a judge',
    fs.existsSync(w4b.out + '.promises.json') && JSON.stringify(JSON.parse(fs.readFileSync(w4b.out + '.promises.json', 'utf8'))) === JSON.stringify(p) &&
    /FROM call_promise/.test(p.check.sql) && /--promises-check/.test(p.judge), p && JSON.stringify(p.check));

  /* W6 — W10 */
  const w6 = build(doc({ promises: [Object.assign({}, PROMISE, { sourceLine: 'I will send the deck on Monday.' })], notPromises: [NOT_THEIRS,
    { line: LINE_US, why: 'covered to isolate the verbatim test' }] }));
  check('W6 a transcript-kind sourceLine that is not in the transcript is refused', refusedClean(w6) && /not in the transcript, verbatim/.test(w6.stderr), w6.rc + ' ' + w6.stderr);
  const w7a = build(doc({ promises: [Object.assign({}, PROMISE, { spokenDueAt: null })], notPromises: [NOT_THEIRS] }));
  const w7b = build(doc({ promises: [Object.assign({}, PROMISE, { spokenDue: null })], notPromises: [NOT_THEIRS] }));
  check('W7 spoken words without a date, and a date nobody said, are each refused',
    refusedClean(w7a) && /no spokenDueAt/.test(w7a.stderr) && refusedClean(w7b) && /a date nobody said/.test(w7b.stderr), w7a.stderr + ' | ' + w7b.stderr);
  const w8a = build(doc({ promises: [PROMISE], notPromises: [NOT_THEIRS] }), { config: { callEndedAt: '' } });
  const w8b = build(doc({ promises: [PROMISE], notPromises: [NOT_THEIRS] }), { by: false });
  const w8c = build(doc({ promises: [PROMISE], notPromises: [NOT_THEIRS] }), { by: false, config: { builtBy: 'auto-guide-debrief-sweep' } });
  check('W8a no call end time is refused', refusedClean(w8a) && /callEndedAt/.test(w8a.stderr), w8a.rc + ' ' + w8a.stderr);
  check('W8b no writer is refused', refusedClean(w8b) && /no writer/.test(w8b.stderr), w8b.rc + ' ' + w8b.stderr);
  check('W8c a job\'s builtBy writes as job:<builtBy>', w8c.rc === 0 && w8c.json.promises.by === 'job:auto-guide-debrief-sweep', w8c.rc + ' ' + w8c.stderr);
  const w9 = build(doc({ promises: [PROMISE, Object.assign({}, PROMISE, { what: ' one-page summary and TERMS ' })], notPromises: [NOT_THEIRS] }));
  check('W9 two items with one `what` are refused', refusedClean(w9) && /repeats promises\[0\]/.test(w9.stderr), w9.rc + ' ' + w9.stderr);
  const w10a = build(doc({ promises: [PROMISE] }), { tx: false, flags: ['--no-transcript', 'notetaker never joined; written from the operator\'s own notes'] });
  const w10b = build(doc({ promises: [Object.assign({}, PROMISE, { sourceKind: 'recap' })] }),
    { tx: false, flags: ['--no-transcript', 'notetaker never joined; written from the operator\'s own notes'] });
  check('W10 --no-transcript refuses a transcript-kind promise and accepts a recap one',
    refusedClean(w10a) && w10b.rc === 0 && w10b.json.promises.calls[0].params[7] === 'recap', w10a.rc + '/' + w10b.rc + ' ' + w10b.stderr);

  /* C — the finish verdict */
  const planPath = w4b.out + '.promises.json';
  const docId = w4b.json.docId;
  const c1 = checkRows(planPath, { rows: [{ promise_id: 'prm_1', source_doc_id: docId, what: 'One-page summary and terms', status: 'open' }] });
  check('C1 every promise has its row: --promises-check exits 0 with the promise ids', c1.rc === 0 && c1.json && c1.json.promiseIds[0] === 'prm_1', c1.rc + ' ' + c1.stderr);
  const c2 = checkRows(planPath, []);
  check('C2 a missing row exits 22 PROMISE ROWS SHORT and names the item', c2.rc === ROWS_SHORT && /PROMISE ROWS SHORT/.test(c2.stderr) &&
    c2.json.missing[0] === 'One-page summary and terms', c2.rc + ' ' + c2.stderr);
  const c3 = checkRows(planPath, [{ promise_id: 'prm_x', source_doc_id: 'cd_other', what: 'One-page summary and terms' }]);
  check('C3 rows for another document exit 22', c3.rc === ROWS_SHORT, c3.rc + ' ' + c3.stderr);
  const zero = build(doc({ promises: [] }), { txPath: w('tx-quiet.txt', 'Pat Doe: Thanks.\nAlex Rivera: Talk soon.\n') });
  const c4 = zero.rc === 0 ? checkRows(zero.out + '.promises.json', []) : { rc: 'build ' + zero.rc, stderr: zero.stderr };
  check('C4 a zero-promise plan with zero rows exits 0', c4.rc === 0, c4.rc + ' ' + c4.stderr);

  /* R — regen re-emits the plan from kept state */
  const B = require(BUILDER);
  const content = doc({ promises: [PROMISE], notPromises: [NOT_THEIRS] });
  const cfg = Object.assign({ docId: 'cd_debrief_regen_p' }, BASE_CONFIG);
  const rendered = {};
  const html = B.buildStandaloneHtml(content, cfg, rendered);
  const kept = B.keptEnvelope(content, rendered.cfg, html, rendered.sections);
  const row = { doc_id: cfg.docId, tenant_id: R.TENANT, event_id: cfg.eventId, kind: 'debrief', call_ref: 'ff_abc123', meeting_date: '20260918',
    person: 'Pat Doe', domain: 'acme.com', channel: 'call', file_title: '20260918_debrief_pat-doe_intro.html', local_path: null,
    built_by: 'call-debrief', event_id_source: 'build', update_count: 0, lead_id: 'lead_abc', no_lead_reason: '',
    hosted_gap: 'no local copy - filing pending (run_old)', state_id: 'cgs_regen_p', kept_version: 1, guide_json: kept };
  const readPlan = w('readplan.json', { docId: cfg.docId, tenant: R.TENANT });
  const rowsFile = w('regen-rows.json', [row]);
  function regen(flags) {
    const dir = path.join(tmp, 'regen' + (++seq)); fs.mkdirSync(dir);
    const r = spawnSync(process.execPath, [BUILDER, '--regen', readPlan, '--rows', rowsFile, '--cloud', '--folder', FOLDER_OK, '--out-dir', dir].concat(flags || []),
      { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
    let j = null; try { j = JSON.parse(r.stdout); } catch (_) { /* */ }
    return { rc: r.status, json: j, stderr: r.stderr, files: fs.readdirSync(dir) };
  }
  const r1 = regen(['--promise-by', 'job:auto-guide-debrief-sweep', '--run-id', 'run_prove_rp']);
  check('R1a --regen re-emits the promise plan from kept state, for the row\'s own doc_id',
    r1.rc === 0 && r1.json.promises.count === 1 && r1.json.promises.calls[0].params[1] === cfg.docId &&
    r1.json.promises.calls[0].params[8] === BASE_CONFIG.callEndedAt, r1.rc + ' ' + r1.stderr);
  const r2 = regen(['--run-id', 'run_prove_rp2']);
  check('R1b --regen of kept promises with no writer is refused (21) and writes nothing', r2.rc === UNRECORDED && r2.files.length === 0, r2.rc + ' ' + r2.stderr);

  /* K — the openable rule is intact */
  const k = build(doc({ promises: [PROMISE], notPromises: [NOT_THEIRS] }), { folder: false });
  check('K  without --folder the same promise build exits 20 NOT OPENABLE and still prints its promise plan',
    k.rc === NOT_OPENABLE && k.json && k.json.openable === false && k.json.promises.count === 1, k.rc + ' ' + k.stderr);

  /* M — mutate the FILE, run the same test, it must go RED */
  function mutant(name, from, to) {
    const src = fs.readFileSync(BUILDER, 'utf8');
    if (src.indexOf(from) < 0) { check('M  mutation site "' + name + '" found', false, from); return null; }
    const dir = path.join(tmp, 'mutant-' + name); fs.mkdirSync(dir);
    ['register-call-doc.js', 'upload-call-doc.js'].forEach(function (f) {
      if (fs.existsSync(path.join(HERE, f))) fs.copyFileSync(path.join(HERE, f), path.join(dir, f));
    });
    fs.writeFileSync(path.join(dir, 'build-call-debrief.js'), src.replace(from, to));
    return path.join(dir, 'build-call-debrief.js');
  }
  const m1 = mutant('scan-finds-nothing', '    if (!SEND_PROMISE_RX.test(normLine(t.text))) return false;\n',
    '    if (true) return false;\n');
  if (m1) {
    const r = build(doc({ promises: [], notPromises: [NOT_THEIRS] }), { builder: m1 });
    check('M1 a builder whose transcript scan finds nothing turns W3 RED (caught: rc=' + r.rc + ')', !refusedClean(r), r.rc);
  }
  const m2 = mutant('missing-key-accepted', '  if (!d || !Array.isArray(d.promises)) {\n',
    '  if (!d.promises) d.promises = [];\n  if (!d || !Array.isArray(d.promises)) {\n');
  if (m2) {
    const r = build(doc({}), { builder: m2, txPath: w('tx-quiet2.txt', 'Pat Doe: Thanks.\n') });
    check('M2 a builder that accepts a missing `promises` key turns W1 RED (caught: rc=' + r.rc + ')', !refusedClean(r), r.rc);
  }
  const m3 = mutant('verdict-ignores-missing-rows', '  if (missing.length) return no(', '  if (false) return no(');
  if (m3) {
    const r = checkRows(planPath, [], m3);
    check('M3 a verdict that ignores missing rows turns C2 RED (caught: rc=' + r.rc + ')', r.rc !== ROWS_SHORT, r.rc);
  }
} catch (e) {
  check('the proof itself ran', false, e.stack);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(fail ? '\nRED — ' + fail + ' of ' + (pass + fail) + ' check(s) failed' : '\nGREEN — all ' + pass + ' promise-writer checks pass');
process.exit(fail ? 1 : 0);
