#!/usr/bin/env node
/* prove-guide-speakable.js — added 2026-09-17 for dr_anywhere_you_can_type_you_can_speak_20260917.
   The operator, verbatim: "anywhere there is an input box, the user can type, or there needs to be a
   microphone that allows the user to speak like I am to you right now. Anywhere in the command
   center, anywhere in a call guide, anywhere in a modal where I can input something, I should be
   able to speak it."

   IT MEASURES THE BUILT PAGE, NOT THE SOURCE. A box the source draws but the page never renders
   is not a box a person can type in, and a box added later to a surface with its own stylesheet
   is exactly how this regressed: the live board's notes carried a mic from the day it shipped
   while the Log Call Notes modal — the box you most want to talk into straight after a call —
   never did. Counting source textareas finds the wrong six.
   Exit 0 = every typed box on the page carries a mic wired to the canonical warmDictate. */
'use strict';
const B = require('./build-call-guide.js');
let fail = 0;
function check(name, ok, got) { console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '\n      got: ' + String(got).slice(0, 300))); if (!ok) fail++; }

const md = ['**TITLE:**', 'Quick-access', '', '**HOW TO USE:**', 'Lead line, then stop.']
  .concat(['asp-bg', 'asp-ai', 'asp-vr', 'asp-diff'].reduce(function (acc, id) {
    return acc.concat(['', '---', '', '## <a id="' + id + '"></a>◆ ' + id, '', '**LEAD:**', 'x']);
  }, [])).join('\n');
const guide = {
  aspectsMarkdown: md,
  header: { title: 'Call Guide — Pat Doe', subtitle: 'x' },
  sections: [{ id: 'open', label: 'Open', title: 'Open', words: ['x'], when: 'now', why: 'y', do: ['a'], dont: ['b'] }],
  objectionHandlers: [{ id: 'obj1', label: 'o', title: 'o', concern: 'c', words: ['x'], when: 'n', why: 'y', do: ['a'], dont: ['b'] }],
  hookSection: { id: 'hook', title: 'hook', words: ['x'], when: 'n', why: 'y', do: ['a'], dont: ['b'] },
  closeSection: { id: 'close', title: 'close', question: 'q?', words: ['x'], when: 'n', why: 'y', do: ['a'], dont: ['b'], branches: [{ if: 'yes', then: 't' }] },
  followups: ['f'], contextBar: [{ label: 'When', value: 'now' }], glance: [{ label: 'x', value: 'y' }], tags: [],
};
const cfg = { guideId: 'p', eventId: 'e', meetingDate: '20260917', prospect: 'Pat Doe', company: 'Acme Co',
  domain: 'acme.com', email: 'pat@acme.com', leadId: 'lead_abc', crmName: 'Close' };

let html = '';
try { html = B.buildStandaloneHtml(guide, cfg); }
catch (e) { html = 'THREW: ' + e.message; }
check('0  a guide builds', html.length > 5000, html.slice(0, 200));

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
check('2  EVERY typed box on the built page carries a mic', silent.length === 0, 'silent boxes: ' + silent.join(', '));
check('3  the Log Call Notes modal boxes carry one', boxes.filter(function (b) { return /^lcn/.test(b.id) && b.mic; }).length === 2,
  boxes.filter(function (b) { return /^lcn/.test(b.id); }).map(function (b) { return b.id + ':' + b.mic; }).join(' '));
check('4  the mic is the canonical warmDictate, not a second one', /function warmDictate\(/.test(html) && (html.match(/function warmDictate\(/g) || []).length === 1,
  (html.match(/function warmDictate\(/g) || []).length + ' definition(s)');
console.log('\n' + boxes.length + ' typed box(es) on the page, ' + (boxes.length - silent.length) + ' with a mic');
console.log(fail ? 'RED — ' + fail + ' check(s) failed' : 'GREEN — anywhere you can type, you can speak');
process.exit(fail ? 1 : 0);
