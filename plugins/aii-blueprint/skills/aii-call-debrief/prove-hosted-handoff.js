#!/usr/bin/env node
/* prove-hosted-handoff.js — added 2026-09-17, when a cloud executor could build a call document
   but had no way to file it, so every cloud run registered an empty file id.

   Proves the builder that sits NEXT TO THIS FILE (build-call-guide.js or build-call-debrief.js)
   by RUNNING it, the way a cloud executor does, in a throwaway folder. The same file ships
   byte-identical in both skill folders. It goes RED if any of these regress:

     H1  a DISK build (no flags) prints exactly the keys it printed before, registers the
         absolute output path, and carries no hosted handoff — the local path is unchanged;
     H2  a CLOUD build with a resolved Calls folder prints hosted.status 'ready' whose bytes and
         sha256 are the bytes actually written, whose ticket mint carries that folder id, whose
         upload runs the byte door that ships beside the builder, and which never routes the
         HTML through the storage connector's create call;
     H3  a CLOUD build whose folder resolver returned 0 rows exits 4 with
         folder_address_unresolved and writes NOTHING (no plan, no quarantine file);
     H4  the same when the resolver RAISED ({"error": ...});
     H5  the same when it returned 2 rows (ambiguous — never pick one);
     H6  CLOUD without --folder is NOT refused and does NOT exit 4 (0.9.37, option (a), agreed
         2026-09-17 with the live auto-guide-debrief-sweep, which calls --cloud --run-id with no
         --folder): it is the 0.9.36 cloud build — no hosted handoff, the 0.9.36 stdout keys and
         CLOUD MODE text, the quarantine file written. With --baseline <dir> (a folder holding
         the 0.9.36 builder + its register-call-doc.js, e.g. extracted from aiintegrator commit
         6a7c065) it also runs that builder on the same input and requires exit code, stdout,
         stderr and every written file to be byte-identical. Without --baseline that comparison
         is reported as NOT RUN, never as green;
     H7  --folder without CLOUD is refused and writes nothing;
     H8  AII_FILING=cloud (the env form) reaches the same ready handoff;
     H9  --print-folder-sql prints the resolver read with purpose 'calls';
     H10 (guide only) --print-gate-sql --tenant <t> prints the gate SELECT — the command
         SKILL.md names, which the builder used to open as a FILE ('--print-gate-sql').

   Writes only inside a temp folder it removes. Exit 0 = all green, 1 = a check went red.
   Usage: node prove-hosted-handoff.js [--baseline <dir-with-0.9.36-builder>] */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const IS_GUIDE = fs.existsSync(path.join(HERE, 'build-call-guide.js'));
const BUILDER = path.join(HERE, IS_GUIDE ? 'build-call-guide.js' : 'build-call-debrief.js');
const KIND = IS_GUIDE ? 'guide' : 'debrief';
const TAG = IS_GUIDE ? 'callguide' : 'debrief';
const FOLDER_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const BI = process.argv.indexOf('--baseline');
const BASELINE_DIR = BI >= 0 ? path.resolve(process.argv[BI + 1] || '') : null;
const BASELINE = BASELINE_DIR ? path.join(BASELINE_DIR, path.basename(BUILDER)) : null;
if (BASELINE && !fs.existsSync(BASELINE)) {
  console.error('prove-hosted-handoff: --baseline has no ' + path.basename(BUILDER) + ' in ' + BASELINE_DIR);
  process.exit(1);
}

let fail = 0, pass = 0;
function check(name, ok, got) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      got: ' + String(got).slice(0, 400)));
  if (ok) pass++; else fail++;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prove-hosted-' + KIND + '-'));
function w(name, obj) { const p = path.join(tmp, name); fs.writeFileSync(p, JSON.stringify(obj)); return p; }

/* ── fixtures: the smallest documents each builder accepts ── */
let docPath, extra = [];
const config = { eventId: '4p9e9u82qq2au5hl31o7tsq21d', meetingDate: '20260918', prospect: 'Pat Doe',
  company: 'Acme Co', domain: 'acme.com', leadId: 'lead_abc', crmName: 'Close' };
