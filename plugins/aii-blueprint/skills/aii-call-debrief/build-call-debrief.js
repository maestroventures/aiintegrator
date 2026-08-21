#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build-call-debrief.js  —  the LOCKED shell for the Call Debrief.

   Sibling of build-call-guide.js. The Call Guide is the PRE-call
   vessel; the Call Debrief is the POST-call vessel. Same locked-shell
   philosophy: the brain writes only the content (debrief.json); this
   script turns content -> standalone interactive HTML. The look is
   pulled from the call-guide shell (same STANDALONE_CSS) so the two
   vessels are visually a matched set.

   USAGE:
     node build-call-debrief.js <debrief.json> <config.json> <output.html>

   debrief.json = the debrief CONTENT (schema documented in the skill)
   config.json  = { debriefId, prospect, company, leadId, email,
                    crmName, callRef, apiBase,
                    eventId,        <- REQUIRED 2026-08-05. The calendar event id. Without it the
                                       build is REFUSED and the output file is deleted, because an
                                       unregistered call document cannot exist (L3, call_doc).
                    meetingDate,    <- REQUIRED. YYYYMMDD. Must equal the date slot in the filename.
                    domain,            optional — falls back to the domain half of `email`
                    eventIdSource,     optional — defaults to 'build' (the builder had the id)
                    builtBy }          optional — defaults to 'call-debrief'; the scheduled sweep
                                       passes 'auto-guide-debrief-sweep'
                  callRef was ALREADY required by this skill for the capture panel. It is now
                  load-bearing twice: call_doc refuses a debrief without it, because it is the
                  only id that joins this file to the feedback captured from the same call.
                  ( logWebhookUrl RETIRED 2026-08-05 — the log button now posts to the
                    EXISTING /api/cc/leads note door. There is nothing to configure. )

                  apiBase is OPTIONAL and normally OMITTED (marked 2026-08-11). The capture
                  questions post to the RELATIVE /api/cc/call-feedback, which is correct
                  whenever the Command Center is serving the file — the same thing the log
                  button has always done. Set apiBase only to point a debrief at a DIFFERENT
                  origin than the one serving it. It is not the switch that turns saving on;
                  a boot guard that treated it that way is what left 39 of 46 debriefs with
                  dead questions, and it was removed the same day this note was added.
   output.html  = where to write the finished standalone debrief

   If formatting ever needs to change, change it HERE (one place),
   then regenerate. Do not fork this into the skill body.
   ════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

/* THE ONE WRITER for the call_doc pointer. A built call document that is not registered is
   invisible to the Command Center and looks IDENTICAL to one that was never built, so this
   builder does not get to produce one.

   ⚠ CHANGED 2026-08-06 (T1·S88). This used to be, verbatim:
       const { registerOrUnlink } = require('../../../04 — Daily Operating System/scripts/register-call-doc');
   registerOrUnlink() opened its own Postgres connection through board-conn.js, which reads a
   raw postgres:// URL off local disk. That is why this builder could not ship in the Blueprint
   plugin — it would have put a code path wanting a database password on every client machine.
   The registrar now RETURNS SQL and the session runs it through the connector.

   The guarantee did not weaken, it got STRONGER. The old order wrote the file, then registered,
   then deleted on failure — so a process killed in between left an unregistered document behind
   forever. Now the file is written to a QUARANTINE name and only --settle gives it its real one.
   See register-call-doc.js's own header for the three moves. */

/* ── WHERE THE REGISTRAR LIVES — probed, never hardcoded (2026-08-06, T1·S88) ───────
   This builder now ships INSIDE the Blueprint plugin, so the module sits beside it in
   the packed skill folder. On Bryce's disk it still lives in 04/scripts. Probe both and
   say which one answered — a literal path here is the exact defect that hid a face
   ruling for eight sessions when a tree moved (see CLAUDE.md, onb-site-dir.js).
   The old single hardcoded require is quoted in the retraction block below, not deleted,
   because a session that remembers it would put it back. */
function loadRegistrar() {
  const tries = [
    path.join(__dirname, 'register-call-doc'),                    // packed: skill folder root
    path.join(__dirname, 'scripts', 'register-call-doc'),         // packed: skill folder /scripts
    path.join(__dirname, '..', '..', '..', '04 — Daily Operating System',
              'scripts', 'register-call-doc'),                    // Bryce's workspace
  ];
  const failed = [];
  for (const t of tries) {
    try { return require(t); } catch (e) { failed.push(t + ': ' + e.message.split('\n')[0]); }
  }
  throw new Error(
    'THE REGISTRAR IS MISSING. A call document that cannot be registered must not be built.\n' +
    'Tried:\n  ' + failed.join('\n  ') +
    '\nIf this is a packed skill, register-call-doc.js belongs in the skill\'s own bundle.'
  );
}
/* Resolved LAZILY, inside main(). Not a style choice: build-call-guide.js declares
   its `path` const further down the file, so calling loadRegistrar() at module load
   throws "Cannot access 'path' before initialization". Proven by running it. */

const BUILD_STAMP = '2026-07-27-DEBRIEF-CAPTURE';

/* ── helpers (verbatim from the guide shell) ── */
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function stripFences(s) { return String(s || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); }
function nl(s) { return esc(s).replace(/\\n\\n/g, '<br><br>').replace(/\n\n/g, '<br><br>').replace(/\\n/g, '<br>').replace(/\n/g, '<br>'); }
function richAnswer(s) {
  let h = esc(s).replace(/\\n\\n/g, '<br><br>').replace(/\n\n/g, '<br><br>').replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
  return h.replace(/&lt;strong&gt;/gi, '<strong>').replace(/&lt;\/strong&gt;/gi, '</strong>').replace(/&lt;em&gt;/gi, '<em>').replace(/&lt;\/em&gt;/gi, '</em>');
}
function verdictPill(v) {
  const map = { 'on-track': ['green','On track'], 'partial': ['yellow','Partly on plan'], 'off-plan': ['red','Off plan'] };
  const m = map[(v || '').toLowerCase()] || ['', esc(v || '')];
  return '<span class="pill ' + m[0] + '">' + esc(m[1]) + '</span>';
}

