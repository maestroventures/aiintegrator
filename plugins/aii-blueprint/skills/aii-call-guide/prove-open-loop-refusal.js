#!/usr/bin/env node
/* prove-open-loop-refusal.js — added 2026-09-24, with the open-loop gate in build-call-guide.js.
   On 2026-09-24 three guides each stated an "open" item the email had already closed. SKILL.md
   Step 1 item 3b said not to, in prose, and prose does not refuse. This proves the builder does.

   It RUNS the builder next to this file, the way a session does, on open-loop-fixtures.json,
   in a throwaway folder. It goes RED if any of these regress:
     F*  every 'refuse' fixture exits with its own code, prints why, and writes NOTHING
         (no quarantine file, no plan, no HTML);
     B*  every 'build' fixture builds (exit 0) — a guide with no open-loop claims still builds,
         and a claim that cites the newest email builds;
     P   the openLoops marker is carried, never rendered: the page for a guide with cited claims
         is byte-identical to the same guide without them;
     G1  --regen of content proven UNCHANGED still says "re-render only, no content change";
     G2  --regen of EDITED content says CONTENT CHANGED — never "no content change";
     G3  --regen of edited content with an uncited claim is refused (12);
     G4  --regen of edited content with no email lookup is refused (14);
     G5  --regen of edited content whose claim is older than the newest email is refused (13);
     M*  MUTATE-TO-PROVE. The builder is copied, the gate is forced off IN THE COPY'S SOURCE,
         and every refuse fixture is run again: each must now BUILD. And a copy with the old
         change note must turn G2 red. A check that still passes against a mutant proves
         nothing; these are what show the checks above are caught by the gate and not by a
         neighbour.

   Writes only inside a temp folder it removes. Exit 0 = all green, 1 = a check went red.
   Usage: node prove-open-loop-refusal.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const BUILDER = path.join(HERE, 'build-call-guide.js');
const FIX = JSON.parse(fs.readFileSync(path.join(HERE, 'open-loop-fixtures.json'), 'utf8'));

let fail = 0, pass = 0;
function check(name, ok, got) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      got: ' + String(got).slice(0, 500)));
  if (ok) pass++; else fail++;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prove-open-loop-'));
function w(name, obj) { const p = path.join(tmp, name); fs.writeFileSync(p, JSON.stringify(obj)); return p; }

/* ── the smallest guide the builder accepts (same shape prove-hosted-handoff.js uses) ── */
const md = '**TITLE:**\nQuick access\n\n**HOW TO USE:**\nOpen one.\n\n---\n' +
  ['asp-bg', 'asp-ai', 'asp-vr', 'asp-diff'].map(function (id) {
    return '## <a id="' + id + '"></a>◆ ' + id + '\n\n**LEAD:**\nSay it.\n\n**STOP:**\nStop.\n';
  }).join('\n---\n');
const card = function (id) { return { id: id, title: id, words: ['Say it'], when: 'w', why: 'y', do: ['d'], dont: ['n'] }; };
function baseGuide() {
  return { header: { title: 'Call Guide — Pat Doe', subtitle: 's' }, contextBar: [],
    glance: [{ label: 'What you already said', value: 'We sent the NDA.' }], tags: [],
    sections: [card('open')], objectionHandlers: [], hookSection: card('hook'),
    closeSection: Object.assign(card('close'), { question: 'q', branches: [], icp: 'i' }),
    followups: ['f'], aspectsMarkdown: md };
}
/* "sections[0]" / "glance[0]" -> put the openLoops marker on that object */
function withLoops(g, loops) {
  Object.keys(loops || {}).forEach(function (at) {
    const m = /^(\w+)\[(\d+)\]$/.exec(at);
    g[m[1]][Number(m[2])].openLoops = loops[at];
  });
  return g;
}
const ROWS = [1, 2, 3, 4].map(function (i) { return { template_id: 't' + i, ok: true, detail: 'ok' }; });
function gateFor(c) {
  return c.newestEmail === '__ABSENT__' ? ROWS : { rows: ROWS, newestEmail: c.newestEmail };
}
const config = { guideId: 'pat-doe-20260918', eventId: '4p9e9u82qq2au5hl31o7tsq21d', meetingDate: '20260918',
  prospect: 'Pat Doe', company: 'Acme Co', domain: 'acme.com', leadId: 'lead_abc', crmName: 'Close' };
