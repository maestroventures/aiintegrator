#!/usr/bin/env node
/* prove-call-doc-health.js — added 0.9.53 with call-doc-health.js.
   Ruling dr_every_call_document_carries_a_problem_badge_and_a_report_button_20260925;
   Call-Record-Lifecycle-SPEC-v1.0 section 8.

   ONE FILE, BUNDLED INTO BOTH CALL SKILLS. It proves the module beside it and the builder beside
   it (build-call-guide.js in aii-call-guide, build-call-debrief.js in aii-call-debrief):

     J*  THE JUDGE. Each colour from real-shaped facts, in the plain words the operator reads:
         green "Checked — current as of <date>", amber for each named problem, red when a debrief
         has neither a transcript nor the user's notes. A session's own reason is refused when it
         carries internal words.
     P*  THE PAGE. The badge is the first thing under the title, the button is on EVERY page
         (green too), the facts live in the page config so a kept-state re-render is byte-identical,
         and a page built before badges gets a grey "Not checked" badge that still reports.
     B*  THE BUTTON, run in a sandbox with a fake browser: served (https) POSTs one payload to
         /api/cc/call-doc-report; file:// copies "Report: ..." and says "Copied — paste it into any
         Claude session"; a POST that fails falls back to the copy and says why; the copied JSON
         line IS the POSTed body.
     C*  THE BUILDER, run the way a session runs it (CLI), shows the judged badge in the file.
     M*  MUTATE-TO-PROVE. The module is copied, one rule is broken IN THE COPY'S SOURCE, and the
         check that owns that rule must now FAIL. A check that still passes on its mutant proves
         nothing, and this file says so.
   Exit 0 = GREEN. */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const MOD_PATH = path.join(HERE, 'call-doc-health.js');
const KIND = fs.existsSync(path.join(HERE, 'build-call-guide.js')) ? 'guide' : 'debrief';
const BUILDER = path.join(HERE, KIND === 'guide' ? 'build-call-guide.js' : 'build-call-debrief.js');

let fail = 0, pass = 0;
function check(name, ok, got) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      got: ' + String(got).slice(0, 500)));
  if (ok) pass++; else fail++;
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prove-cdh-'));
function w(name, obj) { const p = path.join(tmp, name); fs.writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj)); return p; }

const NOW = new Date('2026-09-25T18:00:00Z');
const REC_GREEN = { addresses: ['pat@acme.com'], checkedAt: '2026-09-25T17:00:00Z',
  crm: { id: 'acti_1', date: '2026-09-24T21:12:00Z' }, mailbox: { message_id: '<m1@acme.com>', date: '2026-09-24T21:12:30Z', account: 'me@example.com' } };
const REC_CRM_BEHIND = { addresses: ['pat@acme.com'], checkedAt: '2026-09-25T17:00:00Z',
  crm: { id: 'acti_1', date: '2026-09-20T15:00:00Z' }, mailbox: { message_id: '<m2@acme.com>', date: '2026-09-24T21:12:00Z', account: 'me@example.com' } };
const PROMISE = (due) => ({ to: { name: 'Pat Doe', email: 'pat@acme.com' }, what: 'Send the terms', sourceLine: 'I will send the terms',
  sourceKind: 'transcript', spokenDue: due ? 'Friday' : null, spokenDueAt: due ? '2026-09-26T17:00:00-06:00' : null });

