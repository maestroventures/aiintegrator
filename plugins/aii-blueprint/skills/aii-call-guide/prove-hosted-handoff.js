#!/usr/bin/env node
/* prove-hosted-handoff.js — added 2026-09-17, when a cloud executor could build a call document
   but had no way to file it, so every cloud run registered an empty file id.

   Proves the builder that sits NEXT TO THIS FILE (build-call-guide.js or build-call-debrief.js)
   by RUNNING it, the way a cloud executor does, in a throwaway folder. The same file ships
   byte-identical in both skill folders. It goes RED if any of these regress:

     H1  a DISK build (no flags) registers the absolute output path and carries no hosted
         handoff — and since 0.9.50 it is NOT OPENABLE: exit 20, openable:false, a reason;
     H2  a CLOUD build with a resolved Calls folder prints hosted.status 'ready' whose bytes and
         sha256 are the bytes actually written, whose ticket mint carries that folder id, whose
         upload runs the byte door that ships beside the builder, and which never routes the
         HTML through the storage connector's create call;
     H3  a CLOUD build whose folder resolver returned 0 rows exits 4 with
         folder_address_unresolved and writes NOTHING (no plan, no quarantine file);
     H4  the same when the resolver RAISED ({"error": ...});
     H5  the same when it returned 2 rows (ambiguous — never pick one);
     H6  CLOUD without --folder is not refused and does not exit 4, and still writes the 0.9.36
         cloud keys and files — but since 0.9.50 it exits 20 NOT OPENABLE (it used to exit 0:
         that "success" is what left six call_doc rows reading "filing pending"). The 0.9.36
         byte-for-byte comparison (--baseline) was retired with that change, on purpose;
     H7  --folder on a DISK build (0.9.50) gets the same ready handoff, keeps the absolute local
         path in step 1, and exits 0 — the route every document that became openable on
         2026-09-24 took;
     H8  AII_FILING=cloud (the env form) reaches the same ready handoff;
     H9  --print-folder-sql prints the resolver read with purpose 'calls';
     H10 (guide only) --print-gate-sql --tenant <t> prints the gate SELECT — the command
         SKILL.md names, which the builder used to open as a FILE ('--print-gate-sql');
     O   THE OPENABLE TEST (0.9.50, Call Record fix B4). A cloud build with --folder is walked
         through its own handoff offline: step 2's settle command is RUN as printed, the settled
         bytes are staged through --stage-sql (the no-egress route) and must decode to the exact
         sha256 the ticket is minted with, and the confirmed read-back passes
         `register-call-doc.js --openable` (exit 0). A LOCAL-ONLY build's registered row fails
         it (exit 20), and so does a cloud build with no --folder;
     R   --regen --cloud --folder re-renders from kept state onto THIS disk under the row's own
         file_title, registers the row's own local_path (NULL for a cloud row), carries a ready
         handoff and exits 0; --regen with no --folder exits 20 NOT OPENABLE;
     P   (debrief only, 0.9.50 B9) a build prints its promise plan as stdout `promises`
         (count 0 for this fixture's `promises: []`); the promise gate itself is proven by
         prove-promise-writer.js;
     M   MUTATE-TO-PROVE. A copy of the builder whose NOT-OPENABLE exit is switched off, and a
         copy of the registrar whose verdict ignores the gap, must each turn the local-only
         openable test RED. A test that passes against a mutant proves nothing.

   Writes only inside a temp folder it removes. Exit 0 = all green, 1 = a check went red.
   Usage: node prove-hosted-handoff.js */
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
const REGISTRAR = path.join(HERE, 'register-call-doc.js');
const NOT_OPENABLE = 20;

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
  /* Since 0.9.49 the guide's gate file also carries the newest-email lookup (the open-loop
     gate). This fixture states no open loop and the lookup found no email: the smallest pass. */
  extra = ['--gate', w('gate.json', { rows: [1, 2, 3, 4].map(function (i) { return { template_id: 't' + i, ok: true, detail: 'ok' }; }),
    newestEmail: { addresses: ['pat@acme.com'], checkedAt: '2026-09-17T12:00:00Z', crm: null, mailbox: null } })];
  config.guideId = 'pat-doe-20260918';
} else {
  /* nextCallGoal is not decoration: a debrief that renders NO sections has no section index
     to keep, and since 2026-09-17 keptSectionsGate refuses it before a byte is written (kept
     state will not hold a bodyless document). The old fixture built exactly that page. */
  /* Since 0.9.50 (B9) `promises` is a required key and a build names its transcript: this
     fixture's call held no send-promise, so `[]` is the deliberate zero. prove-promise-writer.js
     proves the promise gate itself. */
  docPath = w('doc.json', { header: { title: 'Debrief — Pat Doe' }, captureQuestions: [], promises: [],
    nextCallGoal: 'Lock the rooftop and the start date.' });
  const txPath = path.join(tmp, 'transcript.txt');
  fs.writeFileSync(txPath, 'Pat Doe: Thanks for the time.\nBryce Ebeling: Glad to. Talk Monday.\n');
  extra = ['--transcript', txPath];
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
  const NOT_OPEN_KEYS = (IS_GUIDE ? '' : ',promises') + ',hostedHalf,openable,notOpenable';   /* 0.9.50: a debrief prints its promise plan */
  check('H1a disk build without --folder exits 20 NOT OPENABLE (0.9.50; it used to exit 0)',
    d.rc === NOT_OPENABLE && /NOT OPENABLE/.test(d.stderr), d.rc + ' ' + d.stderr);
  check('H1b disk stdout keys are the old set plus hostedHalf/openable/notOpenable, openable:false',
    d.json && Object.keys(d.json).join(',') === OLD_KEYS + NOT_OPEN_KEYS && d.json.openable === false &&
    d.json.hostedHalf === 'missing' && /local copy/.test(d.json.notOpenable), d.stdout);
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
  check('H6a cloud without --folder is not refused and does not exit 4 — it exits 20 NOT OPENABLE',
    noFolder.rc === NOT_OPENABLE, noFolder.rc + ' ' + noFolder.stderr);
  check('H6b cloud without --folder prints the 0.9.36 cloud keys + openable:false, and no hosted handoff',
    noFolder.json && Object.keys(noFolder.json).join(',') === CLOUD_KEYS + NOT_OPEN_KEYS && noFolder.json.filing === 'cloud' &&
    noFolder.json.openable === false && !('hosted' in noFolder.json) &&
    Array.isArray(noFolder.json.params) && noFolder.json.params[10] === null, noFolder.stdout);
  check('H6c cloud without --folder prints the 0.9.36 CLOUD MODE steps, not the hosted ones',
    noFolder.stderr.indexOf('CLOUD MODE — registered with NO local path. After --settle:') >= 0 &&
    noFolder.stderr.indexOf('hosted.steps') < 0, noFolder.stderr);
  check('H6d cloud without --folder writes the quarantine file and plan like 0.9.36',
    noFolder.json && fs.existsSync(noFolder.json.quarantinePath) && fs.existsSync(noFolder.json.planPath), noFolder.files.join(','));
  const diskFolder = build(['--folder', FOLDER_OK]);
  const dh = diskFolder.json && diskFolder.json.hosted;
  check('H7 --folder on a DISK build: ready handoff, absolute local path in step 1, exit 0 (0.9.50)',
    diskFolder.rc === 0 && dh && dh.status === 'ready' && dh.steps[0].params[10] === diskFolder.out &&
    diskFolder.json.hostedHalf === 'planned' && diskFolder.json.openable === false, diskFolder.rc + ' ' + diskFolder.stderr);

  /* P (debrief only, 0.9.50 B9) */
  if (!IS_GUIDE) {
    const pp = diskFolder.json && diskFolder.json.promises;
    check('P1 a debrief build prints its promise plan (count 0 for promises: []) and saves it beside the plan',
      pp && pp.count === 0 && Array.isArray(pp.calls) && pp.calls.length === 0 && pp.docId === diskFolder.json.docId &&
      fs.existsSync(diskFolder.out + '.promises.json'), diskFolder.stdout);
  }

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
  /* ── O — THE OPENABLE TEST. ── */
  const oc = build(['--cloud', '--folder', FOLDER_OK, '--run-id', 'run_prove_o'], null, null, 'openable');
  const oh = oc.json && oc.json.hosted;
  let settledOk = false, stagedOk = false, openOk = false;
  if (oc.rc === 0 && oh && oh.status === 'ready') {
    fs.writeFileSync(oc.json.resultPath, JSON.stringify([{ outcome: 'registered', doc_id: oc.json.docId, kept_state_id: 'cgs_prove_1' }]));
    const st = spawnSync(oh.steps[1].run, { shell: true, encoding: 'utf8' });
    settledOk = st.status === 0 && fs.existsSync(oc.json.finalPath) && sha(oc.json.finalPath) === oh.sha256;
    const ticket = 'cdt.' + require(REGISTRAR).TENANT + '.' + 'b'.repeat(48);
    const sp = spawnSync(process.execPath, [REGISTRAR, '--stage-sql', oc.json.finalPath, '--ticket', ticket, '--by', 'run_prove_o'], { encoding: 'utf8' });
    let spj = null; try { spj = JSON.parse(sp.stdout); } catch (_) { /* */ }
    if (sp.status === 0 && spj) {
      const back = require('zlib').gunzipSync(Buffer.from(spj.statements.map(function (x) { return x.params[5]; }).join(''), 'base64'));
      stagedOk = crypto.createHash('sha256').update(back).digest('hex') === oh.sha256 && spj.sha256 === oh.sha256 &&
        spj.statements.every(function (x) { return /call_doc_upload_stage/.test(x.sql) && x.params[1] === ticket; });
    }
    const confirmed = w('readback-open.json', [{ doc_id: oc.json.docId, file_title: path.basename(oc.json.finalPath), local_path: null,
      file_id: '1FiledByTheDoorAbc123', view_url: 'https://drive.google.com/file/d/1FiledByTheDoorAbc123/view', hosted_gap: '' }]);
    openOk = spawnSync(process.execPath, [REGISTRAR, '--openable', confirmed], { encoding: 'utf8' }).status === 0;
  }
  check('O1 step 2 (settle) runs exactly as printed and the settled file IS the minted bytes', settledOk, oc.stderr);
  check('O2 the no-egress staged route rejoins to the minted sha256, on the minted ticket', stagedOk, 'staged route did not round-trip');
  check('O3 the confirmed read-back is OPENABLE (register-call-doc.js --openable exits 0)', openOk, 'not openable');
  check('O4 step 7 carries the --openable judge, and step 4 the staged route', oh && /--openable/.test(oh.steps[6].judge || '') &&
    oh.steps[3].staged && /--stage-sql/.test(oh.steps[3].staged.run), JSON.stringify(oh && oh.steps[3]));
  function localOnlyOpenable(builder, registrar) {
    const b = build([], null, builder);
    const p = b.json && b.json.params;
    if (!p) return { buildRc: b.rc, verdictRc: null, got: b.stderr };
    const row = w('readback-local-' + (++n) + '.json', [{ doc_id: b.json.docId, local_path: p[10], file_id: p[11], view_url: p[12], hosted_gap: p[13] }]);
    const v = spawnSync(process.execPath, [registrar || REGISTRAR, '--openable', row], { encoding: 'utf8' });
    return { buildRc: b.rc, verdictRc: v.status, openable: b.json.openable, got: 'build rc=' + b.rc + ' verdict rc=' + v.status + ' ' + v.stderr };
  }
  const lo = localOnlyOpenable();
  check('O5 a LOCAL-ONLY build FAILS the openable test: the build exits 20 and its registered row is NOT OPENABLE (20)',
    lo.buildRc === NOT_OPENABLE && lo.verdictRc === NOT_OPENABLE && lo.openable === false, lo.got);
  const nfRow = noFolder.json && noFolder.json.params;
  const nfv = nfRow ? spawnSync(process.execPath, [REGISTRAR, '--openable', w('readback-nf.json',
    [{ doc_id: noFolder.json.docId, file_id: nfRow[11], view_url: nfRow[12], hosted_gap: nfRow[13] }])], { encoding: 'utf8' }).status : null;
  check('O6 a cloud build with no --folder ("filing pending") is NOT OPENABLE either', nfv === NOT_OPENABLE, nfv);

  /* ── R — --regen in cloud mode, from kept state. ── */
  const B = require(BUILDER);
  const R = require(REGISTRAR);
  const content = JSON.parse(fs.readFileSync(docPath, 'utf8'));
  const cfg = Object.assign({ docId: 'cd_' + KIND + '_regen' }, config);
  const rendered = {};
  const html = B.buildStandaloneHtml(content, cfg, rendered);
  const kept = IS_GUIDE ? B.keptEnvelope(content, rendered.cfg, html) : B.keptEnvelope(content, rendered.cfg, html, rendered.sections);
  const title = '20260918_' + TAG + '_pat-doe_intro.html';
  const regenRow = { doc_id: cfg.docId, tenant_id: R.TENANT, event_id: config.eventId, kind: KIND, call_ref: IS_GUIDE ? null : 'ff_abc123',
    meeting_date: '20260918', person: 'Pat Doe', domain: 'acme.com', channel: 'call', file_title: title, local_path: null,
    built_by: IS_GUIDE ? 'call-guide' : 'call-debrief', event_id_source: 'build', update_count: 0, lead_id: 'lead_abc', no_lead_reason: '',
    hosted_gap: 'no local copy - filing pending (run_old)', state_id: 'cgs_regen_1', kept_version: 1, guide_json: kept };
  const readPlan = w('readplan.json', { docId: cfg.docId, tenant: R.TENANT });
  const rowsFile = w('rows.json', [regenRow]);
  function regen(flags) {
    const dir = path.join(tmp, 'regen' + (++n)); fs.mkdirSync(dir);
    const r = spawnSync(process.execPath, [BUILDER, '--regen', readPlan, '--rows', rowsFile].concat(extra.length ? extra : [], flags || [], ['--out-dir', dir]),
      { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
    let j = null; try { j = JSON.parse(r.stdout); } catch (_) { /* */ }
    return { rc: r.status, json: j, stderr: r.stderr, dir, files: fs.readdirSync(dir) };
  }
  const rc = regen(['--cloud', '--folder', FOLDER_OK, '--run-id', 'run_prove_r']);
  const rh = rc.json && rc.json.hosted;
  check('R1 --regen --cloud --folder exits 0 with a ready handoff', rc.rc === 0 && rh && rh.status === 'ready', rc.rc + ' ' + rc.stderr);
  check('R2 it rendered onto THIS disk under the row\'s own title, registering local_path NULL',
    rc.json && rc.json.finalPath === path.join(rc.dir, title) && fs.existsSync(rc.json.quarantinePath) &&
    rh && rh.steps[0].params[10] === null && rh.steps[0].params[9] === title, rc.json && rc.json.finalPath);
  check('R3 the handoff hashes the bytes the regeneration wrote', rh && rc.json && rh.sha256 === sha(rc.json.quarantinePath), rh && rh.sha256);
  const rnf = regen(['--cloud']);
  check('R4 --regen --cloud with no --folder exits 20 NOT OPENABLE', rnf.rc === NOT_OPENABLE && rnf.json && rnf.json.openable === false, rnf.rc + ' ' + rnf.stderr);
  const run = regen(['--cloud', '--folder', FOLDER_NONE]);
  check('R5 --regen with an unresolved folder exits 4 and writes nothing', run.rc === 4 && run.files.length === 0, run.rc + ' ' + run.files.join(','));

  /* ── M — mutate-to-prove: the openable test must go RED on each mutant. Mutate the FILE. ── */
  function mutant(name, file, from, to) {
    const src = fs.readFileSync(path.join(HERE, file), 'utf8');
    if (src.indexOf(from) < 0) { check('M  mutation site "' + name + '" found in ' + file, false, from); return null; }
    const dir = path.join(tmp, 'mutant-' + name); fs.mkdirSync(dir);
    [path.basename(BUILDER), 'register-call-doc.js', 'upload-call-doc.js'].forEach(function (f) {
      if (fs.existsSync(path.join(HERE, f))) fs.copyFileSync(path.join(HERE, f), path.join(dir, f));
    });
    fs.writeFileSync(path.join(dir, file), src.replace(from, to));
    return dir;
  }
  function o5(r) { return r.buildRc === NOT_OPENABLE && r.verdictRc === NOT_OPENABLE && r.openable === false; }
  const mb = mutant('builder-reports-local-only-as-success', path.basename(BUILDER),
    'function notOpenable(out, why) {\n', 'function notOpenable(out, why) { return;\n');
  if (mb) {
    const r = localOnlyOpenable(path.join(mb, path.basename(BUILDER)));
    check('M1 a builder that reports a local-only build as success turns O5 RED (caught: build rc=' + r.buildRc + ')', !o5(r), r.got);
  }
  const mr = mutant('verdict-ignores-the-gap', 'register-call-doc.js',
    "  if (gap) return no('hosted_gap is stated: ' + gap.slice(0, 200), r);\n  if (!fileId || !viewUrl) return no(",
    "  if (false) return no('hosted_gap is stated: ' + gap.slice(0, 200), r);\n  if (false) return no(");
  if (mr) {
    const r = localOnlyOpenable(null, path.join(mr, 'register-call-doc.js'));
    check('M2 a verdict that calls a local-only row openable turns O5 RED (caught: verdict rc=' + r.verdictRc + ')', !o5(r), r.got);
  }
} catch (e) {
  check('the proof itself ran', false, e.stack);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(fail ? '\nRED — ' + fail + ' of ' + (pass + fail) + ' check(s) failed' : '\nGREEN — all ' + pass + ' hosted-handoff checks pass');
process.exit(fail ? 1 : 0);