const configPath = w('config.json', config);

let n = 0;
function build(builder, guide, gate) {
  const dir = path.join(tmp, 'run' + (++n));
  fs.mkdirSync(dir);
  const out = path.join(dir, '20260918_callguide_pat-doe_intro.html');
  const r = spawnSync(process.execPath, [builder, w('g' + n + '.json', guide), configPath, out, '--gate', w('gate' + n + '.json', gate)],
    { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
  let json = null; try { json = JSON.parse(r.stdout); } catch (_) { /* refused: no stdout JSON */ }
  return { rc: r.status, stderr: r.stderr, json, files: fs.readdirSync(dir) };
}

/* ── regeneration harness: a kept-state row built by the builder's own envelope ── */
function regenCase(B, edit, gate) {
  const R = require(path.join(path.dirname(B.__file), 'register-call-doc.js'));
  const dir = fs.mkdtempSync(path.join(tmp, 'regen-'));
  const content = baseGuide();
  const cfg = Object.assign({ docId: 'guide_x' }, config);
  const rendered = {};
  const html = B.buildStandaloneHtml(content, cfg, rendered);
  const kept = B.keptEnvelope(content, rendered.cfg, html);
  if (edit) edit(kept);
  const row = { doc_id: 'guide_x', tenant_id: R.TENANT, event_id: config.eventId, kind: 'guide', call_ref: null,
    meeting_date: '20260918', person: 'Pat Doe', domain: 'acme.com', channel: 'call',
    file_title: '20260918_callguide_pat-doe_intro.html',
    local_path: path.join(dir, '20260918_callguide_pat-doe_intro.html'), built_by: 'call-guide',
    event_id_source: 'build', update_count: 0, lead_id: 'lead_abc', no_lead_reason: null,
    state_id: 'cgs_1', kept_version: 1, guide_json: kept };
  try {
    return { out: B.regenerate({ docId: 'guide_x', tenant: R.TENANT }, [row], { gateRaw: gate }), files: fs.readdirSync(dir) };
  } catch (e) { return { err: e, files: fs.readdirSync(dir) }; }
}
function loadBuilder(p) { const B = require(p); B.__file = p; return B; }

/* G2 as a reusable check, so the mutant can be judged by exactly the same sentence */
const FRESH = FIX.build['claim-cites-the-newest-email'];
function g2(B) {
  const r = regenCase(B, function (k) { withLoops(k, FRESH.loops); }, { rows: ROWS, newestEmail: FRESH.newestEmail });
  const note = r.out && r.out.changeNote;
  return { ok: !!note && /CONTENT CHANGED/.test(note) && !/no content change/.test(note) && r.out.contentChange === 'changed',
           got: r.err ? r.err.message : note };
}

try {
  console.log('prove-open-loop-refusal — ' + path.basename(BUILDER));

  /* F — every refuse fixture */
  Object.keys(FIX.refuse).forEach(function (name) {
    const c = FIX.refuse[name];
    const b = build(BUILDER, withLoops(baseGuide(), c.loops), gateFor(c));
    check('F ' + name + ': refused with exit ' + c.expectExit + ', a reason, and nothing written',
      b.rc === c.expectExit && /REFUSED/.test(b.stderr) && b.files.length === 0,
      'rc=' + b.rc + ' files=' + b.files.join(',') + ' ' + b.stderr);
  });

  /* B — every build fixture */
  Object.keys(FIX.build).forEach(function (name) {
    const c = FIX.build[name];
    const b = build(BUILDER, withLoops(baseGuide(), c.loops), gateFor(c));
    check('B ' + name + ': builds (exit 0, quarantine file and plan written)',
      b.rc === 0 && b.json && fs.existsSync(b.json.quarantinePath) && fs.existsSync(b.json.planPath), 'rc=' + b.rc + ' ' + b.stderr);
  });

  /* P — the marker is data for the gate, not page content */
  const B0 = loadBuilder(BUILDER);
  const plain = B0.buildStandaloneHtml(baseGuide(), config);
  const marked = B0.buildStandaloneHtml(withLoops(baseGuide(), FRESH.loops), config);
  check('P  openLoops is carried, never rendered (page byte-identical with and without it)', plain === marked,
    plain.length + ' vs ' + marked.length);

  /* G — regeneration */
  const G1 = regenCase(B0, null, undefined);
  check('G1 unchanged content: note says re-render only, no content change',
    G1.out && G1.out.contentChange === 'unchanged' && /re-render only, no content change/.test(G1.out.changeNote),
    G1.err ? G1.err.message : G1.out && G1.out.changeNote);
  const G2 = g2(B0);
  check('G2 edited content: note says CONTENT CHANGED, never "no content change"', G2.ok, G2.got);
  const unc = FIX.refuse['uncited-claim'];
  const G3 = regenCase(B0, function (k) { withLoops(k, unc.loops); }, { rows: ROWS, newestEmail: unc.newestEmail });
  check('G3 edited content with an uncited claim: refused (12), nothing written',
    G3.err && G3.err.exitCode === 12 && G3.files.length === 0, G3.err ? G3.err.message : 'built');
  const G4 = regenCase(B0, function (k) { withLoops(k, FRESH.loops); }, undefined);
  check('G4 edited content with no email lookup: refused (14), nothing written',
    G4.err && G4.err.exitCode === 14 && G4.files.length === 0, G4.err ? G4.err.message : 'built');
  const st = FIX.refuse['newer-email-than-cited'];
  const G5 = regenCase(B0, function (k) { withLoops(k, st.loops); }, { rows: ROWS, newestEmail: st.newestEmail });
  check('G5 edited content older than the newest email: refused (13), nothing written',
    G5.err && G5.err.exitCode === 13 && G5.files.length === 0, G5.err ? G5.err.message : 'built');

  /* M — mutate-to-prove. Mutate the FILE, never the state: no flag in the shipped builder can
     switch the gate off, so the only way to run without it is a copy whose source says so. */
  const src = fs.readFileSync(BUILDER, 'utf8');
  function mutant(name, from, to) {
    if (src.indexOf(from) < 0) { check('M  mutation site "' + name + '" found in the builder', false, from); return null; }
    const dir = path.join(tmp, 'mutant-' + name);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'build-call-guide.js'), src.replace(from, to));
    fs.copyFileSync(path.join(HERE, 'register-call-doc.js'), path.join(dir, 'register-call-doc.js'));
    return path.join(dir, 'build-call-guide.js');
  }
  const off = mutant('gate-off', 'function openLoopGate(g, opts) {\n',
    'function openLoopGate(g, opts) { return { claims: 0, freshness: "MUTANT: gate forced off" };\n');
  if (off) {
    Object.keys(FIX.refuse).forEach(function (name) {
      const c = FIX.refuse[name];
      const b = build(off, withLoops(baseGuide(), c.loops), gateFor(c));
      check('M  gate forced off -> the "' + name + '" fixture now BUILDS (so F catches the gate, nothing else)',
        b.rc === 0 && b.json && fs.existsSync(b.json.quarantinePath), 'rc=' + b.rc + ' ' + b.stderr);
    });
    const Boff = loadBuilder(off);
    const g3m = regenCase(Boff, function (k) { withLoops(k, unc.loops); }, { rows: ROWS, newestEmail: unc.newestEmail });
    check('M  gate forced off -> G3\'s uncited regeneration now goes through', !!g3m.out, g3m.err && g3m.err.message);
  }
  const oldNote = mutant('old-change-note', "unchanged: 're-render only, no content change (content sha256 matches the recorded render)',\n                  changed:   'CONTENT CHANGED",
    "unchanged: 're-render only, no content change (content sha256 matches the recorded render)',\n                  changed:   're-render only, no content change' || 'CONTENT CHANGED");
  if (oldNote) {
    const m2 = g2(loadBuilder(oldNote));
    check('M  the old "no content change" note on edited content turns G2 RED', !m2.ok, m2.got);
  }
} catch (e) {
  check('the proof itself ran', false, e.stack);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(fail ? '\nRED — ' + fail + ' of ' + (pass + fail) + ' check(s) failed' : '\nGREEN — all ' + pass + ' open-loop checks pass');
process.exit(fail ? 1 : 0);