/* ── THE UNIT CHECKS, as named functions so a mutant is judged by EXACTLY the same sentence ── */
const UNIT = {
  J1: function (H) {
    const h = H.guideFacts({ emailRecord: REC_GREEN, crmAttached: true, content: {}, now: NOW });
    return { ok: h.tone === 'green' && h.head === 'Checked' && h.line === 'Checked — current as of Sep 24, 3:12 PM MDT' && h.reasons.length === 0,
             got: JSON.stringify(h) };
  },
  J2: function (H) {
    const h = H.guideFacts({ emailRecord: REC_CRM_BEHIND, crmAttached: true, content: {}, now: NOW });
    return { ok: h.tone === 'amber' && h.reasons.length === 1 && h.reasons[0].code === 'crm-missing-email'
               && h.reasons[0].say === 'The CRM is missing your newest email with this person (Sep 24)', got: JSON.stringify(h) };
  },
  J3: function (H) {
    const rec = Object.assign({}, REC_GREEN, { crmMissing: 1 });
    const h = H.guideFacts({ emailRecord: rec, crmAttached: false, content: {}, now: NOW });
    const says = h.reasons.map(function (r) { return r.say; });
    return { ok: h.tone === 'amber' && says.indexOf('The CRM is missing 1 email with this person') >= 0
               && says.indexOf('Not linked to this person in your CRM') >= 0 && h.line === '2 problems found', got: JSON.stringify(says) };
  },
  J4: function (H) {
    const h = H.debriefFacts({ content: { contextBar: [{ label: 'Sources', value: 'Recap email + your notes' }], promises: [PROMISE(true)] },
      tx: { none: 'no recorder joined; built from the recap email Gemini sent' }, crmAttached: true, callEndedAt: '2026-09-24T17:00:00-06:00', now: NOW });
    return { ok: h.tone === 'amber' && h.reasons.length === 1 && h.reasons[0].say === 'Built from a recap email only — no transcript', got: JSON.stringify(h.reasons) };
  },
  J5: function (H) {
    const h = H.debriefFacts({ content: { contextBar: [{ label: 'Sources', value: 'Recap email' }], promises: [] },
      tx: { none: 'no recorder joined; built from the recap email Gemini sent' }, crmAttached: true, now: NOW });
    return { ok: h.tone === 'red' && h.reasons.length === 1 && h.reasons[0].code === 'no-transcript-no-notes'
               && h.reasons[0].say === 'Built from a recap email only — no transcript and no notes from you', got: JSON.stringify(h.reasons) };
  },
  J6: function (H) {
    const h = H.debriefFacts({ content: { contextBar: [{ label: 'Sources', value: 'Transcript' }], promises: [PROMISE(false), PROMISE(true)] },
      tx: { text: 'x' }, crmAttached: true, callEndedAt: '2026-09-24T17:00:00-06:00', now: NOW });
    const says = h.reasons.map(function (r) { return r.say; });
    return { ok: h.tone === 'amber' && says.indexOf('No notes from you on this call') >= 0 && says.indexOf('1 promise has no due date') >= 0
               && says.length === 2, got: JSON.stringify(says) };
  },
  J7: function (H) {
    const h = H.debriefFacts({ content: { contextBar: [{ label: 'Sources', value: 'Transcript + your notes' }], promises: [PROMISE(true)] },
      tx: { text: 'x' }, crmAttached: true, callEndedAt: '2026-09-24T17:00:00-06:00', now: NOW });
    return { ok: h.tone === 'green' && h.line === 'Checked — current as of Sep 24, 5:00 PM MDT', got: JSON.stringify(h) };
  },
  J9: function (H) {
    // Real sources lines from the 2026-09-25 walk (names removed). A denial is never a mention.
    const deb = function (line, ops) { return H.debriefFacts({ content: { contextBar: [{ label: 'Sources', value: line }],
      conflicts: (ops || []).map(function () { return { operatorSaid: 'said on the call' }; }), promises: [] }, crmAttached: true, now: NOW }); };
    const a = deb('RECAP EMAIL ONLY — the host\'s summary (Sep 16) with auto-notes quoted inside it. No recording and no transcript reached you, and there are no call notes from you.', [1, 2]);
    const b = deb('Recap email from the host ONLY — no transcript (no recording; the notes are not shared with you) and no call notes from you.', [1]);
    const c = deb('Fireflies transcript + summary + email thread + CRM · no call notes from you', [1, 2, 3]);
    const d = deb('Transcript only — no notes from you on this call', [1]);
    const ok = a.tone === 'red' && a.reasons[0].code === 'no-transcript-no-notes'
      && b.tone === 'red' && b.reasons[0].code === 'no-transcript-no-notes'
      && c.tone === 'amber' && c.reasons.map(function (r) { return r.code; }).join() === 'no-notes'
      && d.tone === 'amber' && d.reasons.map(function (r) { return r.code; }).join() === 'no-notes';
    return { ok: ok, got: [a, b, c, d].map(function (h) { return h.tone + ':' + h.reasons.map(function (r) { return r.code; }).join('+'); }).join(' | ') };
  },
  J8: function (H) {
    let jargon = null, badTone = null, fine = null;
    try { H.guideFacts({ emailRecord: REC_GREEN, content: { health: { problems: [{ tone: 'amber', say: 'call_doc row has a hosted gap' }] } } }); }
    catch (e) { jargon = e; }
    try { H.guideFacts({ emailRecord: REC_GREEN, content: { health: { problems: [{ tone: 'green', say: 'All good here really' }] } } }); }
    catch (e) { badTone = e; }
    try { fine = H.guideFacts({ emailRecord: REC_GREEN, crmAttached: true, content: { health: { problems: [{ tone: 'red', say: 'The meeting time changed after this was built' }] } } }); }
    catch (e) { fine = e; }
    return { ok: !!jargon && jargon.exitCode === 23 && /internal words/.test(jargon.message) && !!badTone && badTone.exitCode === 23
               && fine && fine.tone === 'red' && fine.reasons[0].say === 'The meeting time changed after this was built',
             got: [jargon && jargon.message, badTone && badTone.message, fine && (fine.message || fine.tone)].join(' | ') };
  },
};

