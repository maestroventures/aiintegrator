#!/usr/bin/env node
/* prove-call-guide-links.js — added 2026-09-17.
   Proves the Links drawer and per-card document chips. It goes RED if any of these regress:
     1. a guide authored with NO `links` still gets a non-empty Links row from config
        (CRM record from leadId, company site from domain) — the row sat empty on every
        plugin-built guide because authoring stopped emitting `links`;
     2. a free-mail domain (gmail.com) is never presented as the company website;
     3. every section `docs` entry lands BOTH on its card and in the Links drawer;
     4. a doc with no url renders as a visible "no link" chip, never silently dropped;
     5. the live board carries none of the old empty-state sentence when links exist.
   Writes nothing. Exit 0 = all green, 1 = a check went red. */
'use strict';
const B = require('./build-call-guide.js');
const { buildLinksHtml, cgDocsBar } = B.__links;
let fail = 0;
function check(name, ok, got) { console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      got: ' + String(got).slice(0, 300))); if (!ok) fail++; }

const cfg = { prospect: 'Pat Doe', company: 'Acme Co', domain: 'acme.com', leadId: 'lead_abc', crmName: 'Close' };
const bare = { sections: [{ id: 's1', label: 'Status', words: ['x'] }] };
const h1 = buildLinksHtml(bare, cfg);
/* 1a — operator ruling 2026-09-17: a guide NEVER links a person into a tool. This went red the day it
   was written (the builder had just shipped a CRM chip) and it is the check that keeps it out. */
check('1a no tool/CRM record link anywhere in the Links row', !/close\.com|leadId|lead_abc/.test(h1), h1);
const hMail = buildLinksHtml({ links: { person: { name: 'Pat Doe', email: 'pat@acme.com' } }, sections: bare.sections }, cfg);
check('1c the person is reachable by their own email instead', /href="mailto:pat@acme\.com"/.test(hMail), hMail);
/* 1d — operator ruling 2026-09-17: "We want email addresses. We want domain names. Here are their links so
   that we don't have to go into the command center if we don't have to." The reachable facts are
   ON the guide, so nothing has to be opened to find them. */
const hCfg = buildLinksHtml(bare, Object.assign({}, cfg, { email: 'pat@acme.com' }));
check('1d the email from config reaches the guide with no authored links', /href="mailto:pat@acme\.com"/.test(hCfg) && /acme\.com"/.test(hCfg), hCfg);
check('1b no authored links -> company site from domain', /href="https:\/\/acme\.com"/.test(h1), h1);

const h2 = buildLinksHtml(bare, Object.assign({}, cfg, { domain: 'gmail.com' }));
check('2  free-mail domain is not a company website', !/gmail\.com"/.test(h2), h2);

const g3 = { links: { docs: [{ label: 'Pre read', url: 'https://example.com/pre', note: 'private' }] },
  sections: [{ id: 'map', label: 'Platform map', words: ['x'], docs: [{ label: 'The Map', url: 'https://example.com/map', note: 'SHARE' }] }] };
const drawer = buildLinksHtml(g3, cfg);
check('3a pre-call doc in drawer', drawer.includes('https://example.com/pre'), drawer);
check('3b section doc in drawer under its label', drawer.includes('https://example.com/map') && drawer.includes('Platform map'), drawer);
check('3c section doc on its card', cgDocsBar(g3.sections[0]).includes('https://example.com/map'), cgDocsBar(g3.sections[0]));

const missing = cgDocsBar({ docs: [{ label: 'Groundwork one-pager', url: '' }] });
check('4  doc with no url renders a visible "no link" chip', /lk-missing/.test(missing) && /no link/.test(missing), missing);

let board = '';
try { board = B.buildLiveBoardHtml(Object.assign({ aspects: { items: [] } }, g3), Object.assign({ guideId: 'p', eventId: 'e', meetingDate: '20260917' }, cfg)).html; }
catch (e) { board = 'THREW: ' + e.message; }
check('5a live board renders the card chip', board.includes('cgb-docs') && board.includes('https://example.com/map'), board.slice(0, 200));
check('5b live board Links row is not the empty-state sentence', !board.includes('No links captured on this guide'), board.slice(0, 200));

/* 6 — added 2026-09-17: a Quick-access tab from the words library can carry a **LINK:**,
   and it lands on the tab card AND in the Links drawer, on every guide built from that library. */
const md = [
  '**TITLE:**', 'Quick-access', '', '**HOW TO USE:**', 'Lead line, then stop.', '', '---', '',
  '## <a id="asp-pic"></a>◆ The picture — 45 seconds', '', '**LEAD:**', 'Let me show you one picture.', '',
  '**LINK:**', 'Company AIOS picture | https://example.com/picture | SHARE · click the three tabs', '',
  '**STOP:**', 'Ask which one looks like them.'
].concat(['asp-bg', 'asp-ai', 'asp-vr', 'asp-diff'].reduce(function (acc, id) {
  return acc.concat(['', '---', '', '## <a id="' + id + '"></a>◆ ' + id, '', '**LEAD:**', 'x']);
}, [])).join('\n');
const g6 = { aspectsMarkdown: md, sections: [{ id: 's1', label: 'Status', words: ['x'] }] };
const d6 = buildLinksHtml(g6, cfg);
check('6a aspect LINK lands in the Links drawer', d6.includes('https://example.com/picture') && d6.includes('The picture'), d6);
let b6 = '';
try { b6 = B.buildLiveBoardHtml(g6, Object.assign({ guideId: 'p', eventId: 'e', meetingDate: '20260917' }, cfg)).html; }
catch (e) { b6 = 'THREW: ' + e.message; }
check('6b aspect LINK renders on the tab card', /id="c-ref-asp-pic"[\s\S]*?cgb-docs[\s\S]*?example\.com\/picture/.test(b6), b6.slice(0, 300));

console.log(fail ? '\nRED — ' + fail + ' check(s) failed' : '\nGREEN — all link checks pass');
process.exit(fail ? 1 : 0);
