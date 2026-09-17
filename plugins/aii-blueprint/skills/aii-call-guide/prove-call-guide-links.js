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
check('1a no authored links -> CRM record chip from leadId', /app\.close\.com\/lead\/lead_abc\//.test(h1), h1);
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

console.log(fail ? '\nRED — ' + fail + ' check(s) failed' : '\nGREEN — all link checks pass');
process.exit(fail ? 1 : 0);