/* ── A FAKE BROWSER for the button: location, fetch, clipboard, the few DOM nodes the runtime touches ── */
function runButton(H, opts) {
  const nodes = {};
  function node(id) { return nodes[id] || (nodes[id] = { id: id, value: '', textContent: '', className: '', focus: function () {} }); }
  node('cdhNote').value = opts.note || '';
  const calls = { fetch: [], clip: [] };
  const sandbox = {
    location: { protocol: opts.protocol },
    document: { getElementById: node, createElement: function () { return { select: function () {} }; },
                body: { appendChild: function () {}, removeChild: function () {} }, execCommand: function () { return false; } },
    navigator: { clipboard: { writeText: function (t) { calls.clip.push(t); return Promise.resolve(); } } },
    fetch: function (url, init) {
      calls.fetch.push({ url: url, init: init });
      if (opts.fetch === 'throw') return Promise.reject(new Error('offline'));
      const status = opts.fetch === 'refused' ? 503 : 200;
      const body = opts.fetch === 'refused' ? { ok: false, say: 'The report store is not installed here yet.' }
        : { ok: true, say: 'Sent. We read it within the hour and fix what we can on our own.' };
      return Promise.resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(body); } });
    },
    Promise: Promise, JSON: JSON, String: String,
  };
  vm.createContext(sandbox);
  const meta = H.reportMeta({ docId: 'cd_guide_4p9e9u82qq2au5hl31o7tsq21d', prospect: 'Pat Doe', meetingDate: '20260924',
    health: H.guideFacts({ emailRecord: REC_CRM_BEHIND, crmAttached: true, content: {}, now: NOW }) }, 'guide');
  vm.runInContext('var CDH=' + JSON.stringify(meta) + ';' + H.BADGE_RUNTIME + ';cdhSend();', sandbox);
  return new Promise(function (resolve) { setTimeout(function () { resolve({ calls: calls, status: node('cdhStatus'), meta: meta }); }, 30); });
}
const BUTTON = {
  B1: async function (H) {
    const r = await runButton(H, { protocol: 'https:', note: 'the time is wrong', fetch: 'ok' });
    const f = r.calls.fetch[0];
    const body = f && JSON.parse(f.init.body);
    return { ok: r.calls.fetch.length === 1 && f.url === '/api/cc/call-doc-report' && f.init.method === 'POST' && f.init.credentials === 'include'
               && body.doc_id === 'cd_guide_4p9e9u82qq2au5hl31o7tsq21d' && body.note === 'the time is wrong' && body.reasons.length === 1
               && body.reasons[0].code === 'crm-missing-email' && r.calls.clip.length === 0 && /^Sent\./.test(r.status.textContent),
             got: JSON.stringify({ fetch: r.calls.fetch, clip: r.calls.clip, status: r.status.textContent }) };
  },
  B2: async function (H) {
    const r = await runButton(H, { protocol: 'file:', note: 'the time is wrong', fetch: 'ok' });
    const t = r.calls.clip[0] || '';
    return { ok: r.calls.fetch.length === 0 && t.indexOf('Report: guide cd_guide_4p9e9u82qq2au5hl31o7tsq21d for Pat Doe 2026-09-24 — The CRM is missing your newest email with this person (Sep 24) — the time is wrong') === 0
               && r.status.textContent === 'Copied — paste it into any Claude session.',
             got: JSON.stringify({ fetch: r.calls.fetch.length, clip: t, status: r.status.textContent }) };
  },
  B3: async function (H) {
    const served = await runButton(H, { protocol: 'https:', note: 'x', fetch: 'ok' });
    const filed = await runButton(H, { protocol: 'file:', note: 'x', fetch: 'ok' });
    const line = (filed.calls.clip[0] || '').split('\n')[1] || '';
    const m = /^\[call-doc-report (.*)\]$/.exec(line);
    return { ok: !!m && m[1] === served.calls.fetch[0].init.body, got: line + ' VS ' + (served.calls.fetch[0] && served.calls.fetch[0].init.body) };
  },
  B4: async function (H) {
    const refused = await runButton(H, { protocol: 'https:', note: '', fetch: 'refused' });
    const offline = await runButton(H, { protocol: 'https:', note: '', fetch: 'throw' });
    return { ok: refused.calls.clip.length === 1 && /Copied — paste it into any Claude session\. \(The report store is not installed here yet\.\)/.test(refused.status.textContent)
               && offline.calls.clip.length === 1 && /could not reach the Command Center/.test(offline.status.textContent)
               && /— no note\n/.test(offline.calls.clip[0]),
             got: refused.status.textContent + ' | ' + offline.status.textContent };
  },
};