/* -- person/company links (generic, CRM-sourced: contact LinkedIn + company website/domain) -- */
var LINKEDIN_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H20v-5.4c0-1.3 0-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21H12z"/></svg>';
var GLOBE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z"/></svg>';
function normUrl(u){u=String(u==null?'':u).trim();if(!u)return '';if(/^https?:\/\//i.test(u))return u;return 'https://'+u.replace(/^\/+/,'');}
function domainOf(u){return String(u==null?'':u).replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/[\/?#].*$/,'');}
function linkChip(url,svg,label,sub){var href=normUrl(url);if(!href)return '';return '<a class="lk" href="'+esc(href)+'" target="_blank" rel="noopener">'+svg+'<span>'+esc(label)+(sub?' <span class="lk-sub">'+esc(sub)+'</span>':'')+'</span></a>';}
function buildLinksHtml(g){var L=(g&&g.links)||{};var p=L.person||{},c=L.company||{};var chips=[];if(p.linkedin)chips.push(linkChip(p.linkedin,LINKEDIN_SVG,p.name||'LinkedIn',p.title||''));if(c.website)chips.push(linkChip(c.website,GLOBE_SVG,c.name||domainOf(c.website),''));(L.extra||[]).forEach(function(x){if(x&&x.url)chips.push(linkChip(x.url,GLOBE_SVG,x.label||domainOf(x.url),''));});return chips.length?chips.join(''):'';}

/* ── section builders ── */
function section(id, num, title, meta, bodyHtml, opts) {
  opts = opts || {};
  const metaHtml = meta ? '<span class="section-meta">' + esc(meta) + '</span>' : '';
  return '<div class="section' + (opts.open ? ' active open' : '') + '" id="' + esc(id) + '">' +
    '<div class="section-header" onclick="toggleSection(\'' + esc(id) + '\')">' +
    '<div class="step-num">' + esc(num) + '</div><div class="section-title">' + esc(title) + '</div>' +
    metaHtml + '<span class="chevron">▼</span></div>' +
    '<div class="section-body">' + bodyHtml + '</div></div>';
}

function buildBodyHtml(d) {
  const labels = {};
  let html = '';

  /* context bar */
  const contextBar = (d.contextBar || []).map(c =>
    '<div class="ctx-item"><span class="ctx-label">' + esc(c.label) + '</span><span class="ctx-val">' + esc(c.value) + '</span></div>'
  ).join('');

  /* plan vs reality — the at-a-glance card */
  let glance = '';
  if (d.planVsReality) {
    const pr = d.planVsReality;
    glance = '<div class="tim-card"><h3>How it went vs the plan ' + verdictPill(pr.verdict) + '</h3>' +
      '<div class="tim-grid">' +
      '<div class="tim-item"><div class="lbl">What you set out to do</div><div class="val">' + nl(pr.planned) + '</div></div>' +
      '<div class="tim-item"><div class="lbl">What actually happened</div><div class="val">' + nl(pr.happened) + '</div></div>' +
      '</div></div>';
  }

  const linksInner = buildLinksHtml(d);
  if (linksInner) {
    if (glance) { glance = glance.slice(0, glance.lastIndexOf('</div>')) + '<div class="glance-links">' + linksInner + '</div></div>'; }
    else { glance = '<div class="tim-card"><div class="glance-links">' + linksInner + '</div></div>'; }
  }

  let step = 1;

  /* capture questions — ASK BEFORE YOU TELL. Renders above the analysis on
     purpose (see the note on buildCaptureQuestions): reading my read of the
     call first would anchor his answer and quietly poison the signal. */
  const cqHtml = buildCaptureQuestions(d);
  if (cqHtml) {
    labels['capture-q'] = 'Your answers';
    html += cqHtml;
  }

  /* conflicts — the validation gate, fires only on conflict, shown FIRST */
  if (d.conflicts && d.conflicts.length) {
    labels['conflicts'] = 'Resolve these';
    const rows = d.conflicts.map(c =>
      '<div class="conflict-card">' +
      '<div class="conflict-topic">' + esc(c.topic) + '</div>' +
      '<div class="conflict-cols">' +
      '<div class="conflict-side"><div class="conflict-lbl">You said</div><div class="conflict-txt">' + nl(c.operatorSaid) + '</div></div>' +
      '<div class="conflict-side"><div class="conflict-lbl">Transcript said</div><div class="conflict-txt">' + nl(c.transcriptSaid) + '</div></div>' +
      '</div>' +
      '<div class="conflict-resolve"><strong>How to settle it</strong>' + nl(c.resolve) + '</div>' +
      '</div>'
    ).join('');
    const body = '<div class="coach-note warn"><strong>Why this is here</strong>Your notes and the transcript don\'t fully agree. Nothing was silently picked for you — read both, decide, and fix the record before you log it.</div>' +
      rows + captureBlock('conflicts', 'Your call — what\'s the truth here?');
    html += section('conflicts', '⚠', 'Resolve these first — your notes vs. the transcript', String(d.conflicts.length) + ' to settle', body, { open: true });
  }

  /* what went well */
  if (d.wentWell && d.wentWell.length) {
    labels['wentwell'] = 'What went well';
    const items = d.wentWell.map(w =>
      '<div class="dl-item up"><div class="dl-point">' + richAnswer(w.point) + '</div>' +
      (w.why ? '<div class="dl-why">' + nl(w.why) + '</div>' : '') + '</div>'
    ).join('');
    html += section('wentwell', String(step++), 'What went well', null, items + captureBlock('wentwell', 'Anything to add...'), { open: true });
  }

  /* what to improve */
  if (d.toImprove && d.toImprove.length) {
    labels['improve'] = 'What to improve';
    const items = d.toImprove.map(t =>
      '<div class="dl-item down"><div class="dl-point">' + richAnswer(t.point) + '</div>' +
      (t.fix ? '<div class="dl-why">' + nl(t.fix) + '</div>' : '') + '</div>'
    ).join('');
    html += section('improve', String(step++), 'What to do better next time', null, items + captureBlock('improve', 'Anything to add...'));
  }

  /* read on the prospect */
  if (d.prospectRead) {
    labels['read'] = 'Read on them';
    html += section('read', String(step++), 'Where their head is now', null,
      '<div class="say-this read">' + nl(d.prospectRead) + '</div>');
  }

  /* next-call goal */
  if (d.nextCallGoal) {
    labels['goal'] = 'Next-call goal';
    html += section('goal', String(step++), 'The goal for the next conversation', null,
      '<div class="close-big"><div class="close-label">Next-call goal</div><div class="close-q">' + esc(d.nextCallGoal) + '</div></div>');
  }

  /* next steps — three buckets (auto-done / needs you / needs info) */
  if (d.nextSteps) {
    labels['steps'] = 'Next steps';
    const ns = d.nextSteps;
    let body = '';
    if (ns.autoDone && ns.autoDone.length) {
      body += '<div class="bucket"><div class="bucket-h done">✓ Done for you</div>' +
        ns.autoDone.map(s => '<div class="bucket-row"><span class="bk-icon">✓</span><span>' + nl(s) + '</span></div>').join('') + '</div>';
    }
    if (ns.needsYou && ns.needsYou.length) {
      body += '<div class="bucket"><div class="bucket-h you">⚑ Needs you</div>' +
        ns.needsYou.map((s, i) =>
          '<label class="bucket-row check"><input type="checkbox" class="ns" data-ns="you' + i + '">' +
          '<span><strong>' + esc(s.action) + '</strong>' + (s.why ? '<span class="bk-why"> — ' + esc(s.why) + '</span>' : '') + '</span></label>'
        ).join('') + '</div>';
    }
    if (ns.needsInfo && ns.needsInfo.length) {
      body += '<div class="bucket"><div class="bucket-h info">⏳ Waiting on someone</div>' +
        ns.needsInfo.map(s =>
          '<div class="bucket-row"><span class="bk-icon">⏳</span><span><strong>' + esc(s.waitingOn) + '</strong>' + (s.for ? ' — ' + esc(s.for) : '') + '</span></div>'
        ).join('') + '</div>';
    }
    html += section('steps', String(step++), 'Next steps', null, body || '<div class="info-row"><span>No follow-up actions captured.</span></div>', { open: true });
  }

  /* follow-ups — CUT (b), 2026-07-30. An EMAIL follow-up is already a real Gmail draft
     (skill Step 7), so the debrief POINTS AT IT instead of reprinting it — reading the same
     words twice is the thing Bryce cut. Channels with no other home (Text, Call) still carry
     their words here, because Gmail is not their home. Rule: Call-Debrief-SPEC-v1.0 →
     "Content contract". */
  if (d.followups && d.followups.length) {
    const isEmail = f => String(f.channel || '').trim().toLowerCase() === 'email';
    const emails = d.followups.filter(isEmail);
    const others = d.followups.filter(f => !isEmail(f));
    let body = '';

    if (emails.length) {
      body += '<div class="fu-card"><div class="fu-head">' +
        '<span>✉ ' + (emails.length === 1 ? 'Your follow-up email is already drafted in Gmail' : 'Your follow-up emails are already drafted in Gmail') + '</span>' +
        '<a class="btn btn-ghost" href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noopener">Open Gmail drafts ↗</a>' +
        '</div>' +
        emails.map(f =>
          '<div class="bucket-row"><span class="bk-icon">✉</span><span><strong>' + esc(f.to || 'them') + '</strong>' +
          (f.subject ? '<span class="bk-why"> — ' + esc(f.subject) + '</span>' : '') + '</span></div>'
        ).join('') +
        '<div class="info-row"><span>Read and send it there — this page does not repeat it.</span></div>' +
        '</div>';
    }

    if (others.length) {
      body += others.map((f, i) => {
        const head = esc(f.channel || 'Message') + (f.to ? ' → ' + esc(f.to) : '');
        const subj = f.subject ? '<div class="fu-subj">Subject: ' + esc(f.subject) + '</div>' : '';
        return '<div class="fu-card"><div class="fu-head"><span>' + head + '</span>' +
          '<button class="btn btn-ghost btn-copy" onclick="copyBlock(\'fudraft' + i + '\',this)">Copy</button></div>' +
          subj + '<div class="fu-draft" id="fudraft' + i + '">' + richAnswer(f.draft) + '</div></div>';
      }).join('');
    }

    const emailOnly = emails.length && !others.length;
    labels['followups'] = emailOnly ? 'Follow-up (in Gmail)' : 'Follow-ups';
    const title = emailOnly
      ? 'Follow-up email — already drafted in Gmail'
      : (emails.length ? 'Follow-ups — the email is in Gmail, the rest are here' : 'Follow-up drafts — copy, review, then send yourself');
    html += section('followups', '✉', title, 'Never auto-sent', body);
  }

  /* seed the next guide */
  if (d.nextGuideSeed) {
    labels['seed'] = 'Next guide';
    const body = '<div class="say-this">' + nl(d.nextGuideSeed) + '</div>' +
      '<div class="seed-prompt" id="seedprompt">Build a call guide for my next call with ' + esc((d.header && d.header.title || '').replace(/^Call Debrief\s*[—-]\s*/, '')) +
      '. Use this as the goal and context:\n\n' + esc(d.nextGuideSeed) + '</div>' +
      '<button class="btn btn-primary" onclick="copyBlock(\'seedprompt\',this)">Copy prompt to build the next guide ↗</button>' +
      '<div class="info-row" style="margin-top:8px"><span>Paste it into a new Cowork task (Opus / high) to build the next guide.</span></div>';
    html += section('seed', '↗', 'Tee up the next call', null, body);
  }

  return { html, labels, contextBar, glance, crmLog: d.crmLog || '' };
}

function captureBlock(id, placeholder) {
  return '<div class="capture"><div class="capture-label">✍️ Your notes</div>' +
    '<textarea class="note" data-note="' + esc(id) + '" placeholder="' + esc(placeholder || 'Notes...') + '"></textarea></div>';
}

/* ════════════════════════════════════════════════════════════════
   CAPTURE QUESTIONS  (Call-Learning-Loop-SPEC-v0.2 §5)
   The two signals a transcript CANNOT see: what TRIGGERED the habit,
   and how the point was RECEIVED (the ah-ha vs. a polite nod).

   Placement is deliberate: this section renders FIRST, above the
   analysis. If he reads "you over-explained" before answering, his
   answer is anchored to my read of the call instead of his memory of
   it — and an anchored answer is worse than no answer, because it
   looks like data. Ask before you tell.

   Every answer is a TAP on a fixed choice, never a text box, so the
   store never sees free-text drift (Redman). The one exception is
   "Something else…", which reveals a box and then REQUIRES it.
   ════════════════════════════════════════════════════════════════ */

const CQ_CHOICES = {
  trigger: [
    ['asked_a_detail_question', 'He asked a detail question'],
    ['dead_air',               'There was dead air and I filled it'],
    ['sensed_doubt',           "I sensed he wasn't buying it"],
    ['own_enthusiasm',         'I got going on it myself'],
    ['two_units_to_explain',   'I had two companies to explain'],
    ['no_clear_trigger',       'No clear reason'],
    ['other',                  'Something else…']
  ],
  reception: [
    ['ahha',           'It clicked — he leaned in'],
    ['polite_nod',     'Polite nod, then moved on'],
    ['no_reaction',    'Nothing — it landed flat'],
    ['could_not_tell', "Couldn't tell"]
  ]
};

const CQ_ATTRIB = [
  ['operator',    'On me'],
  ['situational', 'The situation'],
  ['unclear',     'Not sure']
];

function cqOptButtons(i, code, options) {
  let rows;
  if (code === 'repertoire') {
    rows = (options || []).map(o => [o.id, o.label]);
    if (!rows.length) return '<div class="info-row"><span>No options seeded yet for this one.</span></div>';
  } else {
    rows = CQ_CHOICES[code] || [];
  }
  return '<div class="cq-opts">' + rows.map(r =>
    '<button type="button" class="cq-opt" data-v="' + esc(r[0]) + '" onclick="cqPick(' + i + ',\'' + esc(r[0]) + '\')">' + esc(r[1]) + '</button>'
  ).join('') + '</div>';
}

function msToClock(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return '';
  const t = Math.floor(n / 1000);
  const m = Math.floor(t / 60), s = t % 60;
  return String(m) + ':' + (s < 10 ? '0' : '') + String(s);
}

/* ════════════════════════════════════════════════════════════════
   THE CRM-RECORD GATE — an empty leadId is REFUSED, a deliberate one is DECLARED.
   Added 2026-08-11, Bryce pop-up-approved, through aii-adjudicate.

   ⚠ THIS IS A DELIBERATE SECOND COPY OF THE GUIDE BUILDER'S GATE, AND THE DUPLICATION
   IS FORCED BY THE PLUGIN FORMAT, NOT CHOSEN. The two builders ship as separate files
   into separate skill folders (`skills/aii-call-guide/` and `skills/aii-call-debrief/`)
   and the format has no shared-module folder — pack.config.json's own `_bundle_rule`
   records the same constraint for register-call-doc.js. Extracting this into a third
   bundled module is the right shape and is boarded, not done here: a new bundled file
   changes what the packer must carry, and that is a bigger change than the defect being
   fixed today. THE RULE UNTIL THEN: if you change one gate, change the other in the same
   batch. The sibling three lines away keeping the old behaviour is precisely how the
   Save button got a real door on the guide in August and stayed a clipboard button on
   the debrief — the code five hundred lines above records that exact event.

   Full reasoning, the measured numbers, and the spec line this reverses: see the same
   block in build-call-guide.js. Not restated here — one fact, one file, and the guide
   builder is where it was written first.
   ════════════════════════════════════════════════════════════════ */
const MIN_NO_LEAD_REASON = 12;

function crmRecordGate(config) {
  const leadId = String(config && config.leadId != null ? config.leadId : '').trim();
  if (leadId) return { attached: true, leadId };

  const reason = String(config && config.noLeadReason != null ? config.noLeadReason : '').trim();
  if (!reason) {
    const e = new Error(
      'BUILD REFUSED — NO CRM RECORD: this debrief has no leadId, so its Log Debrief button ' +
      'could not save anything — it would silently copy to the clipboard instead, and the ' +
      'operator would find that out when they went looking for the note. Attach the CRM ' +
      'record, or — if this call genuinely has no single lead (a cohort, a group session) — ' +
      'say so on purpose by putting a real sentence in config.noLeadReason. An empty box is ' +
      'not a decision.');
    e.exitCode = 6;
    throw e;
  }
  if (reason.length < MIN_NO_LEAD_REASON) {
    const e = new Error(
      'BUILD REFUSED — NO CRM RECORD: config.noLeadReason is "' + reason + '", which is too ' +
      'short to be a decision. Write the actual reason this call has no CRM record — a ' +
      'placeholder puts back the exact thing this gate exists to remove: a deliberate empty ' +
      'and an accidental one that look identical.');
    e.exitCode = 6;
    throw e;
  }
  return { attached: false, leadId: '', noLeadReason: reason };
}

/* ════════════════════════════════════════════════════════════════
   THE DROPPED-QUESTION GATE — a deliberate zero and a silent deletion stop looking alike.
   Added 2026-08-11, Bryce pop-up-approved, through aii-adjudicate.

   THE FILTER BELOW IS CORRECT AND IT WAS ALSO THE DEFECT. It requires `beachhead`,
   which is right — beachhead is a real closed vocabulary with three values, one home
   (`call_beachhead`) and a foreign key behind it, per Call-Learning-Loop-SPEC §8.7a. A
   question with no beachhead cannot be stored and must not render.

   WHAT WAS WRONG WAS THE SILENCE. `if (!qs.length) return ''` deleted every question and
   returned success. The section simply did not exist in the output, and the build said
   "done".

   AND THE WORD `beachhead` APPEARS ZERO TIMES IN THE SKILL BODY THAT WRITES THESE
   QUESTIONS — checked in both the packed copy and the locked-03 master, 2026-08-11.
   Step 4b instructs the author across nine detailed rules (plain language, anchored to
   the transcript, name the habit) and never once names the field that decides whether
   the question survives. So the brain wrote good questions, this filter deleted all of
   them, and nothing anywhere said so.

   WHY IT SURVIVED A MONTH, AND THIS IS THE PART WORTH KEEPING: Step 4b also says
   "zero is a valid answer". It is — a vague question is worse than none. But that made
   an all-filtered result and a deliberate empty array produce BYTE-IDENTICAL output. No
   one could tell them apart from the file: not the operator, not the skill's own
   self-check #6, not a session re-reading its work. Measured on real bytes 2026-08-11:
   3 of 15 debriefs shipped with no question panel at all — Cynthia Davis (2026-08-10),
   Tim Fitzpatrick (2026-08-06) and the LAGE cohort (2026-07-30). Bryce found it by
   opening two debriefs side by side and noticing one had a panel the other didn't.

   THE GATE, IN ONE LINE: zero in, zero out is fine and stays silent. NON-ZERO IN, ZERO
   OUT IS A REFUSAL — it names each dropped question and which field it was missing.
   ════════════════════════════════════════════════════════════════ */
function captureQuestionGate(d) {
  const raw = (d && Array.isArray(d.captureQuestions)) ? d.captureQuestions : [];
  if (!raw.length) return;   // a deliberate zero. Legal, and it stays quiet.

  const dropped = raw.map((q, i) => {
    const missing = [];
    if (!q || !q.text) missing.push('text');
    if (!q || !q.questionCode) missing.push('questionCode');
    if (!q || !q.beachhead) missing.push('beachhead');
    return missing.length ? { n: i + 1, missing, text: (q && q.text) ? String(q.text).slice(0, 70) : '(no text)' } : null;
  }).filter(Boolean);

  if (dropped.length < raw.length) return;   // at least one survived — render what we have.

  const e = new Error(
    'BUILD REFUSED — ALL CAPTURE QUESTIONS DROPPED: you wrote ' + raw.length + ' question' +
    (raw.length === 1 ? '' : 's') + ' and every one of them was missing a required field, so ' +
    'the debrief would have shipped with no question panel at all and said nothing about it.\n' +
    dropped.map(x => '  · Question ' + x.n + ' missing [' + x.missing.join(', ') + '] — "' + x.text + '"').join('\n') +
    '\n\n`beachhead` is the one people miss. It is a closed set of exactly three values, ' +
    'read from the call_beachhead table, never invented:\n' +
    '  · open_two_unit    — the open, with two companies in the room\n' +
    '  · landing_example  — the example that lands the ah-ha\n' +
    '  · general          — not tied to a beachhead (call-level reception/trigger answers)\n\n' +
    'If you meant to ask nothing, pass captureQuestions: [] — an empty array is a legal, ' +
    'deliberate zero and builds silently. What is refused is writing questions and losing ' +
    'them all without being told.');
  e.exitCode = 7;
  throw e;
}

function buildCaptureQuestions(d) {
  const qs = (d.captureQuestions || []).filter(q => q && q.text && q.questionCode && q.beachhead);
  if (!qs.length) return '';

  const cards = qs.map((q, i) => {
    const clock = msToClock(q.anchorMs);
    const anchor = q.transcriptUrl
      ? '<a class="cq-jump" href="' + esc(normUrl(q.transcriptUrl)) + '" target="_blank" rel="noopener">▶ hear this moment' + (clock ? ' at ' + esc(clock) : '') + '</a>'
      : '';
    const quote = q.anchorQuote
      ? '<div class="cq-quote">“' + esc(q.anchorQuote) + '”' + (anchor ? ' ' + anchor : '') + '</div>'
      : (anchor ? '<div class="cq-quote">' + anchor + '</div>' : '');

    return '<div class="cq" id="cq' + i + '" data-idx="' + i + '"' +
      ' data-beachhead="' + esc(q.beachhead) + '"' +
      ' data-code="' + esc(q.questionCode) + '"' +
      ' data-text="' + esc(q.text) + '"' +
      (q.anchorMs != null ? ' data-anchor="' + esc(String(q.anchorMs)) + '"' : '') +
      (q.transcriptUrl ? ' data-url="' + esc(normUrl(q.transcriptUrl)) + '"' : '') +
      (q.askAttribution ? ' data-attrib="1"' : '') + '>' +
      '<div class="cq-n">Question ' + (i + 1) + ' of ' + qs.length + '</div>' +
      '<div class="cq-q">' + esc(q.text) + '</div>' +
      (q.why ? '<div class="cq-why">' + esc(q.why) + '</div>' : '') +
      quote +
      cqOptButtons(i, q.questionCode, q.options) +
      '<div class="cq-other" id="cqother' + i + '">' +
        '<input class="note" id="cqothertxt' + i + '" placeholder="In your own words — what set it off?">' +
        '<button type="button" class="btn btn-primary" onclick="cqSaveOther(' + i + ')">Save that</button>' +
      '</div>' +
      '<div class="cq-attrib" id="cqattrib' + i + '">' +
        '<div class="cq-attrib-q">Was that on you, or just how the call went?</div>' +
        '<div class="cq-opts">' + CQ_ATTRIB.map(a =>
          '<button type="button" class="cq-opt sm" onclick="cqAttrib(' + i + ',\'' + esc(a[0]) + '\')">' + esc(a[1]) + '</button>'
        ).join('') + '</div>' +
      '</div>' +
      '<div class="cq-status" id="cqstatus' + i + '"></div>' +
      '</div>';
  }).join('');

  const gate = '<div class="cq-gate" id="cqGate"></div>';

  const body = '<div class="coach-note"><strong>Answer these before you read the rest</strong>' +
    'Two things the recording can\'t tell me: what set you off, and whether your point actually landed. ' +
    'Answer from memory first — if you read my write-up below before answering, you\'ll answer my version of the call instead of yours. One tap each.</div>' +
    gate + cards;

  return section('capture-q', '✍', 'First — two things the recording can\'t tell me',
    String(qs.length) + (qs.length === 1 ? ' question' : ' questions'), body, { open: true });
}

/* ── CSS: the guide shell, verbatim, + debrief extras ── */
const STANDALONE_CSS = "*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F5F5FA;color:#33334d;min-height:100vh;padding-bottom:96px}.header{background:#0D0D24;border-bottom:2px solid #4f46e5;padding:18px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}.header-left h1{font-size:1.1rem;font-weight:700;color:#fff}.header-left p{font-size:.78rem;color:#a5a5c0;margin-top:2px}.header-right{display:flex;gap:8px;align-items:center}.status-dot{width:8px;height:8px;border-radius:50%;background:#00d4aa;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.call-live{font-size:.72rem;color:#00d4aa;font-weight:600;letter-spacing:.05em}.context-bar{background:#fff;border-bottom:1px solid #e5e5ef;padding:10px 28px;display:flex;gap:20px;flex-wrap:wrap}.ctx-item{display:flex;gap:6px;align-items:center;font-size:.75rem;color:#6b6b85}.ctx-label{color:#9a9ab0}.ctx-val{color:#33334d;font-weight:500}.sections{padding:16px 24px;max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:8px}.section{background:#fff;border:1px solid #e5e5ef;border-radius:10px;overflow:hidden;transition:all .2s}.section.active{border-color:#4f46e5;box-shadow:0 0 0 1px #4f46e540}.section.done{opacity:.55}.section-header{padding:14px 18px;cursor:pointer;display:flex;align-items:center;gap:12px;user-select:none}.section-header:hover{background:#f5f5fa}.step-num{width:26px;height:26px;border-radius:50%;background:#eef0f7;border:1.5px solid #d5d5e5;font-size:.72rem;font-weight:700;color:#6b6b85;display:flex;align-items:center;justify-content:center;flex-shrink:0}.section.active .step-num{background:#4f46e5;border-color:#4f46e5;color:#fff}.section.done .step-num{background:#d1fae5;border-color:#10b981;color:#047857}.section-title{flex:1;font-size:.88rem;font-weight:600;color:#33334d}.section.active .section-title{color:#0d0d24}.section-meta{font-size:.7rem;color:#9a9ab0;white-space:nowrap}.chevron{color:#b5b5c8;font-size:.7rem;transition:transform .2s}.section.open .chevron{transform:rotate(180deg)}.section-body{display:none;padding:0 18px 18px;border-top:1px solid #eef0f7}.section.open .section-body{display:block}.coach-note{background:#ecfdf5;border-left:3px solid #10b981;border-radius:6px;padding:10px 14px;margin:12px 0;font-size:.78rem;color:#065f46;line-height:1.55}.coach-note strong{color:#059669;display:block;margin-bottom:3px;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase}.coach-note.warn{background:#fffbeb;border-left-color:#f59e0b;color:#92400e}.coach-note.warn strong{color:#b45309}.say-this{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:.84rem;line-height:1.65;color:#312e81}.say-this.read{color:#33334d;border-color:#e5e5ef}.branch{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.pill{display:inline-block;background:#e0e7ff;color:#4338ca;font-size:.68rem;font-weight:600;padding:2px 8px;border-radius:99px;margin:2px}.pill.red{background:#fee2e2;color:#b91c1c}.pill.green{background:#d1fae5;color:#047857}.pill.yellow{background:#fef3c7;color:#b45309}.info-row{display:flex;gap:6px;align-items:flex-start;margin:6px 0;font-size:.8rem;color:#6b6b85}.info-row .icon{color:#b5b5c8;flex-shrink:0}.section-controls{display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #eef0f7}.btn{padding:6px 14px;border-radius:6px;font-size:.75rem;font-weight:600;border:none;cursor:pointer;transition:all .15s}.btn-primary{background:#4f46e5;color:#fff}.btn-primary:hover{background:#4338ca}.btn-done{background:#059669;color:#fff}.btn-done:hover{background:#047857}.btn-ghost{background:transparent;color:#6b6b85;border:1px solid #d5d5e5}.btn-ghost:hover{color:#33334d;border-color:#a5a5b8}.progress-bar{height:3px;background:#e5e5ef;position:fixed;top:0;left:0;right:0;z-index:200}.progress-fill{height:100%;background:#4f46e5;transition:width .3s}.tim-card{background:#fff;border:1px solid #e5e5ef;border-radius:10px;padding:16px 18px;max-width:820px;margin:0 auto 8px}.tim-card h3{font-size:.8rem;color:#6b6b85;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;display:flex;align-items:center;gap:8px}.tim-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tim-item{font-size:.78rem}.tim-item .lbl{color:#9a9ab0;margin-bottom:2px}.tim-item .val{color:#33334d;line-height:1.5}hr.divider{border:none;border-top:1px solid #eef0f7;margin:10px 0}.glance-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #eef0f7}.lk{display:inline-flex;align-items:center;gap:6px;background:#f5f5fa;border:1px solid #e5e5ef;border-radius:8px;padding:6px 11px;font-size:.78rem;font-weight:600;color:#4338ca;text-decoration:none;transition:all .15s}.lk:hover{background:#eef2ff;border-color:#c7d2fe}.lk svg{width:14px;height:14px;flex-shrink:0}.lk .lk-sub{color:#9a9ab0;font-weight:400}.close-big{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:12px 0}.close-big .close-label{font-size:.7rem;color:#059669;text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:8px}.close-big .close-q{font-size:.95rem;color:#065f46;line-height:1.55;font-weight:500}.capture{margin:12px 0 4px}.capture-label{font-size:.66rem;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;display:flex;align-items:center;gap:5px}textarea.note,input.note{width:100%;background:#fff;border:1px solid #e5e5ef;border-radius:7px;padding:9px 12px;font-family:inherit;font-size:.82rem;color:#0d0d24;outline:none;resize:vertical;line-height:1.5;transition:border-color .15s}textarea.note{min-height:54px}textarea.note:focus,input.note:focus{border-color:#f59e0b}textarea.note::placeholder,input.note::placeholder{color:#9a9ab0}@media(max-width:600px){.tim-grid{grid-template-columns:1fr}.branch{flex-direction:column}.conflict-cols{grid-template-columns:1fr!important}}.log-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e5e5ef;padding:12px 24px;display:flex;align-items:center;gap:16px;z-index:300;box-shadow:0 -8px 24px rgba(13,13,36,.08)}.log-bar .log-info{flex:1;font-size:.74rem;color:#6b6b85}.log-bar .log-info b{color:#33334d}.btn-log{background:#4f46e5;color:#fff;padding:11px 22px;border-radius:9px;font-size:.85rem;font-weight:700;border:none;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;line-height:1.25}.btn-log:hover{background:#4338ca}.btn-log small{font-size:.62rem;font-weight:500;opacity:.85}.btn-log.ok{background:#059669}.log-status{font-size:.72rem;color:#059669}.log-status.warn{color:#dc2626}.ov{position:fixed;inset:0;background:rgba(13,13,36,.5);z-index:500;display:none;align-items:center;justify-content:center;padding:24px}.ov.show{display:flex}.ov-card{background:#fff;border:1px solid #e5e5ef;border-radius:14px;max-width:440px;width:100%;padding:22px 24px;box-shadow:0 20px 60px rgba(13,13,36,.25)}.ov-card h2{font-size:1rem;color:#0d0d24;margin-bottom:8px}.ov-card p{font-size:.82rem;color:#6b6b85;line-height:1.55;margin-bottom:8px}.lcn-l{display:block;font-size:.7rem;font-weight:700;color:#33334d;margin:11px 0 4px;text-transform:uppercase;letter-spacing:.04em}.lcn-opt{font-weight:400;text-transform:none;color:#9a9ab0}.lcn-sub{font-size:.8rem;color:#6b6b85;margin:2px 0 4px}.lcn-ta{width:100%;box-sizing:border-box;background:#fff;border:1px solid #d5d5e5;border-radius:8px;color:#0d0d24;padding:9px;font:inherit;font-size:.85rem;line-height:1.4;resize:vertical;min-height:150px}.lcn-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:15px}.lcn-status{margin-top:10px;font-size:.78rem;min-height:1em}.lcn-status.ok{color:#059669}.lcn-status.warn{color:#d97706}.foot-stamp{text-align:center;font-size:.62rem;color:#b5b5c8;padding:14px 0 80px;letter-spacing:.04em}.conflict-card{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin:12px 0}.conflict-topic{font-size:.82rem;font-weight:700;color:#92400e;margin-bottom:10px}.conflict-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.conflict-side{background:#fff;border:1px solid #e5e5ef;border-radius:7px;padding:9px 11px}.conflict-lbl{font-size:.66rem;text-transform:uppercase;letter-spacing:.04em;color:#6b6b85;margin-bottom:4px}.conflict-txt{font-size:.8rem;color:#0d0d24;line-height:1.5}.conflict-resolve{font-size:.8rem;color:#92400e;line-height:1.55}.conflict-resolve strong{display:block;font-size:.66rem;text-transform:uppercase;letter-spacing:.04em;color:#b45309;margin-bottom:3px}.dl-item{border-left:3px solid #10b981;background:#ecfdf5;border-radius:6px;padding:10px 14px;margin:10px 0}.dl-item.down{border-left-color:#f59e0b;background:#fffbeb}.dl-point{font-size:.84rem;color:#0d0d24;line-height:1.55;font-weight:500}.dl-item.down .dl-point{color:#92400e}.dl-why{font-size:.78rem;color:#6b6b85;line-height:1.55;margin-top:5px}.bucket{margin:12px 0}.bucket-h{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}.bucket-h.done{color:#059669}.bucket-h.you{color:#d97706}.bucket-h.info{color:#0ea5e9}.bucket-row{display:flex;gap:9px;align-items:flex-start;font-size:.82rem;color:#33334d;line-height:1.5;padding:6px 0}.bucket-row.check{cursor:pointer}.bucket-row input{margin-top:2px;accent-color:#4f46e5;width:15px;height:15px;flex-shrink:0}.bk-icon{flex-shrink:0}.bk-why{color:#6b6b85}.fu-card{background:#fff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 14px;margin:12px 0}.fu-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:.78rem;font-weight:600;color:#4338ca}.btn-copy{padding:4px 12px;font-size:.7rem}.fu-subj{font-size:.78rem;color:#6b6b85;margin-bottom:6px}.fu-draft{font-size:.83rem;color:#1e1b4b;line-height:1.6;white-space:pre-wrap}.seed-prompt{background:#f5f5fa;border:1px solid #e5e5ef;border-radius:8px;padding:11px 13px;margin:10px 0;font-size:.8rem;color:#33334d;line-height:1.5;white-space:pre-wrap}.btn-g{background:transparent;color:#6b6b85;border:1px solid #d5d5e5}.btn-g:hover{color:#33334d;border-color:#a5a5b8}"
/* capture questions (§5) — same palette, no new colours invented */
+ ".cq{border:1px solid #e5e5ef;border-radius:9px;padding:14px 16px;margin:12px 0;background:#fff;display:none}.cq.show{display:block}.cq.answered{display:block;background:#f7fdfa;border-color:#a7f3d0}.cq-n{font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9a9ab0;margin-bottom:6px}.cq-q{font-size:.95rem;font-weight:600;color:#0d0d24;line-height:1.5}.cq-why{font-size:.78rem;color:#6b6b85;line-height:1.5;margin-top:4px}.cq-quote{font-size:.79rem;color:#6b6b85;font-style:italic;line-height:1.5;margin-top:8px;padding-left:10px;border-left:2px solid #e5e5ef}.cq-jump{font-style:normal;font-weight:600;color:#4338ca;text-decoration:none;white-space:nowrap}.cq-jump:hover{text-decoration:underline}.cq-opts{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.cq-opt{background:#f5f5fa;border:1.5px solid #d5d5e5;border-radius:8px;padding:9px 14px;font:inherit;font-size:.82rem;font-weight:600;color:#33334d;cursor:pointer;transition:all .12s;text-align:left}.cq-opt:hover{border-color:#4f46e5;background:#eef2ff;color:#312e81}.cq-opt.sm{font-size:.76rem;padding:7px 12px}.cq-opt.chosen{background:#4f46e5;border-color:#4f46e5;color:#fff}.cq-opt.dim{opacity:.4}.cq-other,.cq-attrib{display:none;margin-top:11px}.cq-other.show,.cq-attrib.show{display:block}.cq-other input{margin-bottom:8px}.cq-attrib-q{font-size:.8rem;font-weight:600;color:#33334d}.cq-status{font-size:.78rem;margin-top:9px;min-height:1em}.cq-status.ok{color:#059669;font-weight:600}.cq-status.warn{color:#b45309}.cq-status.bad{color:#dc2626}.cq-gate{font-size:.8rem;line-height:1.55;margin:10px 0 0}.cq-gate.warn{background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:10px 13px;color:#92400e}.cq-done{background:#ecfdf5;border-left:3px solid #10b981;border-radius:6px;padding:10px 13px;color:#065f46;font-size:.8rem;font-weight:600;margin-top:10px}";

/* ── runtime ── */
const STANDALONE_RUNTIME =
"var STORE_KEY='debrief_notes_'+CONFIG.debriefId;" +
"document.getElementById('crm-name-label').textContent=CONFIG.crmName||'your CRM';" +
"document.getElementById('log-sub').textContent='saves to '+(CONFIG.crmName||'your CRM');" +
"function toggleSection(id){document.getElementById(id).classList.toggle('open');}" +
"function expandAll(){document.querySelectorAll('.section').forEach(function(s){s.classList.add('open');});}" +
"function collapseAll(){document.querySelectorAll('.section').forEach(function(s){s.classList.remove('open');});}" +
"function copyToClipboard(text){return navigator.clipboard.writeText(text).then(function(){return true;}).catch(function(){try{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}});}" +
"function copyBlock(id,btn){var el=document.getElementById(id);if(!el)return;copyToClipboard(el.innerText||el.textContent).then(function(ok){if(btn){var t=btn.textContent;btn.textContent=ok?'Copied ✓':'Copy failed';setTimeout(function(){btn.textContent=t;},1800);}});}" +
"function collectRaw(){var o={};document.querySelectorAll('[data-note]').forEach(function(n){o['n_'+n.getAttribute('data-note')]=n.value;});document.querySelectorAll('.ns').forEach(function(c){o['ns_'+c.getAttribute('data-ns')]=c.checked;});return o;}" +
"function saveNotes(){try{localStorage.setItem(STORE_KEY,JSON.stringify(collectRaw()));}catch(e){}}" +
"function restoreNotes(){var s;try{s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');}catch(e){s=null;}if(!s)return;document.querySelectorAll('[data-note]').forEach(function(n){var k='n_'+n.getAttribute('data-note');if(s[k]!=null)n.value=s[k];});document.querySelectorAll('.ns').forEach(function(c){var k='ns_'+c.getAttribute('data-ns');if(s[k]!=null)c.checked=s[k];});}" +
"document.addEventListener('input',function(e){if(e.target.matches('[data-note], .ns'))saveNotes();});" +
"document.addEventListener('change',function(e){if(e.target.matches('.ns'))saveNotes();});" +
"function buildLogText(){var L=[];L.push('CALL DEBRIEF \\u2014 '+CONFIG.prospect+' ('+CONFIG.company+')');L.push('Logged: '+new Date().toLocaleString());L.push('');if(CRM_LOG)L.push(CRM_LOG);var extra=[];document.querySelectorAll('[data-note]').forEach(function(n){if(n.value&&n.value.trim())extra.push('- '+(SECTION_LABELS[n.getAttribute('data-note')]||n.getAttribute('data-note'))+': '+n.value.trim());});if(extra.length){L.push('');L.push('Your added notes:');L.push(extra.join('\\n'));}return L.join('\\n');}" +
"function lcnOpen(){document.getElementById('lcnWho').textContent='Debrief \\u2014 '+CONFIG.prospect+' \\u00b7 '+CONFIG.company;document.getElementById('lcnNotes').value=buildLogText();var s=document.getElementById('lcnStatus');s.textContent='';s.className='lcn-status';document.getElementById('lcnOv').classList.add('show');setTimeout(function(){document.getElementById('lcnNotes').focus();},60);}" +
"function lcnClose(){document.getElementById('lcnOv').classList.remove('show');}" +
"function lcnCopyFallback(txt,st,why){copyToClipboard(txt).then(function(ok){if(ok){st.textContent='\\u2713 Copied \\u2014 '+(why||'paste into Claude to log to '+(CONFIG.crmName||'your CRM')+'.');st.className='lcn-status warn';}else{st.textContent='Could not copy \\u2014 select the text manually. '+(why||'');st.className='lcn-status warn';}});}" +
"function lcnSave(){var st=document.getElementById('lcnStatus');var txt=document.getElementById('lcnNotes').value;if(!txt.trim()){st.textContent='Nothing to log.';st.className='lcn-status warn';return;}if(!CONFIG.leadId){lcnCopyFallback(txt,st,'NOT logged \\u2014 this debrief was built without a '+(CONFIG.crmName||'CRM')+' record id, so there is nowhere to write it. Copied instead.');return;}st.textContent='Saving\\u2026';st.className='lcn-status';fetch('/api/cc/leads',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'note',lead_id:CONFIG.leadId,note:txt})}).then(function(r){return r.json().then(function(j){return{ok:r.ok,status:r.status,j:j};},function(){return{ok:false,status:r.status,j:{}};});}).then(function(res){if(res.ok&&res.j&&res.j.ok&&res.j.id){st.textContent='\\u2713 Logged to '+(CONFIG.crmName||'your CRM');st.className='lcn-status ok';setTimeout(lcnClose,1500);return;}if(res.status===401){lcnCopyFallback(txt,st,'NOT logged. Open this debrief from your Command Center and one click will log it \\u2014 opened straight from the file on your Mac it has no way to sign in. Copied instead.');return;}var code=(res.j&&res.j.error)||('http '+res.status);lcnCopyFallback(txt,st,'NOT logged \\u2014 '+code+'. Nothing was written. Copied instead.');}).catch(function(){lcnCopyFallback(txt,st,'NOT logged \\u2014 could not reach the Command Center. Nothing was written. Copied instead.');});}" +
"restoreNotes();";

/* ════════════════════════════════════════════════════════════════
   CAPTURE-QUESTION RUNTIME  (§5 capture -> §8 store)

   Writes each tap to the hosted door POST /api/cc/call-feedback the
   MOMENT it is tapped — never inferred later, never batched.

   WHY there is no API key in this file: the Command Center opens a
   debrief in an iframe with sandbox="allow-scripts allow-same-origin",
   so this page runs on the CC's own origin and `credentials:'include'`
   carries the existing CC session cookie. Nothing secret ships inside
   a debrief sitting on disk.

   The flip side, and why the 401 branch is loud: the SAME file opened
   straight off disk (file://) has no cookie and CANNOT save. That must
   say so in plain words. A capture UI that silently drops answers is
   worse than one that refuses, because the loop would look fed while
   starving (Nygard: fail loud).
   ════════════════════════════════════════════════════════════════ */
const CQ_RUNTIME = [
"var CQ_BASE=(CONFIG.apiBase||'').replace(/\\/+$/,'');",
/* SAME-ORIGIN IS THE DEFAULT, not a fallback. Fixed 2026-08-11.
   `apiBase` is OPTIONAL and always was: the Command Center serves this file from its own
   origin (either /api/cc/drive?mode=serve, or a srcdoc iframe with allow-same-origin), so an
   EMPTY base yields the relative "/api/cc/call-feedback" — which is exactly the address the
   door answers on, and exactly what the log-notes button on this same page has always used.
   The old boot guard refused to save whenever apiBase was absent, i.e. it disabled the one
   configuration that works. 39 of 46 debriefs shipped with the questions dead because of it,
   and the skill body never named `apiBase` at all — so whether a debrief could save was left
   to whichever session happened to remember an undocumented key.
   The real gate is ORIGIN, not config: a file:// document has origin "null" and genuinely
   cannot sign in. That is the only case worth disabling, and it is what CQ_ORIGIN_OK tests. */
"var CQ_ORIGIN_OK=/^https?:/i.test(String(location.origin||''))||/^https?:/i.test(CQ_BASE);",
"var CQ_URL=CQ_BASE+'/api/cc/call-feedback';",
"var CQ_REF=CONFIG.callRef||CONFIG.debriefId||'';",
"function cqCards(){return Array.prototype.slice.call(document.querySelectorAll('.cq'));}",
"function cqGate(msg,cls){var g=document.getElementById('cqGate');if(!g)return;g.innerHTML=msg||'';g.className='cq-gate'+(cls?' '+cls:'');}",
/* show the first card that has not been answered; if none left, say so once */
"function cqAdvance(){var cards=cqCards();for(var i=0;i<cards.length;i++){if(!cards[i].classList.contains('answered')){cards[i].classList.add('show');return;}}var g=document.getElementById('cqGate');if(g&&!document.getElementById('cqAllDone')){var d=document.createElement('div');d.id='cqAllDone';d.className='cq-done';d.textContent='\\u2713 That\\u2019s both of them \\u2014 thanks. Read on.';g.parentNode.insertBefore(d,g.nextSibling);}}",
/* mark one card answered and lock its buttons so a tap can't be double-counted */
"function cqMark(i,val,note){var c=document.getElementById('cq'+i);if(!c)return;c.classList.add('answered');var box=c.querySelectorAll('.cq-opts')[0];if(box){Array.prototype.slice.call(box.children).forEach(function(b){if(b.getAttribute('data-v')===val){b.classList.add('chosen');}else{b.classList.add('dim');}b.disabled=true;});}var o=document.getElementById('cqother'+i);if(o&&val!=='other')o.classList.remove('show');}",
/* the one write. Resolves the answer into the column the door expects. */
"function cqPost(i,body,okMsg){var st=document.getElementById('cqstatus'+i);st.textContent='Saving\\u2026';st.className='cq-status';",
"return fetch(CQ_URL,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})",
".then(function(r){return r.json().then(function(j){return{s:r.status,j:j};},function(){return{s:r.status,j:{}};});})",
".then(function(res){",
"  if(res.s===200&&res.j&&res.j.ok){st.textContent=okMsg||'\\u2713 Saved';st.className='cq-status ok';return true;}",
"  if(res.s===401){st.textContent='';cqGate('<strong>Not saved.</strong> Open this debrief from your Command Center and these answers will save as you tap. Opened straight from the file on your Mac, it has no way to sign in.','warn');cqDisableAll();return false;}",
"  if(res.s===403){st.textContent='';cqGate('<strong>Not saved.</strong> Your Command Center says this account is not allowed in right now.','warn');return false;}",
"  var code=(res.j&&res.j.error)||('http '+res.s);st.textContent='Not saved \\u2014 '+code+'. Nothing was written.';st.className='cq-status bad';return false;",
"}).catch(function(){var st2=document.getElementById('cqstatus'+i);st2.textContent='Not saved \\u2014 could not reach the Command Center. Nothing was written.';st2.className='cq-status bad';return false;});}",
/* a tap on a choice */
"function cqPick(i,val){var c=document.getElementById('cq'+i);if(!c||c.classList.contains('answered'))return;",
"var code=c.getAttribute('data-code');",
"if(code==='trigger'&&val==='other'){document.getElementById('cqother'+i).classList.add('show');document.getElementById('cqothertxt'+i).focus();return;}",
"var body=cqBody(c);",
"if(code==='trigger')body.trigger_code=val;else if(code==='reception')body.ahha_rating=val;else body.option_used=val;",
"cqPost(i,body).then(function(ok){if(!ok)return;cqMark(i,val);",
"  if(code==='reception'&&c.getAttribute('data-attrib')){c.setAttribute('data-answered-rating',val);document.getElementById('cqattrib'+i).classList.add('show');return;}cqAdvance();});}",
/* \"Something else...\" -> the note is REQUIRED, mirroring the store's rule */
"function cqSaveOther(i){var c=document.getElementById('cq'+i);var txt=document.getElementById('cqothertxt'+i).value.trim();var st=document.getElementById('cqstatus'+i);",
"if(!txt){st.textContent='Type what set it off, then Save that.';st.className='cq-status warn';return;}",
"var body=cqBody(c);body.trigger_code='other';body.note=txt;",
"cqPost(i,body).then(function(ok){if(!ok)return;cqMark(i,'other');document.getElementById('cqother'+i).classList.remove('show');cqAdvance();});}",
/* the on-me / the-situation follow-up (spec §6 constraint 1: attribution) */
"function cqAttrib(i,val){var c=document.getElementById('cq'+i);var body=cqBody(c);body.ahha_rating=c.getAttribute('data-answered-rating')||'could_not_tell';body.attribution=val;",
"cqPost(i,body,'\\u2713 Saved').then(function(ok){if(!ok)return;var a=document.getElementById('cqattrib'+i);Array.prototype.slice.call(a.querySelectorAll('.cq-opt')).forEach(function(b){b.disabled=true;if(b.getAttribute('onclick').indexOf(\"'\"+val+\"'\")>-1)b.classList.add('chosen');else b.classList.add('dim');});cqAdvance();});}",
/* the shared envelope */
"function cqBody(c){var b={call_ref:CQ_REF,surface:'debrief_review',beachhead:c.getAttribute('data-beachhead'),question_code:c.getAttribute('data-code'),question_text:c.getAttribute('data-text')};",
"var a=c.getAttribute('data-anchor');if(a)b.transcript_anchor_ms=Number(a);var u=c.getAttribute('data-url');if(u&&/^https:/i.test(u))b.transcript_url=u;return b;}",
/* on load: never ask something already answered (Norman) */
/* A dead pipe must still SHOW the questions — a section header that says
   \"2 questions\" over an empty body reads as broken. Show them, disable the
   taps, and say why: never offer a button that does nothing (Norman). */
"function cqDisableAll(){cqCards().forEach(function(c){Array.prototype.slice.call(c.querySelectorAll('.cq-opt')).forEach(function(b){b.disabled=true;b.classList.add('dim');});});}",
"function cqBoot(){var cards=cqCards();if(!cards.length)return;",
"if(!CQ_ORIGIN_OK){cqGate('<strong>These cannot save here.</strong> Open this debrief from your Command Center and your answers save as you tap. Opened straight from the file on your Mac, it has no way to sign in.','warn');cards[0].classList.add('show');cqDisableAll();return;}",
"fetch(CQ_URL+'?call_ref='+encodeURIComponent(CQ_REF),{credentials:'include'}).then(function(r){return r.status===200?r.json():null;}).then(function(j){",
"  if(j&&j.ok&&j.answers&&j.answers.length){j.answers.forEach(function(a){cards.forEach(function(c){if(c.getAttribute('data-beachhead')===a.beachhead&&c.getAttribute('data-code')===a.question_code){var i=c.getAttribute('data-idx');var v=a.trigger_code||a.ahha_rating||a.option_used;cqMark(i,v);document.getElementById('cqstatus'+i).textContent='\\u2713 Answered already';document.getElementById('cqstatus'+i).className='cq-status ok';}});});}",
"  cqAdvance();",
"}).catch(function(){cqAdvance();});}",
"cqBoot();"
].join('');

/* ── assemble ── */
function buildStandaloneHtml(d, config) {
  const sec = buildBodyHtml(d);
  const cfg = Object.assign({}, config);
  return [
'<!DOCTYPE html>',
'<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
'<title>' + esc(d.header && d.header.title || ('Call Debrief — ' + config.prospect)) + '</title>',
'<style>' + STANDALONE_CSS + '</style></head>',
'<body>',
'<div class="header"><div class="header-left"><h1>' + esc(d.header && d.header.title || config.prospect) + '</h1>' +
  '<p>' + esc(d.header && d.header.subtitle || '') + '</p></div>' +
  '<div class="header-right"><div class="status-dot"></div><span class="call-live">DEBRIEF</span></div></div>',
'<div class="context-bar">' + sec.contextBar + '</div>',
'<div class="doc-controls" style="max-width:820px;margin:10px auto 0;padding:0 24px;display:flex;gap:8px;">' +
  '<button class="btn btn-ghost" onclick="expandAll()">⊕ Expand all</button>' +
  '<button class="btn btn-ghost" onclick="collapseAll()">⊖ Collapse all</button></div>',
(sec.glance ? '<div style="padding:16px 24px 0;max-width:820px;margin:0 auto;">' + sec.glance + '</div>' : ''),
'<div class="sections" id="sections">' + sec.html + '</div>',
'<div class="log-bar"><div class="log-info">Reviewed it? One click logs the debrief to <b id="crm-name-label">your CRM</b>. <span>Your added notes autosave on this device.</span></div>' +
  '<span class="log-status" id="log-status"></span>' +
  '<button class="btn-log" id="log-btn" onclick="lcnOpen()">Log Debrief<small id="log-sub">saves to CRM</small></button></div>',
'<div class="ov" id="lcnOv"><div class="ov-card"><h2>Log Debrief</h2><p class="lcn-sub" id="lcnWho">Debrief —</p>' +
  '<label class="lcn-l">What gets logged <span class="lcn-opt">(edit anything before saving)</span></label>' +
  '<textarea id="lcnNotes" class="lcn-ta"></textarea>' +
  '<div class="lcn-btns"><button class="btn btn-g" onclick="lcnClose()">Cancel</button><button class="btn btn-primary" onclick="lcnSave()">Save to ' + esc(config.crmName || 'CRM') + '</button></div>' +
  '<div class="lcn-status" id="lcnStatus"></div></div></div>',
'<div class="foot-stamp">BUILD ' + BUILD_STAMP + ' · auto-generated · Call Debrief</div>',
'<script>var CONFIG=' + JSON.stringify(cfg) + ';var SECTION_LABELS=' + JSON.stringify(sec.labels) + ';var CRM_LOG=' + JSON.stringify(sec.crmLog) + ';</' + 'script>',
'<script>' + STANDALONE_RUNTIME + CQ_RUNTIME + '</' + 'script>',
'</body></html>'
  ].join('\n');
}

/* ── CLI ── */
async function main() {
  const [debriefPath, configPath, outPath] = process.argv.slice(2);
  if (!debriefPath || !configPath || !outPath) {
    console.error('Usage: node build-call-debrief.js <debrief.json> <config.json> <output.html>');
    process.exit(1);
  }
  const d = JSON.parse(stripFences(fs.readFileSync(debriefPath, 'utf8')));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.debriefId) config.debriefId = 'd' + Date.now();

  /* BOTH GATES RUN BEFORE A BYTE IS RENDERED — see each function's own header.
     crmRecordGate is the same rule the guide builder enforces; it lives in one place per
     skill because the two builders ship as separate files in separate skill folders and
     there is no shared module in the plugin format. If you change one, change the other:
     the sibling three lines away keeping the old behaviour is EXACTLY how the Save button
     was fixed on the guide in August and left broken on the debrief. */
  captureQuestionGate(d);
  const crm = crmRecordGate(config);

  const html = buildStandaloneHtml(d, config);
  const absOut = path.resolve(outPath);

  /* PLAN FIRST — every shape refusal happens before a single byte is written. */
  const R = loadRegistrar();
  const plan = R.planRegistration(absOut, {
    eventId:       config.eventId,
    kind:          'debrief',
    builtBy:       config.builtBy || 'call-debrief',
    eventIdSource: config.eventIdSource || 'build',
    meetingDate:   config.meetingDate,
    person:        config.prospect || '',
    domain:        config.domain || String(config.email || '').split('@')[1] || '',
    callRef:       config.callRef || null,
    // The hosted half is a STATED gap, never a blank: this builder writes the local copy only.
    fileId: '', viewUrl: '',
    hostedGap: 'builder writes the local copy only — no Drive upload happens at build time',
    /* THE DECLARATION TRAVELS WITH THE ROW, not just the build log — see the same note in
       build-call-guide.js. A build-time check that leaves no trace cannot answer "was this
       missing lead a decision or an accident?" weeks later.

       ⚠ AND IT NOW TRAVELS AS COLUMNS, added 2026-08-11 PM in the same batch as the guide
       builder. THIS FILE IS THE SIBLING, and it is written out because the sibling is what
       usually gets missed: the guide builder is where the defect was FOUND, so a fix aimed
       at the finding alone would have left debriefs registering with no lead while the
       guide side went green — a guard in one writer letting its sibling swallow the rest.
       Debriefs are the larger population. `crm` is the SAME crmRecordGate result this
       builder already computes; nothing new is being decided here, only carried. */
    leadId:        crm.attached ? crm.leadId : '',
    noLeadReason:  crm.attached ? '' : crm.noLeadReason,
    changeNote: 'built by ' + (config.builtBy || 'call-debrief')
                + ' from ' + path.basename(debriefPath)
                + (crm.attached ? '' : ' — NO CRM RECORD, DECLARED: ' + crm.noLeadReason),
  });

  /* Write to QUARANTINE. This name deliberately does not match the <YYYYMMDD>_<kind>_
     convention, so a leftover can never be mistaken for a real document. */
  fs.writeFileSync(plan.quarantinePath, html, 'utf8');
  const planPath = absOut + '.plan.json';
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

  console.error('✓ Built ' + html.length + ' chars');
  console.error('✓ QUARANTINED at ' + plan.quarantinePath);
  console.error('  It is NOT a call document yet. It gets its real name only after the row lands.');
  console.error('✓ Plan written to ' + planPath);
  console.error('');
  console.error('NEXT — two moves, and the session is the wire:');
  console.error('  1. Run plan.sql with plan.params through the board connector, resolved BY');
  console.error('     CATEGORY (Core §11 rule 4). Save the FULL result to ' + absOut + '.result.json');
  console.error('  2. node register-call-doc.js --settle "' + planPath + '" \\');
  console.error('       --result "' + absOut + '.result.json"');
  console.error('');
  console.error('If the row is refused, --settle DELETES the quarantine file. That is the feature.');

  /* stdout is the machine-readable half, so a session never has to parse the prose above. */
  console.log(JSON.stringify({ status: 'planned', planPath, resultPath: absOut + '.result.json',
                               quarantinePath: plan.quarantinePath, finalPath: plan.finalPath,
                               docId: plan.docId, sql: plan.sql, params: plan.params }, null, 2));
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
module.exports = { buildStandaloneHtml, buildBodyHtml,
                   /* Exported so the gates can be PROVEN rather than asserted — see the same
                      note in build-call-guide.js. */
                   __gates: { crmRecordGate, captureQuestionGate, MIN_NO_LEAD_REASON },
                   /* Exported 2026-08-11 so a REPAIR can restore a question panel into a debrief
                      that already exists, without rebuilding the document around it. Three
                      debriefs shipped with their questions silently deleted; their analysis is
                      good work and in the debrief's case IRRECOVERABLE (no source JSON is kept),
                      so a "rebuild" would mean re-running the whole read and getting a different
                      document. Bryce's standing rule — patch, don't rebuild.
                      The repair GENERATES the panel with this function; it never hand-writes the
                      HTML, which is the same discipline the email-body rule enforces one level
                      over. */
                   __render: { buildCaptureQuestions } };