if (IS_GUIDE) {
  const md = '**TITLE:**\nQuick access\n\n**HOW TO USE:**\nOpen one.\n\n---\n' +
    ['asp-bg', 'asp-ai', 'asp-vr', 'asp-diff'].map(function (id) {
      return '## <a id="' + id + '"></a>◆ ' + id + '\n\n**LEAD:**\nSay it.\n\n**STOP:**\nStop.\n';
    }).join('\n---\n');
  const card = function (id) { return { id: id, title: id, words: ['Hi — “quoted” ✓'], when: 'w', why: 'y', do: ['d'], dont: ['n'] }; };
  docPath = w('doc.json', { header: { title: 'Call Guide — Pat Doe', subtitle: 's' }, contextBar: [], glance: [], tags: [],
    sections: [card('open')], objectionHandlers: [], hookSection: card('hook'),
    closeSection: Object.assign(card('close'), { question: 'q', branches: [], icp: 'i' }),
    followups: ['f'], aspectsMarkdown: md });
  extra = ['--gate', w('gate.json', [1, 2, 3, 4].map(function (i) { return { template_id: 't' + i, ok: true, detail: 'ok' }; }))];
  config.guideId = 'pat-doe-20260918';
} else {
  /* nextCallGoal is not decoration: a debrief that renders NO sections has no section index
     to keep, and since 2026-09-17 keptSectionsGate refuses it before a byte is written (kept
     state will not hold a bodyless document). The old fixture built exactly that page. */
  docPath = w('doc.json', { header: { title: 'Debrief — Pat Doe' }, captureQuestions: [],
    nextCallGoal: 'Lock the rooftop and the start date.' });
  config.debriefId = 'pat-doe-20260918';
  config.callRef = 'ff_abc123';
}
const configPath = w('config.json', config);
const FOLDER_OK = w('folder-ok.json', [{ drive_folder_id: FOLDER_ID, path_label: '02 — Clients/Acme Co/Calls', verified_at: '2026-09-01T00:00:00Z' }]);
const FOLDER_NONE = w('folder-none.json', []);
const FOLDER_RAISED = w('folder-raised.json', { error: 'resolve_folder_address: NO REGISTERED ADDRESS for tenant=example-tenant channel=example-channel' });
const FOLDER_TWO = w('folder-two.json', [{ drive_folder_id: FOLDER_ID, path_label: 'a' }, { drive_folder_id: FOLDER_ID + 'x', path_label: 'b' }]);

let n = 0;
function build(flags, env, builder, dirName) {
  const dir = path.join(tmp, dirName || ('run' + (++n)));
  fs.mkdirSync(dir);
  const out = path.join(dir, '20260918_' + TAG + '_pat-doe_intro.html');
  const r = spawnSync(process.execPath, [builder || BUILDER, docPath, configPath, out].concat(extra, flags || []),
    { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }, env || {}) });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch (_) { /* not JSON */ }
  return { rc: r.status, json, stdout: r.stdout, stderr: r.stderr, out, dir, files: fs.readdirSync(dir) };
}
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function nothingWritten(b) { return b.files.length === 0; }