async function runAll(H, which) {
  const out = {};
  for (const k of Object.keys(UNIT)) if (!which || which.indexOf(k) >= 0) { try { out[k] = UNIT[k](H); } catch (e) { out[k] = { ok: false, got: 'THREW ' + e.message }; } }
  for (const k of Object.keys(BUTTON)) if (!which || which.indexOf(k) >= 0) { try { out[k] = await BUTTON[k](H); } catch (e) { out[k] = { ok: false, got: 'THREW ' + e.message }; } }
  return out;
}
const LABEL = {
  J1: 'J1 green guide: "Checked — current as of Sep 24, 3:12 PM MDT" (the newest email, on the operator\'s clock)',
  J2: 'J2 amber guide: the mailbox holds a newer email than the CRM -> "The CRM is missing your newest email with this person (Sep 24)"',
  J3: 'J3 amber guide with a counted gap and no CRM link: "The CRM is missing 1 email with this person" + "Not linked to this person in your CRM"',
  J4: 'J4 amber debrief: "Built from a recap email only — no transcript"',
  J5: 'J5 RED debrief: a recap and nothing else -> "Built from a recap email only — no transcript and no notes from you"',
  J6: 'J6 amber debrief: "No notes from you on this call" and "1 promise has no due date"',
  J7: 'J7 green debrief: transcript + notes + every promise dated -> "Checked — current as of Sep 24, 5:00 PM MDT"',
  J9: 'J9 a denial is never a mention: "RECAP EMAIL ONLY — no transcript … no call notes from you" is RED; "transcript · no call notes from you" is amber, even with "You said" conflicts',
  J8: 'J8 a session\'s own reason is plain words or the build is refused (exit 23); a real one shows, red',
  B1: 'B1 served (https): ONE POST to /api/cc/call-doc-report, cookie-signed, carrying doc_id, reasons and the note; nothing copied',
  B2: 'B2 file://: nothing POSTed; the prefilled "Report: guide <doc_id> for <person> <date> — <reasons> — <note>" is copied and it says "Copied — paste it into any Claude session."',
  B3: 'B3 both paths carry the SAME payload: the copied JSON line is byte-identical to the POSTed body',
  B4: 'B4 a refused or unreachable POST falls back to the copy and says why — a report is never silently lost',
};

