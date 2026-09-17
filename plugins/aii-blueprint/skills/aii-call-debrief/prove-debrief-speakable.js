#!/usr/bin/env node
/* prove-debrief-speakable.js — added 2026-09-17 for dr_anywhere_you_can_type_you_can_speak_20260917.
   Sibling of the guide's prove-guide-speakable.js and deliberately the same instrument: it builds a
   real debrief and measures THE PAGE A PERSON OPENS, never the source. Counting source boxes is how
   this hid — on the guide, three of the boxes the source draws reach no page at all, and on the
   debrief the six that DO render had no microphone between them.
   Exit 0 = every typed box on the page can be spoken into, through the one carried-across control. */
'use strict';
const fs = require('fs'), path = require('path');
const B = require('./build-call-debrief.js');
let fail = 0;
function check(n, ok, got) { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (ok ? '' : '\n      got: ' + String(got).slice(0, 300))); if (!ok) fail++; }

const here = __dirname;
const d = JSON.parse(fs.readFileSync(path.join(here, 'sample-debrief.json'), 'utf8'));
const c = JSON.parse(fs.readFileSync(path.join(here, 'config.sample.json'), 'utf8'));
let html = '';
try { html = B.buildStandaloneHtml(d, c); } catch (e) { html = 'THREW: ' + e.message; }
check('0  a debrief builds', html.length > 5000, html.slice(0, 200));

const page = html.replace(/<script[\s\S]*?<\/script>/g, '');
const boxes = [];
const re = /<(textarea|input)([^>]*)>/g;
let m;
while ((m = re.exec(page)) !== null) {
  if (/type="(checkbox|radio|hidden|submit|button)"/.test(m[2])) continue;
  const id = (m[2].match(/id="([^"]+)"/) || [, '(no id)'])[1];
  const near = page.slice(Math.max(0, m.index - 300), m.index + 400);
  boxes.push({ id: id, mic: /class="cgb-mic"/.test(near) && /warmDictate\(/.test(near) });
}
check('1  the page has typed boxes to check', boxes.length > 0, boxes.length);
const silent = boxes.filter(function (b) { return !b.mic; }).map(function (b) { return b.id; });
check('2  EVERY typed box on the built page carries a mic', silent.length === 0, 'silent: ' + silent.join(', '));
check('3  the Log Debrief modal box carries one', boxes.some(function (b) { return b.id === 'lcnNotes' && b.mic; }),
  boxes.filter(function (b) { return /^lcn/.test(b.id); }).map(function (b) { return b.id + ':' + b.mic; }).join(' '));
check('4  the control is defined once, and is the carried-across warmDictate',
  (html.match(/function warmDictate\(/g) || []).length === 1 && /function cgMicOff\(/.test(html),
  (html.match(/function warmDictate\(/g) || []).length + ' definition(s)');
console.log('\n' + boxes.length + ' typed box(es) on the page, ' + (boxes.length - silent.length) + ' with a mic');
console.log(fail ? 'RED — ' + fail + ' check(s) failed' : 'GREEN — anywhere you can type, you can speak');
process.exit(fail ? 1 : 0);