try {
  console.log('prove-hosted-handoff — ' + path.basename(BUILDER));

  /* H1 */
  const d = build([]);
  const OLD_KEYS = 'status,planPath,resultPath,quarantinePath,finalPath,docId,sql,params';
  check('H1a disk build exits 0', d.rc === 0, d.stderr);
  check('H1b disk stdout keys are exactly the old set', d.json && Object.keys(d.json).join(',') === OLD_KEYS, d.stdout);
  check('H1c disk plan registers the absolute output path', d.json && d.json.params[10] === d.out, d.json && d.json.params[10]);
  check('H1d disk build carries no hosted handoff', d.json && !('hosted' in d.json), d.stdout);

  /* H2 */
  const c = build(['--cloud', '--folder', FOLDER_OK, '--run-id', 'run_prove_1']);
  const h = c.json && c.json.hosted;
  check('H2a cloud build with a resolved folder exits 0', c.rc === 0, c.stderr);
  check('H2b hosted.status is ready', h && h.status === 'ready', c.stdout);
  const q = c.json && c.json.quarantinePath;
  const written = q && fs.existsSync(q);
  check('H2c hosted.bytes / sha256 are the bytes actually written',
    h && written && h.bytes === fs.statSync(q).size && h.sha256 === sha(q), h && [h.bytes, h.sha256]);
  const steps = (h && h.steps) || [];
  check('H2d seven steps, in order: register, settle, mint, upload, read, confirm, prove',
    steps.map(function (s) { return s.n; }).join(',') === '1,2,3,4,5,6,7', JSON.stringify(steps.map(function (s) { return s.do; })));
  const reg = steps[0] || {}, mint = steps[2] || {}, up = steps[3] || {}, proveStep = steps[6] || {};
  check('H2e step 1 registers with NO local path (cloud)', Array.isArray(reg.params) && reg.params[10] === null, reg.params && reg.params[10]);
  check('H2f the mint carries doc, sha256, bytes, the resolved folder and the run id',
    /call_doc_upload_ticket_mint/.test(mint.sql || '') && Array.isArray(mint.params) &&
    mint.params[1] === c.json.docId && mint.params[2] === h.sha256 && mint.params[3] === h.bytes &&
    mint.params[4] === FOLDER_ID && mint.params[5] === 'run_prove_1', JSON.stringify(mint.params));
  const uploader = path.join(HERE, 'upload-call-doc.js');
  check('H2g the upload runs the byte door beside this builder, on the settled file',
    (up.run || '').indexOf(uploader) >= 0 && (up.run || '').indexOf(c.json.finalPath) >= 0 &&
    /\{\{TICKET\}\}/.test(up.run) && /\{\{DOOR_URL\}\}/.test(up.run), up.run);
  /* H2g-file: upload-call-doc.js is bundled BESIDE the builder only in the PACKED plugin layout. An author's
     source tree may keep it elsewhere (any folder under a personal-skills/ parent), so there the file check is
     NOT RUN with its reason rather than a false red. Anywhere else a missing uploader is a real red. */
  const MASTER_LAYOUT = /[\/\\]personal-skills[\/\\]/.test(HERE);
  if (MASTER_LAYOUT && !fs.existsSync(uploader)) {
    console.log('  - H2g-file NOT RUN — run from a source tree where upload-call-doc.js is not bundled beside the builder (it is in the packed plugin)');
  } else {
    check('H2g-file upload-call-doc.js exists beside this builder', fs.existsSync(uploader), uploader);
  }
  check('H2h the last step reads the row back by doc_id', /FROM call_doc/.test(proveStep.sql || '') &&
    Array.isArray(proveStep.params) && proveStep.params[1] === c.json.docId, JSON.stringify(proveStep));
  check('H2i no step routes the HTML through the storage connector create call',
    !/drive_create|create_file/.test(JSON.stringify(steps)), JSON.stringify(steps).slice(0, 200));

  /* H3–H5 */
  [['H3', FOLDER_NONE, '0 rows'], ['H4', FOLDER_RAISED, 'resolver raised'], ['H5', FOLDER_TWO, 'ambiguous']].forEach(function (t) {
    const u = build(['--cloud', '--folder', t[1]]);
    check(t[0] + 'a unresolved (' + t[2] + ') exits 4', u.rc === 4, u.rc + ' ' + u.stderr);
    check(t[0] + 'b status folder_address_unresolved, registered:false',
      u.json && u.json.status === 'folder_address_unresolved' && u.json.hosted && u.json.hosted.registered === false && !u.json.sql,
      u.stdout);
    check(t[0] + 'c nothing was written (no plan, no quarantine file)', nothingWritten(u), u.files.join(','));
  });

  /* H6, H7 */
  const CLOUD_KEYS = 'status,planPath,resultPath,quarantinePath,finalPath,docId,sql,params,filing,hostedGap,settledPath';
  const noFolder = build(['--cloud', '--run-id', 'run_prove_nf'], null, null, 'nofolder-new');
  check('H6a cloud without --folder is not refused and does not exit 4 (exits 0)',
    noFolder.rc === 0, noFolder.rc + ' ' + noFolder.stderr);
  check('H6b cloud without --folder prints exactly the 0.9.36 cloud keys and no hosted handoff',
    noFolder.json && Object.keys(noFolder.json).join(',') === CLOUD_KEYS && noFolder.json.filing === 'cloud' &&
    Array.isArray(noFolder.json.params) && noFolder.json.params[10] === null, noFolder.stdout);
  check('H6c cloud without --folder prints the 0.9.36 CLOUD MODE steps, not the hosted ones',
    noFolder.stderr.indexOf('CLOUD MODE — registered with NO local path. After --settle:') >= 0 &&
    noFolder.stderr.indexOf('hosted.steps') < 0, noFolder.stderr);
  check('H6d cloud without --folder writes the quarantine file and plan like 0.9.36',
    noFolder.json && fs.existsSync(noFolder.json.quarantinePath) && fs.existsSync(noFolder.json.planPath), noFolder.files.join(','));
  if (BASELINE) {
    /* Same input, same output path: run each builder in its own pass over ONE folder name. */
    const snap = function (b) {
      const files = {};
      b.files.slice().sort().forEach(function (f) { files[f] = sha(path.join(b.dir, f)); });
      return { rc: b.rc, stdout: b.stdout, stderr: b.stderr, files: files };
    };
    const mine = snap(noFolder);
    fs.rmSync(noFolder.dir, { recursive: true, force: true });
    const base = snap(build(['--cloud', '--run-id', 'run_prove_nf'], null, BASELINE, 'nofolder-new'));
    ['rc', 'stdout', 'stderr', 'files'].forEach(function (k) {
      const a = JSON.stringify(mine[k]), b = JSON.stringify(base[k]);
      check('H6e cloud without --folder matches the 0.9.36 builder byte for byte: ' + k, a === b,
        'new=' + a.slice(0, 300) + '\n      0.9.36=' + b.slice(0, 300));
    });
  } else {
    console.log('  - H6e NOT RUN — no --baseline <dir> given, so the byte comparison with the 0.9.36 builder did not happen');
  }
  const diskFolder = build(['--folder', FOLDER_OK]);
  check('H7 --folder without cloud is refused and writes nothing',
    diskFolder.rc !== 0 && /only means something in cloud mode/.test(diskFolder.stderr) && nothingWritten(diskFolder),
    diskFolder.rc + ' ' + diskFolder.stderr);

  /* H8 */
  const envCloud = build(['--folder', FOLDER_OK], { AII_FILING: 'cloud' });
  check('H8 AII_FILING=cloud reaches the same ready handoff',
    envCloud.rc === 0 && envCloud.json && envCloud.json.hosted && envCloud.json.hosted.status === 'ready', envCloud.stderr);

  /* H9 */
  const fsql = spawnSync(process.execPath, [BUILDER, '--print-folder-sql', '--channel', 'ai-integrator', '--company', 'Acme Co'], { encoding: 'utf8' });
  let fj = null; try { fj = JSON.parse(fsql.stdout); } catch (_) { /* */ }
  check('H9 --print-folder-sql prints the resolver read, purpose calls',
    fsql.status === 0 && fj && /resolve_folder_address/.test(fj.sql) &&
    JSON.stringify(fj.params.slice(1)) === JSON.stringify(['ai-integrator', 'Acme Co', 'calls', null]), fsql.stdout + fsql.stderr);

  /* H10 */
  if (IS_GUIDE) {
    const g = spawnSync(process.execPath, [BUILDER, '--print-gate-sql', '--tenant', 'acme'], { encoding: 'utf8' });
    check('H10 --print-gate-sql --tenant prints the gate SELECT (not ENOENT)',
      g.status === 0 && /^SELECT /.test(g.stdout) && g.stdout.indexOf("asset_build_gate('acme'") >= 0, g.status + ' ' + (g.stdout + g.stderr).slice(0, 200));
  }
} catch (e) {
  check('the proof itself ran', false, e.stack);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(fail ? '\nRED — ' + fail + ' of ' + (pass + fail) + ' check(s) failed' : '\nGREEN — all ' + pass + ' hosted-handoff checks pass');
process.exit(fail ? 1 : 0);