(async function main() {
  console.log('prove-call-doc-health — call-doc-health.js + ' + path.basename(BUILDER));
  const H = require(MOD_PATH);
  const real = await runAll(H);
  Object.keys(real).forEach(function (k) { check(LABEL[k], real[k].ok, real[k].got); });

  /* ── P: THE PAGE ── */
  const B = require(BUILDER);
  let page = '', cfg = null, content = null;
  if (KIND === 'guide') {
    const md = '**TITLE:**\nQuick access\n\n**HOW TO USE:**\nOpen one.\n\n---\n' + ['asp-bg', 'asp-ai', 'asp-vr', 'asp-diff'].map(function (id) {
      return '## <a id="' + id + '"></a>◆ ' + id + '\n\n**LEAD:**\nSay it.\n\n**STOP:**\nStop.\n'; }).join('\n---\n');
    const card = function (id) { return { id: id, title: id, words: ['Say it'], when: 'w', why: 'y', do: ['d'], dont: ['n'] }; };
    content = { header: { title: 'Call Guide — Pat Doe', subtitle: 's' }, contextBar: [], glance: [], tags: [], sections: [card('open')],
      objectionHandlers: [], hookSection: card('hook'), closeSection: Object.assign(card('close'), { question: 'q', branches: [], icp: 'i' }),
      followups: ['f'], aspectsMarkdown: md };
    cfg = { guideId: 'g', eventId: '4p9e9u82qq2au5hl31o7tsq21d', docId: 'cd_guide_4p9e9u82qq2au5hl31o7tsq21d', meetingDate: '20260924',
      prospect: 'Pat Doe', company: 'Acme Co', domain: 'acme.com', leadId: 'lead_abc', crmName: 'Close',
      health: H.guideFacts({ emailRecord: REC_CRM_BEHIND, crmAttached: true, content: {}, now: NOW }) };
  } else {
    content = JSON.parse(fs.readFileSync(path.join(HERE, 'sample-debrief.json'), 'utf8'));
    cfg = { debriefId: 'd', eventId: '4p9e9u82qq2au5hl31o7tsq21d', docId: 'cd_debrief_4p9e9u82qq2au5hl31o7tsq21d', meetingDate: '20260924',
      prospect: 'Pat Doe', company: 'Riverbend', leadId: 'lead_abc', crmName: 'Close', callEndedAt: '2026-09-24T15:00:00-06:00',
      health: H.debriefFacts({ content: content, tx: { none: 'no recorder joined; built from the recap email Gemini sent' }, crmAttached: true, now: NOW }) };
  }
  const rendered = {};
  page = B.buildStandaloneHtml(content, cfg, rendered);
  const at = page.indexOf('id="cdh"');
  const firstContent = KIND === 'guide' ? page.indexOf('<div class="cgb">') : page.indexOf('<div class="context-bar">');
  check('P1 the badge is the first thing under the title — before any of the ' + KIND + '\'s own content',
    at > 0 && at < firstContent && page.indexOf('<body>') < at, 'badge at ' + at + ', content at ' + firstContent);
  check('P2 the page carries the report button and its CONFIG carries the judged facts',
    /Something wrong\? Report it/.test(page) && rendered.cfg && rendered.cfg.health && rendered.cfg.health.tone === cfg.health.tone,
    rendered.cfg && JSON.stringify(rendered.cfg.health));
  const green = Object.assign({}, cfg, { health: KIND === 'guide'
    ? H.guideFacts({ emailRecord: REC_GREEN, crmAttached: true, content: {}, now: NOW })
    : H.debriefFacts({ content: { contextBar: [{ label: 'Sources', value: 'Transcript + your notes' }], promises: [] }, tx: { text: 'x' }, crmAttached: true, callEndedAt: '2026-09-24T17:00:00-06:00', now: NOW }) });
  const gPage = B.buildStandaloneHtml(content, green);
  check('P3 the button is on a GREEN page too, not only on a red one',
    /class="cdh cdh-green"/.test(gPage) && /Something wrong\? Report it/.test(gPage), (gPage.match(/class="cdh [^"]+"/) || [])[0]);
  const old = Object.assign({}, cfg); delete old.health;
  const oPage = B.buildStandaloneHtml(content, old);
  check('P4 a page built before badges says "Not checked" in grey, and still has the button',
    /class="cdh cdh-grey"/.test(oPage) && />Not checked</.test(oPage) && /Something wrong\? Report it/.test(oPage), (oPage.match(/class="cdh [^"]+"/) || [])[0]);
  if (B.keptEnvelope || KIND === 'guide') {
    const kept = KIND === 'guide' ? B.keptEnvelope(content, rendered.cfg, page) : null;
    if (kept && B.renderFromKeptState) {
      const re = B.renderFromKeptState(kept);
      check('P5 a re-render from kept state is byte-identical, badge included (the facts live in the stored config)',
        re.ok && re.byteIdentical === true && re.html === page, JSON.stringify({ ok: re.ok, refused: re.refused, detail: re.detail }));
    }
  }
  const esc = B.buildStandaloneHtml(content, Object.assign({}, cfg, { prospect: 'Pat </script><script>alert(1)</script>' }));
  const cdhScript = (esc.match(/<script>var CDH=[\s\S]*?<\/script>/) || [''])[0];
  check('P6 a person\'s name cannot break out of the badge\'s own script (the report payload is escaped)',
    cdhScript.length > 0 && cdhScript.indexOf('</script><script>alert(1)') < 0 && /Pat \\u003c\/script>/.test(cdhScript), cdhScript.slice(0, 200));

  /* ── C: THE BUILDER, run as a session runs it ── */
  if (KIND === 'guide') {
    const FOLDER = w('folder.json', [{ drive_folder_id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', path_label: 'Acme Co/Calls' }]);
    const gate = { rows: [1, 2, 3, 4].map(function (i) { return { template_id: 't' + i, ok: true, detail: 'ok' }; }), newestEmail: REC_CRM_BEHIND };
    const dir = path.join(tmp, 'cli'); fs.mkdirSync(dir);
    const out = path.join(dir, '20260924_callguide_pat-doe_intro.html');
    const c2 = Object.assign({}, cfg); delete c2.health; delete c2.docId;
    const r = spawnSync(process.execPath, [BUILDER, w('g.json', content), w('c.json', c2), out, '--gate', w('gate.json', gate), '--folder', FOLDER],
      { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
    let j = null; try { j = JSON.parse(r.stdout); } catch (_) { /* */ }
    const html = j && fs.existsSync(j.quarantinePath) ? fs.readFileSync(j.quarantinePath, 'utf8') : '';
    check('C1 the CLI build judges the email lookup it was handed: the built file shows the amber badge and names the missing email',
      r.status === 0 && /class="cdh cdh-amber"/.test(html) && /The CRM is missing your newest email with this person \(Sep 24\)/.test(html)
        && /"doc_id":"cd_guide_4p9e9u82qq2au5hl31o7tsq21d"/.test(html), 'rc=' + r.status + ' ' + r.stderr.slice(0, 300));
    const bad = JSON.parse(JSON.stringify(content)); bad.health = { problems: [{ tone: 'red', say: 'kept_state is stale' }] };
    const dir2 = path.join(tmp, 'cli2'); fs.mkdirSync(dir2);
    const r2 = spawnSync(process.execPath, [BUILDER, w('g2.json', bad), w('c2.json', c2), path.join(dir2, '20260924_callguide_pat-doe_intro.html'), '--gate', w('gate2.json', gate), '--folder', FOLDER],
      { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
    check('C2 a jargon reason refuses the build (exit 23) and writes nothing', r2.status === 23 && fs.readdirSync(dir2).length === 0,
      'rc=' + r2.status + ' files=' + fs.readdirSync(dir2).join(','));
  } else {
    const FOLDER = w('folder.json', [{ drive_folder_id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', path_label: 'Riverbend/Calls' }]);
    const d = JSON.parse(JSON.stringify(content));
    d.contextBar = [{ label: 'Sources', value: 'Recap email' }];
    d.conflicts = [];
    d.promises.forEach(function (p) { p.sourceKind = 'recap'; });
    const c2 = Object.assign({}, cfg); delete c2.health; delete c2.docId;
    const dir = path.join(tmp, 'cli'); fs.mkdirSync(dir);
    const out = path.join(dir, '20260924_debrief_pat-doe_intro.html');
    const r = spawnSync(process.execPath, [BUILDER, w('d.json', d), w('c.json', c2), out, '--no-transcript', 'no recorder joined; built from the recap email Gemini sent',
      '--promise-by', 'session:prove_cdh', '--folder', FOLDER], { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
    let j = null; try { j = JSON.parse(r.stdout); } catch (_) { /* */ }
    const html = j && fs.existsSync(j.quarantinePath) ? fs.readFileSync(j.quarantinePath, 'utf8') : '';
    check('C1 the CLI build judges what it was handed: a recap and no notes shows RED, and the page knows its own doc_id',
      r.status === 0 && /class="cdh cdh-red"/.test(html) && /Built from a recap email only — no transcript and no notes from you/.test(html)
        && /"doc_id":"cd_debrief_4p9e9u82qq2au5hl31o7tsq21d"/.test(html) && /1 promise has no due date/.test(html), 'rc=' + r.status + ' ' + r.stderr.slice(0, 400));
    const bad = JSON.parse(JSON.stringify(content)); bad.health = { problems: [{ tone: 'red', say: 'hosted_gap is set' }] };
    const dir2 = path.join(tmp, 'cli2'); fs.mkdirSync(dir2);
    const r2 = spawnSync(process.execPath, [BUILDER, w('d2.json', bad), w('c2.json', c2), path.join(dir2, '20260924_debrief_pat-doe_intro.html'),
      '--transcript', w('tx.txt', 'Price is easy and I\'ll put it in writing'), '--promise-by', 'session:prove_cdh', '--folder', FOLDER],
      { encoding: 'utf8', env: Object.assign({}, process.env, { AII_FILING: '' }) });
    check('C2 a jargon reason refuses the build (exit 23) and writes nothing', r2.status === 23 && fs.readdirSync(dir2).length === 0,
      'rc=' + r2.status + ' files=' + fs.readdirSync(dir2).join(',') + ' ' + r2.stderr.slice(0, 200));
  }

  /* ── M: MUTATE-TO-PROVE ── */
  const src = fs.readFileSync(MOD_PATH, 'utf8');
  const MUTANTS = [
    { name: 'the judge never goes above green', owns: ['J2', 'J3', 'J4', 'J5', 'J6'],
      from: 'if (TONE_RANK[r.tone] > TONE_RANK[tone]) tone = r.tone;', to: '/* MUTANT */' },
    { name: 'the CRM-behind rule is gone', owns: ['J2'],
      from: '} else if (boxT && (!crmT || boxT - crmT > 60000)) {', to: '} else if (false) {' },
    { name: 'a recap-only debrief with no notes is only amber', owns: ['J5'],
      from: "reasons.push(reason(CODES.NO_SOURCE, 'red',", to: "reasons.push(reason(CODES.NO_SOURCE, 'amber'," },
    { name: 'promises with no due date are not counted', owns: ['J6'],
      from: "if (noDue) reasons.push(", to: "if (false) reasons.push(" },
    { name: 'a negated notes mention counts as notes', owns: ['J9'],
      from: 'if (denied(line, OPERATOR_NOTES_RX)) return false;', to: '' },
    { name: 'a negated transcript mention counts as a transcript', owns: ['J9'],
      from: "function said(s, rx) { return clausesOf(s).some(function (c) { return rx.test(c) && !NEGATION_RX.test(c); }); }",
      to: "function said(s, rx) { return clausesOf(s).some(function (c) { return rx.test(c); }); }" },
    { name: 'jargon is let through', owns: ['J8'],
      from: 'if (JARGON_RX.test(say)) throw', to: 'if (false) throw' },
    { name: 'a file:// page tries to POST instead of copying', owns: ['B2', 'B3'],
      from: 'if(!cdhServed()){cdhCopy(p,"");return;}', to: '' },
    { name: 'a failed POST is swallowed instead of copied', owns: ['B4'],
      from: '.catch(function(){cdhCopy(p,"could not reach the Command Center");});', to: '.catch(function(){});' },
    { name: 'the served path forgets the note', owns: ['B1'],
      from: 'var p=cdhPayload(note);', to: 'var p=cdhPayload("");' },
  ];
  for (const mu of MUTANTS) {
    if (src.indexOf(mu.from) < 0) { check('M  mutation site "' + mu.name + '" found in the module', false, mu.from); continue; }
    const dir = fs.mkdtempSync(path.join(tmp, 'mutant-'));
    const p = path.join(dir, 'call-doc-health.js');
    fs.writeFileSync(p, src.split(mu.from).join(mu.to));
    const M = require(p);
    const res = await runAll(M, mu.owns);
    const stillPass = mu.owns.filter(function (k) { return res[k] && res[k].ok; });
    check('M  mutant "' + mu.name + '" -> ' + mu.owns.join(', ') + ' now FAIL (so they catch that rule, nothing else)',
      stillPass.length === 0, 'still passing on the mutant: ' + stillPass.join(', '));
  }

  console.log(fail ? 'RED — ' + fail + ' of ' + (pass + fail) + ' check(s) failed' : 'GREEN — all ' + pass + ' call-doc-health checks pass');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* */ }
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e && e.stack || e); process.exit(3); });
