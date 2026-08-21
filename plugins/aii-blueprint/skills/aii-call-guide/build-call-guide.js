#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   build-call-guide.js  —  the LOCKED shell for the Call Guide.

   This is the "formatting" half of the Call Guide. It is pulled
   verbatim from the call-guide Cowork artifact (BUILD 2026-06-11-FOLD)
   so the standalone live guide looks and behaves byte-for-byte the
   same every time. The brain NEVER writes this HTML by hand — it only
   produces guide.json (the content). This script turns content -> shell.

   USAGE:
     node build-call-guide.js <guide.json> <config.json> <output.html>

   guide.json   = the guide CONTENT (schema documented in SKILL.md)
   config.json  = { guideId, prospect, company, email,
                    crmName,
                    leadId,         <- REQUIRED 2026-08-11. The CRM lead id. Without it the build is
                                       REFUSED (crmRecordGate, exit 6), because the page's Log Call
                                       Notes button cannot post a note and degrades to a clipboard
                                       copy that LOOKS like a Save. 12 of 20 guides shipped that way.
                    noLeadReason,   <- OMIT unless leadId is genuinely empty (a cohort, a group call).
                                       Then it is REQUIRED and must be a real sentence a human wrote;
                                       a placeholder is refused by length on purpose.
                    eventId,        <- REQUIRED 2026-08-05. The calendar event id. Without it the
                                       build is REFUSED and the output file is deleted, because an
                                       unregistered call document cannot exist (L3, call_doc).
                    meetingDate,    <- REQUIRED. YYYYMMDD. Must equal the date slot in the filename.
                    domain,            optional — falls back to the domain half of `email`
                    eventIdSource,     optional — defaults to 'build' (the builder had the id)
                    builtBy }          optional — defaults to 'call-guide'; the scheduled sweep
                                       passes 'auto-guide-debrief-sweep'
                    (logWebhookUrl RETIRED 2026-08-05 — it was never populated in any of the
                     96 built guides/debriefs, so the Save button was always a clipboard button.
                     The note now goes through the Command Center's own door, api/cc/leads
                     {mode:'note'}, on a relative path. Nothing to configure, nothing to paste.)
   output.html  = where to write the finished standalone guide

   If formatting ever needs to change, change it HERE (one place),
   then regenerate. Do not fork this into the skill body.
   ════════════════════════════════════════════════════════════════ */

/* ✅ THE PATCH BELOW IS RETIRED — THE BUTTON HAS A REAL DOOR (2026-08-07, S7).
   POST /api/cc/call-refresh exists (aii-site api/cc/call-refresh.js, on origin/main, proof
   api/cc/prove-cc-call-refresh-door.js 56/56). The live board now carries "Update this guide",
   which sends this page's notes to that door over a RELATIVE cookie-authed POST and prints the
   door's OWN sentence back — see cgRefresh() in the runtime below. Nothing is copied to a
   clipboard and nothing asks Bryce to paste anything anywhere. Ruling D4 is satisfied.

   TWO THINGS THAT ARE STILL TRUE AND MUST NOT BE READ AS FIXED:
     1. The door RECORDS the ask; it does not re-render. The re-render is §8.6's regeneration
        path, which needs a real filesystem. WHAT CLAIMS A PENDING REQUEST IS NOT BUILT — see
        card neon_call_refresh_requests_have_no_claimer_20260807.
     2. This edit reaches NO guide already on disk. A builder change only affects guides built
        after it. Do not report this as "the button is fixed everywhere."

   The retired patch note is kept below verbatim, because it carries the old strings and a
   session that remembers them would put them back.

   ⚠ (RETIRED) THE REGENERATE BUTTON IS HONEST NOW, AND IT IS STILL A PATCH (2026-08-07).
   The Pre-call -> Live overlay used to offer a button reading "Use to regenerate ↗" whose
   helper text promised it would "rebuild a sharper guide." It copied text to the clipboard.
   Bryce clicked it 15 minutes before a live call on 2026-08-06 and found it did nothing of
   the kind. The old strings are quoted here rather than deleted, because a session that
   remembers them would put them back:

       button   : Use to regenerate ↗
       helper   : "Use to regenerate" copies your notes + context so you can paste into
                  Claude and rebuild a sharper guide.
       status   : ✓ Copied — paste into Claude to rebuild the guide

   WHY IT SAID THAT, and it is not carelessness — it is the SAME defect the Save button had.
   Log-Call-Notes-Modal-SPEC v0.2 §9 (2026-08-05) found the Save button was a clipboard button
   wearing a Save label because the capability crm/create_note had never been REGISTERED, so
   every surface invented its own answer. That fix gave Save a real door (POST /api/cc/leads)
   and was scoped to the Save button — the INSTANCE — so its sibling three lines away kept the
   clipboard. Card neon_fwc_an_invented_config_key_is_an_unregistered_capability_20260805 had
   already predicted exactly this: "every other surface will invent its own too."

   THE ROOT FIX IS RULED AND NOT BUILT. Bryce ruled it 2026-08-05 (card
   neon_call_guide_segments_are_jobs_and_refresh_is_per_segment_20260805, ruling D4): a served
   page reaches the server by a RELATIVE cookie-authed POST, and refresh is PER SEGMENT against
   kept guide JSON. Canon: Call-Guide-Content-SPEC v1.1 §8. The stores were built 2026-08-07
   (call_guide_state, call_refresh_request; gate_call_guide_state() 16/16). THIS BUILDER NOW
   WRITES KEPT STATE — 2026-08-07 (S5), see the guideJson field in main()'s planRegistration
   call; §8.5 of the spec is its canon. POST /api/cc/call-refresh WAS the missing half and it
   landed 2026-08-07 (S7) — see the block at the top of this file. What is still missing is the
   PER-SEGMENT merge (card neon_call_guide_segments_are_jobs_and_refresh_is_per_segment_20260805)
   and a claimer for the queued asks (card neon_call_refresh_requests_have_no_claimer_20260807).

   ⚠ AND THIS EDIT DOES NOT REACH A SINGLE GUIDE ALREADY ON DISK. A builder change only
   affects guides built AFTER it, exactly as §9 recorded for the 96 already-built files. The
   39 guides sitting in client folders still carry the old promise. Do not report this as
   "the button is fixed everywhere." */

const fs = require('fs');

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

const BUILD_STAMP = '2026-08-07-COVERAGE-BOARD';

/* ── helpers (verbatim from artifact) ── */
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function stripFences(s) { return String(s || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); }
function pillColor(c) { return ({ green:'green', yellow:'yellow', red:'red', blue:'' })[c] || ''; }
function nl(s) { return esc(s).replace(/\\n\\n/g, '<br><br>').replace(/\n\n/g, '<br><br>').replace(/\\n/g, '<br>').replace(/\n/g, '<br>'); }
function richAnswer(s) {
  let h = esc(s).replace(/\\n\\n/g, '<br><br>').replace(/\n\n/g, '<br><br>').replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
  return h.replace(/&lt;strong&gt;/gi, '<strong>').replace(/&lt;\/strong&gt;/gi, '</strong>').replace(/&lt;em&gt;/gi, '<em>').replace(/&lt;\/em&gt;/gi, '</em>');
}

/* -- person/company links (generic, CRM-sourced: contact LinkedIn + company website/domain) -- */
var LINKEDIN_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H20v-5.4c0-1.3 0-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21H12z"/></svg>';
var GLOBE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z"/></svg>';
function normUrl(u){u=String(u==null?'':u).trim();if(!u)return '';if(/^https?:\/\//i.test(u))return u;return 'https://'+u.replace(/^\/+/,'');}
function domainOf(u){return String(u==null?'':u).replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/[\/?#].*$/,'');}
function linkChip(url,svg,label,sub){var href=normUrl(url);if(!href)return '';return '<a class="lk" href="'+esc(href)+'" target="_blank" rel="noopener">'+svg+'<span>'+esc(label)+(sub?' <span class="lk-sub">'+esc(sub)+'</span>':'')+'</span></a>';}
function buildLinksHtml(g){var L=(g&&g.links)||{};var p=L.person||{},c=L.company||{};var chips=[];if(p.linkedin)chips.push(linkChip(p.linkedin,LINKEDIN_SVG,p.name||'LinkedIn',p.title||''));if(c.website)chips.push(linkChip(c.website,GLOBE_SVG,c.name||domainOf(c.website),''));(L.extra||[]).forEach(function(x){if(x&&x.url)chips.push(linkChip(x.url,GLOBE_SVG,x.label||domainOf(x.url),''));});return chips.length?chips.join(''):'';}

/* ── section/body builders (verbatim from artifact) ── */
function buildSectionsHtml(g) {
  const labels = {};
  let total = 0, step = 1, html = '';

  const contextBar = (g.contextBar || []).map(c =>
    '<div class="ctx-item"><span class="ctx-label">' + esc(c.label) + '</span><span class="ctx-val">' + esc(c.value) + '</span></div>'
  ).join('');

  const glanceItems = (g.glance || []).map(x =>
    '<div class="tim-item"><div class="lbl">' + esc(x.label) + '</div><div class="val">' + esc(x.value) + '</div></div>').join('');
  const tags = (g.tags || []).map(t =>
    '<span class="pill ' + esc(pillColor(t.color)) + '">' + esc(t.text) + '</span>').join('');
  const linksInner = buildLinksHtml(g);
  const glance = '<div class="tim-card"><h3>At a glance</h3><div class="tim-grid">' + glanceItems + '</div>' +
    (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
    (linksInner ? '<div class="glance-links">' + linksInner + '</div>' : '') + '</div>';

  const ordered = [];
  (g.sections || []).forEach(s => ordered.push({ t: 'standard', d: s }));
  (g.objectionHandlers || []).forEach(o => ordered.push({ t: 'objection', d: o }));
  if (g.hookSection) ordered.push({ t: 'hook', d: g.hookSection });
  if (g.closeSection) ordered.push({ t: 'close', d: g.closeSection });

  ordered.forEach((item, idx) => {
    const id = item.d.id || ('sec' + (idx + 1));
    const isMain = item.t !== 'objection';
    const num = item.t === 'objection' ? '!' : String(step);
    if (isMain) { total++; }
    labels[id] = item.d.title || ('Section ' + num);
    const meta = item.d.badge ? '<span class="section-meta">' + esc(item.d.badge) + '</span>'
      : (item.d.timing ? '<span class="section-meta">' + esc(item.d.timing) + '</span>' : '');
    html += '<div class="section' + (idx === 0 ? ' active open' : '') + '" id="' + esc(id) + '">' +
      '<div class="section-header" onclick="toggleSection(\'' + esc(id) + '\')">' +
      '<div class="step-num">' + num + '</div><div class="section-title">' + esc(item.d.title) + '</div>' +
      meta + '<span class="chevron">▼</span></div><div class="section-body">' +
      ((idx === 0 && linksInner) ? '<div class="linkbar">' + linksInner + '</div>' : '') + bodyFor(item, id) + captureFor(item, id) + controlsFor(item, id) + '</div></div>';
    if (isMain) step++;
  });

  if (g.followups && g.followups.length) {
    labels['followups'] = 'After the call';
    html += '<div class="section" id="followups"><div class="section-header" onclick="toggleSection(\'followups\')">' +
      '<div class="step-num">↗</div><div class="section-title">After the call — send these</div>' +
      '<span class="section-meta">Within 2 hrs</span><span class="chevron">▼</span></div>' +
      '<div class="section-body"><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">' +
      g.followups.map((f, i) =>
        '<label style="display:flex;gap:10px;align-items:center;font-size:0.82rem;color:#33334d;cursor:pointer;">' +
        '<input type="checkbox" class="fu" data-fu="' + esc(f) + '" style="accent-color:#4f46e5;width:15px;height:15px;"> ' + esc(f) + '</label>'
      ).join('') + '</div></div></div>';
  }

  return { html, labels, total, contextBar, glance };
}

function bodyFor(item, id) {
  const d = item.d; let h = '';
  if (item.t === 'standard' || item.t === 'hook') {
    if (d.advisorRead) h += '<div class="coach-note"><strong>Advisor read</strong>' + esc(d.advisorRead) + '</div>';
    if (d.sayThis) h += '<div class="say-this">' + nl(d.sayThis) + '</div>';
    if (d.stopNote) h += '<div class="coach-note"><strong>Stop here</strong>' + esc(d.stopNote) + '</div>';
  } else if (item.t === 'objection') {
    h += '<div class="objection-block"><div class="objection-label">Their concern</div>' +
      '<div class="objection-q">' + esc(d.concern) + '</div>' +
      '<div class="objection-a">' + richAnswer(d.answer) + '</div></div>';
    if (d.advisorRead) h += '<div class="coach-note"><strong>Advisor read</strong>' + esc(d.advisorRead) + '</div>';
  } else if (item.t === 'close') {
    if (d.question) h += '<div class="close-big"><div class="close-label">The one question</div><div class="close-q">"' + esc(d.question) + '"</div></div>';
    if (d.advisorRead) h += '<div class="coach-note"><strong>Advisor read</strong>' + esc(d.advisorRead) + '</div>';
    if (d.branches && d.branches.length) {
      h += '<div class="branch">' + d.branches.map(b =>
        '<div class="branch-card"><div class="if">' + esc(b.if) + '</div><div class="then">' + esc(b.then) + '</div></div>').join('') + '</div>';
    }
    if (d.icp) h += '<hr class="divider"><div class="info-row"><span class="icon">✓</span><span><strong>ICP check:</strong> ' + esc(d.icp) + '</span></div>';
  }
  return h;
}

function captureFor(item, id) {
  if (item.t === 'close') {
    return '<div class="capture"><div class="capture-label">🎯 Call outcome</div>' +
      '<div class="outcome-row">' +
      ['Strong yes / next step set','Interested, no commit','Needs follow-up','Not a fit'].map(o =>
        '<div class="outcome-chip" data-outcome="' + esc(o) + '" onclick="pickOutcome(this)">' + esc(o) + '</div>').join('') +
      '</div><div class="capture-grid">' +
      '<div><div class="capture-label">Key name / account captured</div><input class="note" data-note="account" placeholder="e.g. Larson Auto Group"></div>' +
      '<div><div class="capture-label">Next step + when</div><input class="note" data-note="nextstep" placeholder="e.g. 3-way intro call next Tue"></div>' +
      '</div><div class="capture-label">Close notes — anything else worth logging</div>' +
      '<textarea class="note closenote" data-note="' + esc(id) + '" placeholder="Key quotes, concerns, who else is involved..."></textarea></div>';
  }
  return '<div class="capture"><div class="capture-label">✍️ Your notes</div>' +
    '<textarea class="note" data-note="' + esc(id) + '" placeholder="What actually happened here..."></textarea></div>';
}

function controlsFor(item, id) {
  const done = '<button class="btn btn-done" onclick="markDone(\'' + esc(id) + '\')">' + (item.t === 'close' ? '✓ Call complete' : '✓ Done') + '</button>';
  const collapse = '<button class="btn btn-ghost" onclick="toggleSection(\'' + esc(id) + '\')">Collapse</button>';
  return '<div class="section-controls">' + done + collapse + '</div>';
}

/* ── CSS (verbatim from artifact) ── */
const STANDALONE_CSS = "*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F5F5FA;color:#33334d;min-height:100vh;padding-bottom:96px}.header{background:#0D0D24;border-bottom:2px solid #4f46e5;padding:18px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}.header-left h1{font-size:1.1rem;font-weight:700;color:#fff}.header-left p{font-size:.78rem;color:#a5a5c0;margin-top:2px}.header-right{display:flex;gap:8px;align-items:center}.status-dot{width:8px;height:8px;border-radius:50%;background:#00d4aa;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.call-live{font-size:.72rem;color:#00d4aa;font-weight:600;letter-spacing:.05em}.mode-toggle{display:flex;gap:4px;background:#1c1c3a;border:1px solid #2f2f52;border-radius:8px;padding:3px}.mode-btn{padding:5px 12px;border-radius:6px;font-size:.7rem;font-weight:600;border:none;cursor:pointer;background:transparent;color:#a5a5c0;transition:all .15s}.mode-btn.active{background:#4f46e5;color:#fff}.context-bar{background:#fff;border-bottom:1px solid #e5e5ef;padding:10px 28px;display:flex;gap:20px;flex-wrap:wrap}.ctx-item{display:flex;gap:6px;align-items:center;font-size:.75rem;color:#6b6b85}.ctx-label{color:#9a9ab0}.ctx-val{color:#33334d;font-weight:500}.sections{padding:16px 24px;max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:8px}.section{background:#fff;border:1px solid #e5e5ef;border-radius:10px;overflow:hidden;transition:all .2s}.section.active{border-color:#4f46e5;box-shadow:0 0 0 1px #4f46e540}.section.done{opacity:.55}.section-header{padding:14px 18px;cursor:pointer;display:flex;align-items:center;gap:12px;user-select:none}.section-header:hover{background:#f5f5fa}.step-num{width:26px;height:26px;border-radius:50%;background:#eef0f7;border:1.5px solid #d5d5e5;font-size:.72rem;font-weight:700;color:#6b6b85;display:flex;align-items:center;justify-content:center;flex-shrink:0}.section.active .step-num{background:#4f46e5;border-color:#4f46e5;color:#fff}.section.done .step-num{background:#d1fae5;border-color:#10b981;color:#047857}.section-title{flex:1;font-size:.88rem;font-weight:600;color:#33334d}.section.active .section-title{color:#0d0d24}.section-meta{font-size:.7rem;color:#9a9ab0;white-space:nowrap}.chevron{color:#b5b5c8;font-size:.7rem;transition:transform .2s}.section.open .chevron{transform:rotate(180deg)}.section-body{display:none;padding:0 18px 18px;border-top:1px solid #eef0f7}.section.open .section-body{display:block}.coach-note{background:#ecfdf5;border-left:3px solid #10b981;border-radius:6px;padding:10px 14px;margin:12px 0;font-size:.78rem;color:#065f46;line-height:1.55}.coach-note strong{color:#059669;display:block;margin-bottom:3px;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase}.say-this{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:.84rem;line-height:1.65;color:#312e81}.say-this::before{content:'💬';font-size:.75rem;display:block;margin-bottom:6px;opacity:.7}.objection-block{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:14px 16px;margin:12px 0}.objection-label{font-size:.7rem;font-weight:700;color:#7c3aed;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px}.objection-q{font-size:.82rem;color:#6d28d9;margin-bottom:10px;font-style:italic}.objection-a{font-size:.82rem;color:#4c1d95;line-height:1.6}.objection-a strong{color:#7c3aed}.branch{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.branch-card{flex:1;min-width:180px;background:#fff;border:1px solid #e5e5ef;border-radius:8px;padding:12px 14px;font-size:.78rem}.branch-card .if{font-size:.68rem;color:#9a9ab0;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}.branch-card .then{color:#33334d;line-height:1.5}.pill{display:inline-block;background:#e0e7ff;color:#4338ca;font-size:.68rem;font-weight:600;padding:2px 8px;border-radius:99px;margin:2px}.pill.red{background:#fee2e2;color:#b91c1c}.pill.green{background:#d1fae5;color:#047857}.pill.yellow{background:#fef3c7;color:#b45309}.info-row{display:flex;gap:6px;align-items:flex-start;margin:6px 0;font-size:.8rem;color:#6b6b85}.info-row .icon{color:#b5b5c8;flex-shrink:0}.section-control{display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #eef0f7}.btn{padding:6px 14px;border-radius:6px;font-size:.75rem;font-weight:600;border:none;cursor:pointer;transition:all .15s}.btn-primary{background:#4f46e5;color:#fff}.btn-primary:hover{background:#4338ca}.btn-done{background:#059669;color:#fff}.btn-done:hover{background:#047857}.btn-ghost{background:transparent;color:#6b6b85;border:1px solid #d5d5e5}.btn-ghost:hover{color:#33334d;border-color:#a5a5b8}.progress-bar{height:3px;background:#e5e5ef;position:fixed;top:0;left:0;right:0;z-index:200}.progress-fill{height:100%;background:#4f46e5;transition:width .3s}.tim-card{background:#fff;border:1px solid #e5e5ef;border-radius:10px;padding:16px 18px;max-width:820px;margin:0 auto 8px}.tim-card h3{font-size:.8rem;color:#6b6b85;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}.tim-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tim-item{font-size:.78rem}.tim-item .lbl{color:#9a9ab0;margin-bottom:2px}.tim-item .val{color:#33334d;line-height:1.5}hr.divider{border:none;border-top:1px solid #eef0f7;margin:10px 0}.tag-row{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.glance-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #eef0f7}.lk{display:inline-flex;align-items:center;gap:6px;background:#f5f5fa;border:1px solid #e5e5ef;border-radius:8px;padding:6px 11px;font-size:.78rem;font-weight:600;color:#4338ca;text-decoration:none;transition:all .15s}.lk:hover{background:#eef2ff;border-color:#c7d2fe}.lk svg{width:14px;height:14px;flex-shrink:0}.lk .lk-sub{color:#9a9ab0;font-weight:400}.linkbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px}.close-big{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:12px 0}.close-big .close-label{font-size:.7rem;color:#059669;text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:8px}.close-big .close-q{font-size:.95rem;color:#065f46;line-height:1.55;font-weight:500}.capture{margin:12px 0 4px}.capture-label{font-size:.66rem;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;display:flex;align-items:center;gap:5px}textarea.note,input.note{width:100%;background:#fff;border:1px solid #e5e5ef;border-radius:7px;padding:9px 12px;font-family:inherit;font-size:.82rem;color:#0d0d24;outline:none;resize:vertical;line-height:1.5;transition:border-color .15s}textarea.note{min-height:54px}textarea.note:focus,input.note:focus{border-color:#f59e0b}textarea.note::placeholder,input.note::placeholder{color:#9a9ab0}.capture-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}@media(max-width:600px){.capture-grid{grid-template-columns:1fr}.tim-grid{grid-template-columns:1fr}.branch{flex-direction:column}}.outcome-row{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.outcome-chip{padding:6px 13px;border-radius:99px;font-size:.74rem;font-weight:600;border:1px solid #d5d5e5;background:#fff;color:#6b6b85;cursor:pointer;transition:all .15s}.outcome-chip.sel{background:#4f46e5;border-color:#4f46e5;color:#fff}.outcome-chip.sel.win{background:#059669;border-color:#059669}.outcome-chip.sel.lose{background:#b91c1c;border-color:#b91c1c}.log-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e5e5ef;padding:12px 24px;display:flex;align-items:center;gap:16px;z-index:300;box-shadow:0 -8px 24px rgba(13,13,36,.08)}.log-bar .log-info{flex:1;font-size:.74rem;color:#6b6b85}.log-bar .log-info b{color:#33334d}.btn-log{background:#4f46e5;color:#fff;padding:11px 22px;border-radius:9px;font-size:.85rem;font-weight:700;border:none;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;line-height:1.25}.btn-log:hover{background:#4338ca}.btn-log small{font-size:.62rem;font-weight:500;opacity:.85}.btn-log.ok{background:#059669}.log-status{font-size:.72rem;color:#059669}.log-status.warn{color:#dc2626}.ov{position:fixed;inset:0;background:rgba(13,13,36,.5);z-index:500;display:none;align-items:center;justify-content:center;padding:24px}.ov.show{display:flex}.ov-card{background:#fff;border:1px solid #e5e5ef;border-radius:14px;max-width:440px;width:100%;padding:22px 24px;box-shadow:0 20px 60px rgba(13,13,36,.25)}.ov-card h2{font-size:1rem;color:#0d0d24;margin-bottom:8px}.ov-card p{font-size:.82rem;color:#6b6b85;line-height:1.55;margin-bottom:8px}.ov-card ul{margin:8px 0 14px 18px;font-size:.82rem;color:#b91c1c;line-height:1.6}.ov-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.ov-btns .btn{padding:9px 16px;font-size:.8rem}.btn-p{background:#4f46e5;color:#fff}.btn-p:hover{background:#4338ca}.btn-d{background:#059669;color:#fff}.btn-d:hover{background:#047857}.btn-g{background:transparent;color:#6b6b85;border:1px solid #d5d5e5}.btn-g:hover{color:#33334d;border-color:#a5a5b8}.note.miss,input.note.miss{border-color:#dc2626;box-shadow:0 0 0 1px #dc262640}.lcn-l{display:block;font-size:.7rem;font-weight:700;color:#33334d;margin:11px 0 4px;text-transform:uppercase;letter-spacing:.04em}.lcn-opt{font-weight:400;text-transform:none;color:#9a9ab0}.lcn-sub{font-size:.8rem;color:#6b6b85;margin:2px 0 4px}.lcn-ta{width:100%;box-sizing:border-box;background:#fff;border:1px solid #d5d5e5;border-radius:8px;color:#0d0d24;padding:9px;font:inherit;font-size:.85rem;line-height:1.4;resize:vertical;min-height:130px}.lcn-ta.lcn-sm{min-height:54px}.lcn-tx{display:flex;align-items:center;justify-content:space-between;margin-top:13px;font-size:.82rem;color:#33334d}.lcn-seg{display:inline-flex;border:1px solid #d5d5e5;border-radius:8px;overflow:hidden}.lcn-segbtn{background:#fff;color:#6b6b85;border:0;padding:6px 18px;font:inherit;font-size:.8rem;cursor:pointer}.lcn-segbtn.lcn-on{background:#4f46e5;color:#fff}.lcn-hint{font-size:.72rem;color:#4f46e5;margin:8px 0 0}.lcn-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:15px}.lcn-status{margin-top:10px;font-size:.78rem;min-height:1em}.lcn-status.ok{color:#059669}.lcn-status.warn{color:#d97706}.foot-stamp{text-align:center;font-size:.62rem;color:#b5b5c8;padding:14px 0 80px;letter-spacing:.04em}";

/* ── runtime (verbatim from artifact) ── */
const STANDALONE_RUNTIME =
"var STORE_KEY='callguide_notes_'+CONFIG.guideId;var selectedOutcome='';"+
"document.getElementById('crm-name-label').textContent='your CRM';"+
"document.getElementById('log-sub').textContent='saves your notes to your CRM';"+
"function hasNotes(){var a=false;document.querySelectorAll('.note').forEach(function(n){if(n.value&&n.value.trim())a=true;});return a;}"+
"function toggleSection(id){document.getElementById(id).classList.toggle('open');}"+
"function expandAll(){document.querySelectorAll('.section').forEach(function(s){s.classList.add('open');});}"+
"function collapseAll(){document.querySelectorAll('.section').forEach(function(s){s.classList.remove('open');});}"+
"function activateNext(c,n){var cur=document.getElementById(c),nx=document.getElementById(n);if(cur)cur.classList.remove('open');if(nx){nx.classList.add('active','open');nx.scrollIntoView({behavior:'smooth',block:'start'});}}"+
"function markDone(id){var el=document.getElementById(id);el.classList.add('done');el.classList.remove('active','open');var sn=el.querySelector('.step-num');if(sn&&sn.textContent!=='↗'&&sn.textContent!=='!')sn.textContent='✓';var done=document.querySelectorAll('.section.done').length;var t=CONFIG.totalSections||1;document.getElementById('progressFill').style.width=Math.round(Math.min(done,t)/t*100)+'%';}"+
"function pickOutcome(el){document.querySelectorAll('.outcome-chip').forEach(function(c){c.classList.remove('sel','win','lose');});el.classList.add('sel');var v=el.getAttribute('data-outcome');if(v==='Strong yes / next step set')el.classList.add('win');if(v==='Not a fit')el.classList.add('lose');selectedOutcome=v;saveNotes();}"+
"function collectRaw(){var o={};document.querySelectorAll('[data-note]').forEach(function(n){o['n_'+n.getAttribute('data-note')]=n.value;});document.querySelectorAll('.fu').forEach(function(f,i){o['fu_'+i]=f.checked;});return o;}"+
"function saveNotes(){try{var d=collectRaw();d.outcome=selectedOutcome;localStorage.setItem(STORE_KEY,JSON.stringify(d));}catch(e){}}"+
"function restoreNotes(){var s;try{s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');}catch(e){s=null;}if(!s)return;document.querySelectorAll('[data-note]').forEach(function(n){var k='n_'+n.getAttribute('data-note');if(s[k]!=null)n.value=s[k];});document.querySelectorAll('.fu').forEach(function(f,i){if(s['fu_'+i]!=null)f.checked=s['fu_'+i];});if(s.outcome){var chip=null;document.querySelectorAll('.outcome-chip').forEach(function(c){if(c.getAttribute('data-outcome')===s.outcome)chip=c;});if(chip)pickOutcome(chip);}}"+
"document.addEventListener('input',function(e){if(e.target.matches('[data-note], .fu'))saveNotes();});"+
"function gatherData(){var notes={};document.querySelectorAll('[data-note]').forEach(function(n){notes[n.getAttribute('data-note')]=n.value;});var fus=[];document.querySelectorAll('.fu:checked').forEach(function(f){fus.push(f.getAttribute('data-fu'));});return{guideId:CONFIG.guideId,company:CONFIG.company,prospect:CONFIG.prospect,leadId:CONFIG.leadId,crmName:CONFIG.crmName,loggedAt:new Date().toISOString(),outcome:selectedOutcome,notes:notes,followups:fus};}"+
"function buildLogText(d){var L=[];L.push('CALL LOG — '+d.prospect+' ('+d.company+')');L.push('Date: '+new Date(d.loggedAt).toLocaleString());if(d.outcome)L.push('Outcome: '+d.outcome);if(d.notes.account)L.push('Key name/account: '+d.notes.account);if(d.notes.nextstep)L.push('Next step: '+d.notes.nextstep);L.push('');Object.keys(SECTION_LABELS).forEach(function(k){if(d.notes[k]&&d.notes[k].trim())L.push('• '+SECTION_LABELS[k]+': '+d.notes[k].trim());});if(d.followups.length){L.push('');L.push('Follow-ups to send:');d.followups.forEach(function(f){L.push('  - '+f);});}return L.join('\\n');}"+
"/* ── CRM note door ── One wiring for both Log buttons. RELATIVE path on purpose: this page is\n   SERVED BY the Command Center (/api/cc/drive?mode=serve), so 'the site that served me' is not an\n   address and cannot go stale. Resolves capability crm/create_note (Neon capability registry,\n   Core §11 rule 4) through the existing door api/cc/leads {mode:note} — cookie-authed, fail-loud.\n   NEVER mode:no-cors: an opaque response resolves on 401/500, so the checkmark would be a lie. */"+
"function ccWhyNot(){if(String(location.protocol).indexOf('http')!==0)return 'this page was opened from a file, not from the Command Center';if(!CONFIG.leadId)return 'this guide has no CRM record attached';return '';}"+
"function ccLogNote(noteText){return fetch('/api/cc/leads',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'note',lead_id:CONFIG.leadId,note:noteText})}).then(function(r){return r.json().catch(function(){return{};}).then(function(j){if(r.ok&&j&&j.ok&&j.id)return{ok:true,id:j.id};if(r.status===401)return{ok:false,why:'you are signed out of the Command Center'};return{ok:false,why:'the CRM said '+r.status+((j&&j.error)?' ('+j.error+')':'')};});}).catch(function(e){return{ok:false,why:'could not reach the Command Center ('+((e&&e.message)||'network')+')'};});}"+

/* ── REFRESH DOOR ── The button that used to say "Use to regenerate ↗" and copy text to the
   clipboard. It now POSTs to /api/cc/call-refresh, which RECORDS the ask against this guide's
   kept state. Ruling D4, 2026-08-05, Bryce verbatim: "The user should never have to DO
   something extra they AI should be able to do for them."

   THE SENTENCE ON SCREEN IS THE DOOR'S OWN `say`, PRINTED VERBATIM AND NEVER REWRITTEN HERE.
   That is deliberate. Every earlier version of this button invented its own success text, and
   invented text is how a button ends up claiming a job that did not run. The door knows what
   actually happened; this function is a pipe, not an author. There is no branch below that can
   print a tick the door did not authorise.

   NEVER mode:'no-cors' — an opaque response resolves on a 401 or a 500, so the checkmark would
   be a lie. Same rule, same reason, as the note door directly above. */
"function cgRefreshNotes(){var m={};document.querySelectorAll('[data-note]').forEach(function(n){var k=n.getAttribute('data-note');var v=String(n.value||'').trim();if(k&&v)m[k]=v;});return m;}"+
"function cgRefreshSay(t,cls){var s=document.getElementById('log-status');if(s){s.textContent=t;s.className='log-status '+(cls||'');}}"+
"function cgRefresh(){var b=document.getElementById('cgr-btn');if(!CONFIG.docId){cgRefreshSay('This guide was built before guides carried an address, so it cannot ask to be updated.','warn');return;}if(String(location.protocol).indexOf('http')!==0){cgRefreshSay('Open this guide from your Command Center and one click will update it \\u2014 opened straight from the file on your Mac it has no way to sign in.','warn');return;}var notes=cgRefreshNotes();if(!Object.keys(notes).length){cgRefreshSay('Add a note first \\u2014 there is nothing to fold in yet.','warn');return;}cgRefreshSay('Sending your notes\\u2026');if(b)b.disabled=true;fetch('/api/cc/call-refresh',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({doc_id:CONFIG.docId,notes:notes})}).then(function(r){return r.json().catch(function(){return{};}).then(function(j){if(b)b.disabled=false;var said=(j&&j.say)?j.say:('The Command Center said '+r.status+'. Nothing was changed.');cgRefreshSay(said,(r.ok&&j&&j.ok)?'ok':'warn');});}).catch(function(e){if(b)b.disabled=false;cgRefreshSay('Could not reach the Command Center ('+((e&&e.message)||'network')+'). Nothing was changed.','warn');});}"+
"function logTheCall(){var d=gatherData();var text=buildLogText(d);var status=document.getElementById('log-status');var btn=document.getElementById('log-btn');function fell(why){copyToClipboard(text).then(function(ok){status.classList.add('warn');status.textContent=ok?('Copied to your clipboard'+(why?' — '+why:'')+'. Paste it into Claude to log it.'):('Could not save or copy'+(why?' — '+why:'')+' — select the text manually.');});}var no=ccWhyNot();if(no){fell(no);return;}status.classList.remove('warn');status.textContent='Saving to your CRM…';ccLogNote(text).then(function(r){if(r.ok){status.classList.remove('warn');status.textContent='✓ Saved to your CRM';btn.classList.add('ok');btn.firstChild.textContent='Logged ✓';return;}fell(r.why);});}"+
"function copyToClipboard(text){return navigator.clipboard.writeText(text).then(function(){return true;}).catch(function(){try{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}});}"+
"function lcnMissing(){var miss=[];if(!selectedOutcome)miss.push('Call outcome');var ns=document.querySelector('[data-note=nextstep]');if(!ns||!ns.value.trim())miss.push('Next step');var cn=document.querySelector('.closenote');if(!cn||!cn.value.trim())miss.push('Close notes');return miss;}"+
"function flagMissing(on){var ns=document.querySelector('[data-note=nextstep]');var cn=document.querySelector('.closenote');[ns,cn].forEach(function(n){if(n)n.classList.toggle('miss',!!on&&!n.value.trim());});}"+
"function openLog(){var miss=lcnMissing();if(miss.length){var ul=document.getElementById('logMissList');ul.innerHTML='';miss.forEach(function(m){var li=document.createElement('li');li.textContent=m;ul.appendChild(li);});flagMissing(true);document.getElementById('logOv').classList.add('show');return;}lcnOpen();}"+
"function closeLogOv(){document.getElementById('logOv').classList.remove('show');var c=document.querySelector('.closenote');if(c){var s=c.closest('.section');if(s){s.classList.add('open');s.scrollIntoView({behavior:'smooth',block:'center'});}}}"+
"function forceLog(){document.getElementById('logOv').classList.remove('show');flagMissing(false);lcnOpen();}"+
"var LCN_TRANS=false;"+
"function lcnTrans(v){LCN_TRANS=v;document.getElementById('lcnTyes').classList.toggle('lcn-on',v);document.getElementById('lcnTno').classList.toggle('lcn-on',!v);document.getElementById('lcnTransHint').style.display=v?'block':'none';}"+
"function lcnOpen(){document.getElementById('lcnWho').textContent='Call with '+CONFIG.prospect+' \\u00b7 '+CONFIG.company;document.getElementById('lcnNotes').value=buildLogText(gatherData());document.getElementById('lcnExtra').value='';lcnTrans(false);var s=document.getElementById('lcnStatus');s.textContent='';s.className='lcn-status';document.getElementById('lcnOv').classList.add('show');setTimeout(function(){document.getElementById('lcnNotes').focus();},60);}"+
"function lcnClose(){document.getElementById('lcnOv').classList.remove('show');}"+
"function lcnTextOut(){var n=document.getElementById('lcnNotes').value.trim(),x=document.getElementById('lcnExtra').value.trim();var L=['CALL LOG \\u2014 '+CONFIG.prospect+' ('+CONFIG.company+')','Date: '+new Date().toLocaleString()];if(LCN_TRANS)L.push('\\u23f3 Transcript pending \\u2014 debrief to follow');L.push('');L.push(n);if(x){L.push('');L.push('Extra: '+x);}return L.join('\\n');}"+
"function lcnCopyFallback(txt,st,why){copyToClipboard(txt).then(function(ok){var tail=why?(' — '+why):'';if(ok){st.textContent='Copied to your clipboard'+(LCN_TRANS?' · transcript pending':'')+tail+'. Paste it into Claude to log it.';st.className='lcn-status warn';}else{st.textContent='Could not save or copy'+tail+' — select the text manually.';st.className='lcn-status warn';}});}"+
"function lcnSave(){var st=document.getElementById('lcnStatus');var sb=document.getElementById('lcnSave');if(!document.getElementById('lcnNotes').value.trim()){st.textContent='Add your call notes first.';st.className='lcn-status warn';return;}var txt=lcnTextOut();var no=ccWhyNot();if(no){lcnCopyFallback(txt,st,no);return;}st.textContent='Saving to your CRM…';st.className='lcn-status';if(sb)sb.disabled=true;ccLogNote(txt).then(function(r){if(sb)sb.disabled=false;if(r.ok){st.textContent='✓ Saved to your CRM'+(LCN_TRANS?' · transcript pending':'');st.className='lcn-status ok';setTimeout(lcnClose,1500);return;}lcnCopyFallback(txt,st,r.why);});}"+
"restoreNotes();";

/* ══ Quick-access ASPECTS — the WORDS LIVE IN ONE FILE, NOT HERE ══
   Static, jump-to reference Bryce hits mid-call instead of flipping
   between docs. Each aspect: a LEAD line he says then STOPS, deeper
   tiers he opens only on a lean-in, punchy "ah-ha" hooks, and a stop
   rule.

   ONE HOME (Bryce's ruling, 2026-08-04). These words used to be a
   literal object right here, and Call-Guide-Content-SPEC-v1.0 §6 told
   everyone to keep this copy and the spec's copy in sync BY HAND. That
   convention is what let a retired throughline sentence ship inside a
   builder for a day and take edits in three separate files to remove.
   The words now live in exactly one place:

     02 — Clients/AI Integrator/sales/AI Integrator - Call Guide Aspects.md

   ...and this builder READS it at build time. Change a word once and
   every new guide gets it. Registered in Neon `asset_template`
   (tenant bryce, channel call), one row per anchor in that file.
   Shape + throttle rules are still governed by
   04 — Daily Operating System/specs/Call-Guide-Content-SPEC-v1.0.md §4.

   guide.json may still pass its own `aspects` object to override per
   prospect; otherwise the file above renders on every guide. */

const path = require('path');

/* The address is RESOLVED AT RUN TIME, never baked: env override first, then
   walk up from this script's own directory until the workspace-relative path
   exists. A literal absolute path would keep resolving after the tree moved
   and answer confidently about a file nobody edits. */
const ASPECTS_REL = ['02 — Clients', 'AI Integrator', 'sales', 'AI Integrator - Call Guide Aspects.md'];
const ASPECTS_REQUIRED_IDS = ['asp-bg', 'asp-ai', 'asp-vr', 'asp-diff'];

function resolveAspectsPath() {
  const override = process.env.AII_CALL_GUIDE_ASPECTS;
  if (override) {
    /* An override that does not exist must say SO, naming the variable that set it.
       A bare ENOENT reports what failed and leaves the reader to guess why — and the
       likeliest guess (the file is gone) is wrong when the real cause is a stale env var. */
    if (!fs.existsSync(override)) {
      throw new Error('build-call-guide: AII_CALL_GUIDE_ASPECTS is set to "' + override +
        '" and no file is there. Unset it to fall back to the workspace copy, or point it at ' +
        ASPECTS_REL.join('/') + '. Refusing to build a guide with no Quick-access words in it.');
    }
    return override;
  }
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const cand = path.join.apply(path, [dir].concat(ASPECTS_REL));
    if (fs.existsSync(cand)) return cand;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/* Markdown -> the aspects object. Mirror of the emitter that produced the file;
   the migration was proven by an exact round-trip (object -> markdown -> object)
   plus a byte-identical HTML build against the pre-migration builder. */
function parseAspectsMarkdown(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const A = { title: '', howToUse: '', items: [] };
  let cur = null, field = null, buf = [];

  function flush() {
    if (!field) { buf = []; return; }
    const body = buf.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    if (field === 'title') A.title = body;
    else if (field === 'howToUse') A.howToUse = body;
    else if (field === 'lead') cur.lead = body;
    else if (field === 'stop') cur.stop = body;
    else if (field === 'hooks') cur.hooks = body.split('\n').map(function (s) { return s.replace(/^-\s*/, '').trim(); }).filter(Boolean);
    else if (field && field.tier) cur.tiers.push({ label: field.tier, body: body });
    field = null; buf = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const head = line.match(/^##\s*<a id="([^"]+)"><\/a>(\S+)\s+(.+?)\s*$/);
    if (head) { flush(); cur = { id: head[1], icon: head[2], label: head[3], lead: '', tiers: [], hooks: [], stop: '' }; A.items.push(cur); continue; }
    if (/^---\s*$/.test(line)) { flush(); continue; }
    if (/^\*\*TITLE:\*\*\s*$/.test(line))      { flush(); field = 'title';    continue; }
    if (/^\*\*HOW TO USE:\*\*\s*$/.test(line)) { flush(); field = 'howToUse'; continue; }
    if (/^\*\*LEAD:\*\*\s*$/.test(line))       { flush(); field = 'lead';     continue; }
    if (/^\*\*STOP:\*\*\s*$/.test(line))       { flush(); field = 'stop';     continue; }
    if (/^\*\*HOOKS:\*\*\s*$/.test(line))      { flush(); field = 'hooks';    continue; }
    const tier = line.match(/^\*\*TIER — (.+?)\*\*\s*$/);
    if (tier) { flush(); field = { tier: tier[1] }; continue; }
    if (field) buf.push(line);
  }
  flush();
  return A;
}

/* FAILS LOUD, never quietly generic (Nygard). A missing or half-parsed file would
   otherwise render a guide with an empty drawer — a guide missing the entire pitch,
   which looks exactly like a guide that never had one. */
let _aspectsCache = null;
function loadDefaultAspects() {
  if (_aspectsCache) return _aspectsCache;
  const p = resolveAspectsPath();
  if (!p) {
    throw new Error('build-call-guide: cannot resolve "' + ASPECTS_REL.join('/') +
      '" walking up from ' + __dirname + '. Set AII_CALL_GUIDE_ASPECTS to its full path. ' +
      'That file holds the Quick-access words; building without it would ship a guide with no pitch in it.');
  }
  const A = parseAspectsMarkdown(fs.readFileSync(p, 'utf8'));
  const ids = ((A && A.items) || []).map(function (x) { return x.id; });
  const missing = ASPECTS_REQUIRED_IDS.filter(function (id) { return ids.indexOf(id) < 0; });
  if (!A.title || !A.howToUse || missing.length) {
    throw new Error('build-call-guide: parsed ' + ids.length + ' aspects from ' + p +
      (missing.length ? ' — MISSING required id(s): ' + missing.join(', ') : '') +
      (!A.title ? ' — missing TITLE' : '') + (!A.howToUse ? ' — missing HOW TO USE' : '') +
      '. Call-Guide-Content-SPEC-v1.0 §4.1 requires the four-aspect set; refusing to build a partial drawer.');
  }
  _aspectsCache = A;
  return A;
};

/* ── aspects CSS (appended to STANDALONE_CSS) ── */
const ASPECTS_CSS = ".aspects-drawer{max-width:820px;margin:14px auto 0;background:#fff;border:1px solid #e5e5ef;border-radius:10px;overflow:hidden}.asp-drawer-head{padding:12px 18px;cursor:pointer;display:flex;align-items:center;gap:10px;user-select:none;background:#0d0d24}.asp-drawer-head:hover{background:#161636}.asp-drawer-title{flex:1;font-size:.82rem;font-weight:700;color:#fff;letter-spacing:.02em}.asp-drawer-head .chevron{color:#a5a5c0;font-size:.7rem;transition:transform .2s}.aspects-drawer.open .asp-drawer-head .chevron{transform:rotate(180deg)}.asp-drawer-body{display:none;padding:14px 16px}.aspects-drawer.open .asp-drawer-body{display:block}.asp-howto{background:#fff7ed;border-left:3px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:.78rem;color:#7c2d12;line-height:1.55}.asp-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.asp-chip{padding:6px 13px;border-radius:99px;font-size:.76rem;font-weight:700;border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;cursor:pointer;transition:all .15s}.asp-chip:hover{background:#4f46e5;color:#fff;border-color:#4f46e5}.asp-cards{display:flex;flex-direction:column;gap:8px}.asp-card{border:1px solid #e5e5ef;border-radius:9px;overflow:hidden}.asp-card.open{border-color:#4f46e5;box-shadow:0 0 0 1px #4f46e540}.asp-head{padding:11px 14px;cursor:pointer;display:flex;align-items:center;gap:9px;user-select:none}.asp-head:hover{background:#f5f5fa}.asp-icon{color:#4f46e5;font-size:.8rem}.asp-label{flex:1;font-size:.85rem;font-weight:700;color:#0d0d24}.asp-card .chevron{color:#b5b5c8;font-size:.7rem;transition:transform .2s}.asp-card.open .chevron{transform:rotate(180deg)}.asp-body{display:none;padding:0 14px 14px;border-top:1px solid #eef0f7}.asp-card.open .asp-body{display:block}.asp-lead{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 15px;margin:12px 0;font-size:.9rem;line-height:1.6;color:#1e1b4b;font-weight:600}.asp-lead::before{content:'SAY THIS FIRST — THEN STOP';display:block;font-size:.6rem;font-weight:700;letter-spacing:.06em;color:#6366f1;margin-bottom:6px}.asp-tier{border:1px solid #e5e5ef;border-radius:7px;margin:8px 0;overflow:hidden}.asp-tier-head{padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:600;color:#4338ca;background:#fafaff;user-select:none}.asp-tier-head:hover{background:#f0f0ff}.asp-caret{margin-left:auto;transition:transform .2s;color:#9a9ab0}.asp-tier.open .asp-caret{transform:rotate(90deg)}.asp-tier-body{display:none;padding:11px 13px;font-size:.82rem;line-height:1.6;color:#33334d}.asp-tier.open .asp-tier-body{display:block}.asp-hooks{margin:12px 0;padding:11px 13px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px}.asp-hooks-lbl{font-size:.62rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#059669;margin-bottom:6px}.asp-hook{font-size:.84rem;line-height:1.55;color:#065f46;font-weight:600;padding:5px 0;border-top:1px dashed #a7f3d0}.asp-hook:first-of-type{border-top:none;padding-top:0}.asp-stop{margin-top:12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;padding:9px 13px;font-size:.76rem;color:#991b1b;line-height:1.5}.asp-stop strong{display:block;font-size:.64rem;letter-spacing:.05em;text-transform:uppercase;color:#dc2626;margin-bottom:2px}";

/* ── aspects runtime (appended to STANDALONE_RUNTIME) ── */
const ASPECTS_RUNTIME =
"function toggleAspDrawer(){var d=document.getElementById('aspectsDrawer');if(d)d.classList.toggle('open');}" +
"function toggleAsp(id){var c=document.getElementById(id);if(c)c.classList.toggle('open');}" +
"function toggleTier(tid){var t=document.getElementById(tid);if(t)t.classList.toggle('open');}" +
"function jumpAspect(id){var d=document.getElementById('aspectsDrawer');if(d)d.classList.add('open');var c=document.getElementById(id);if(c){c.classList.add('open');c.scrollIntoView({behavior:'smooth',block:'start'});}}";

/* ── aspects HTML builder ── */
function buildAspectsHtml(g) {
  const A = (g && g.aspects) || loadDefaultAspects();
  if (!A || !A.items || !A.items.length) return '';
  const chips = A.items.map(function (a) {
    return '<button class="asp-chip" onclick="jumpAspect(\'' + esc(a.id) + '\')">' + esc(a.label) + '</button>';
  }).join('');
  const cards = A.items.map(function (a) {
    const tiers = (a.tiers || []).map(function (t, i) {
      const tid = esc(a.id) + '-t' + i;
      return '<div class="asp-tier" id="' + tid + '"><div class="asp-tier-head" onclick="toggleTier(\'' + tid + '\')"><span>' + esc(t.label) + '</span><span class="asp-caret">▸</span></div><div class="asp-tier-body">' + richAnswer(t.body) + '</div></div>';
    }).join('');
    const hooks = (a.hooks && a.hooks.length)
      ? '<div class="asp-hooks"><div class="asp-hooks-lbl">Ah-ha lines</div>' + a.hooks.map(function (h) { return '<div class="asp-hook">' + richAnswer(h) + '</div>'; }).join('') + '</div>'
      : '';
    const stop = a.stop ? '<div class="asp-stop"><strong>Stop</strong>' + esc(a.stop) + '</div>' : '';
    return '<div class="asp-card" id="' + esc(a.id) + '"><div class="asp-head" onclick="toggleAsp(\'' + esc(a.id) + '\')"><span class="asp-icon">' + esc(a.icon || '◆') + '</span><span class="asp-label">' + esc(a.label) + '</span><span class="chevron">▼</span></div><div class="asp-body"><div class="asp-lead">' + richAnswer(a.lead) + '</div>' + tiers + hooks + stop + '</div></div>';
  }).join('');
  return '<div class="aspects-drawer" id="aspectsDrawer"><div class="asp-drawer-head" onclick="toggleAspDrawer()"><span class="asp-drawer-title">' + esc(A.title || 'Quick-access') + '</span><span class="chevron">▼</span></div><div class="asp-drawer-body">' +
    (A.howToUse ? '<div class="asp-howto">' + richAnswer(A.howToUse) + '</div>' : '') +
    '<div class="asp-chips">' + chips + '</div><div class="asp-cards">' + cards + '</div></div></div>';
}


/* ════════════════════════════════════════════════════════════════════════════
   THE COVERAGE BOARD — the LIVE call guide.
   Added 2026-08-07.

   ── WHAT THIS IS, AND THE TWO RULINGS IT OBEYS ────────────────────────────────
   SHAPE, from `dr_calls_call_guide_layout_live_mode_20260807` — Bryce ruled it from a
   prototype he CLICKED (`board-v6.html`, 2026-08-07 22:13 Boise), not from an option list:
     1. NUMBERING IS REMOVED. His calls never run 1..N; a step number asserts an order the
        call never follows. Nothing in this module emits an index.
     2. POSITION IS COVERAGE, NOT SEQUENCE. A per-item covered tick, a running count, and a
        PERMANENT "Close: not yet" marker — his named leak is that he rarely reaches the
        hook and the close because they sit last behind the objection wall.
     3. THE BOARD NEVER SCROLLS AWAY. Its own sticky scroll region, collapsible lane
        headings, independent of the reading pane.
     4. THE CARD IS A 50/50 SPLIT. The words own the left; when/why/do/don't sit in a right
        rail that collapses to a 30px vertical NOTES strip you click to bring back — it does
        NOT vanish, because an affordance you cannot find is a removed one.
     5. ADVISOR NAMES ARE STRIPPED from the live view. `lens` is carried and never rendered.
        ⚠ Whether advisor names may appear in CLIENT-FACING deliverables is UNRULED — Bryce
        raised it 2026-08-07 as possible IP exposure. Do not "fix" this by putting the name
        back; that question has not been answered.
     6. THE PRE-CALL LAYER STAYS, reachable WITHOUT SCROLLING — brief, at-a-glance,
        watch-outs and links.
        ⚠ RE-CUT BY BRYCE 2026-08-07, AFTER seeing this built: they are NOT drawers above
        the board. They are ROWS IN THE RAIL, and they open in the SAME main frame as
        everything else — *"all of those can collapse on the left and content in the
        middle... everything expands into the same main."* Quick-access went with them,
        and its four aspects became FOUR ROWS rather than one (his option (a)), so mid-call
        he is one click from VisitorResolve instead of two. The original wording is kept
        above because a session that only read the ruling would rebuild the drawers.

   CONTENT, from `dr_OPEN_does_a_call_guide_section_author_five_fields_or_two_prose_blobs_20260807`
   — ruled by Bryce 2026-08-07 with one word, "go", taking option (b): a section AUTHORS
   when · why · do · dont · words as FIVE SEPARATE FIELDS. `do` and `dont` are LISTS.

   ── ⚠ THE PROTOTYPE'S PAINT WAS INVENTED. MEASURED, NOT SUSPECTED. ────────────
   Bryce's condition on the layout ruling was "as long as it uses command center canonical
   registered components," and he restated it mid-build: *"It must remain canonical to the
   registered components. I hope they were registered. Of the command center as the command
   center exists now, do not invent anything."*

   The live Command Center was decoded and counted (`api/cc/terminal-html.js` → 1,105,898
   chars; positive control `CC-SHELL-v` found 45×, so a zero below is a real zero and not a
   failed read — the file is BASE64 and a raw grep returns zero for every real token, which
   is the trap that caused every recorded CC drift incident):

     · SEVEN of board-v6's nine hex colours occur ZERO times in the Command Center —
       #065f46 #7c4a06 #912018 #a5a5c0 #b7e4cb #f3dfae #f4c9c4.
     · TWENTY of its twenty-seven class names occur ZERO times — .tile .rb .rcol .words
       .chd .kv .cap .split .mic .lane-h and ten more.
     · Its 25 design TOKENS are exact. That is why it looks like the app at a glance, and
       it is what made the invented half invisible.

   So the prototype is the right SHAPE decided by the right person, wearing paint nobody
   registered. This module keeps the shape and throws the paint away.

   ── HOW THAT IS ENFORCED HERE, STRUCTURALLY RATHER THAN BY CARE ───────────────
   `CC` below is the cc_component table, transcribed once. Every visual rule this module
   emits is BUILT BY CONCATENATING `CC.cls[...]` — the registry's own `css` column,
   verbatim — never by retyping its contents. That is the difference between a stylesheet
   that agrees with the store today and one that cannot disagree with it:
     · a token typed twice is a second opinion waiting to disagree
       ([[the-unit-decides-the-column-not-the-number]]);
     · `STANDALONE_CSS` above still hardcodes `#00d4aa`, the mint RETIRED 2026-07-28 for
       measuring 1.9:1 on white, and it has been wrong on disk ever since precisely because
       it was typed instead of derived.
   The only rules written by hand are LAYOUT — grid, sticky, overflow, the 50/50 split —
   and they carry no colour, no radius and no type size that is not a var() or a registered
   value. `checkBoardIsCanonical()` at the foot of this file goes RED on any hex literal
   outside the registry block, and the builder REFUSES to write a guide if it does.

   MAPPING — every visual atom to the registered component whose ROLE already matches:
     board row .............. .room / .room.active   ("a row in the left rail" — verbatim)
     lane heading ........... .panel h2              (the eyebrow heading on a panel)
     board container ........ .panel + .stackhead + .stackhead .ctx
     the open item .......... .card + .card .title + .card .why + .card .row1 + .corner
     words box, rail blocks . .scard  (+ a status wash for when/why/do/don't)
     covered tick ........... .cicon                 (the tiny inline control on a card)
     kind tag / counters .... .badge  /  .u-pill
     every button ........... .btn + primary/ghost/done/mute
     the notes box + mic .... markup row `mic-in-a-text-box`, verbatim
     the drawers ............ behavior row `disclosure` (native details/summary)

   ── THE ONE THING DELIBERATELY DROPPED, AND WHY IT IS NOT AN OVERSIGHT ────────
   The prototype's dark top bar. `--brand-bar` is registered; **no token for text sitting on
   it is.** board-v6 invented `#a5a5c0`. Inventing a replacement is the exact thing Bryce
   just forbade, so the header is `.panel` + `.panel h2` + `.stackhead`, all registered.
   If the dark bar comes back, the on-dark ink gets REGISTERED first.

   ── AND ONE FINDING THAT IS ABOUT THE APP, NOT ABOUT THIS FILE ────────────────
   The Command Center itself uses `#1d1d38` seven times — a near-black that is not `--ink`
   (#0d0d24) and is registered nowhere. That is drift IN the app. It is carded, not copied.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── cc_component, transcribed once. ONE fact, ONE place in this file. ──────────
   Read 2026-08-07 from Neon: SELECT kind,name,css,role,status FROM cc_component
   WHERE tenant_id='bryce' AND surface='command-center' AND status<>'retired'.
   `.tri` is deliberately absent: status='drifted', zero CSS rules, 22 uses, every one
   styled by a repeated inline string. It looks like a button class and it is not. */
const CC = {
  tok: {
    '--bg': '#F5F5FA', '--panel': '#ffffff', '--ink': '#0d0d24', '--muted': '#6B6B9A',
    '--line': '#E2E2F0', '--accent': '#4f46e5', '--accent-soft': '#eceaff',
    '--teal': '#0a9c7f', '--amber': '#f59e0b', '--red': '#e0464b', '--red-soft': '#fdeaea',
    '--chip': '#F0EFFF', '--brand-bar': '#0D0D24',
    '--font-display': '"Space Grotesk","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    '--font-body': '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    '--st-active-fg': '#4F46E5', '--st-active-bg': '#ECEAFF',
    '--st-blocked-fg': '#B42318', '--st-blocked-bg': '#FEF3F2',
    '--st-unv-fg': '#B9760A', '--st-unv-bg': '#FFFAEB',
    '--st-verified-fg': '#067647', '--st-verified-bg': '#ECFDF3',
    '--st-delivered-fg': '#344054', '--st-delivered-bg': '#F2F4F7',
  },
  cls: {
    '.btn': "font-size:12px;font-weight:600;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;padding:5px 12px;cursor:pointer",
    '.btn:hover': "background:var(--bg)",
    '.btn.primary': "background:var(--accent);color:var(--panel);border-color:var(--accent)",
    '.btn.ghost': "background:var(--panel);color:var(--accent);border:1px solid var(--accent)",
    '.btn.done': "background:var(--teal);color:var(--panel);border-color:var(--teal)",
    '.btn.mute': "padding:4px 9px;font-size:12px",
    '.btn:disabled': "opacity:.5;cursor:default",
    '.scard': "background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px",
    '.scard h3': "margin:0 0 6px;font-size:13px;font-weight:700;color:var(--ink)",
    '.scard .small': "font-size:12px;margin:0 0 10px",
    '.panel': "background:var(--panel);border:1px solid var(--line);border-radius:12px",
    '.panel h2': "font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);margin:0;padding:12px 14px 8px",
    '.card': "border:1px solid var(--line);border-radius:11px;padding:12px 13px;background:var(--panel);position:relative",
    '.card .title': "font-weight:600;font-size:13.5px;margin:1px 0 3px",
    '.card .why': "color:var(--muted);font-size:12.5px;margin-bottom:6px",
    '.card .row1': "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px",
    '.card .row1 .corner': "margin-left:auto;display:flex;align-items:center;gap:6px",
    '.cards': "padding:0 12px 12px;display:flex;flex-direction:column;gap:10px",
    '.badge': "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:2px 7px;border-radius:6px;background:var(--accent-soft);color:var(--accent)",
    '.u-pill': "font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px",
    '.meta': "display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--muted);margin-top:6px",
    '.hdr': "margin:6px 0 4px;display:flex;flex-direction:column;gap:2px",
    '.cicon': "border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:7px;font-size:10px;font-weight:600;padding:2px 7px;cursor:pointer;line-height:1.5",
    '.stackhead': "display:flex;align-items:baseline;justify-content:space-between;padding:12px 14px 8px",
    '.stackhead .ctx': "font-size:11px;color:var(--muted)",
    '.room': "display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 14px;cursor:pointer;border-left:3px solid transparent;color:var(--ink)",
    '.room.active': "background:var(--accent-soft);border-left-color:var(--accent);font-weight:600",
  },
  /* behavior row `disclosure` — the CC's summary style, verbatim */
  summary: "cursor:pointer;font-size:12.5px;color:var(--accent);font-weight:600;padding:9px 2px",
  /* the four NAMED type sizes (markup row `type-scale`). FORWARD-ONLY RULE: a new piece
     uses named sizes only; a NEW size must be NAMED in cc_component BEFORE it is built. */
  type: { eyebrow: '11px', caption: '11.5px', reading: '12.5px', form: '13px' },
};

/* the :root block — GENERATED from CC.tok, so it cannot drift from the store. */
const CC_TOKENS_CSS = ':root{' +
  Object.keys(CC.tok).map(function (k) { return k + ':' + CC.tok[k]; }).join(';') + '}';

/* the registered components — GENERATED from CC.cls, namespaced under `.cgb` so this can
   sit beside the older shell, which already owns bare .btn/.badge/.card/.tag and means
   different things by all four. An un-namespaced paste would silently restyle the log modal. */
const CC_CLASSES_CSS = Object.keys(CC.cls).map(function (sel) {
  /* `.btn:hover` and `.room.active` must keep their compound form under the namespace */
  return '.cgb ' + sel + '{' + CC.cls[sel] + '}';
}).join('');

/* ── LAYOUT ONLY. No colour, no radius and no type size that is not a var() or a value
      already registered above. This is the whole hand-written surface; everything visible
      comes from CC.cls. ── */
const BOARD_CSS = CC_TOKENS_CSS + CC_CLASSES_CSS +
".cgb{font-family:var(--font-body);font-size:" + CC.type.form + ";line-height:1.5;background:var(--bg);color:var(--ink)}" +
".cgb *{box-sizing:border-box}" +
".cgb h1,.cgb h2,.cgb h3{font-family:var(--font-display)}" +
/* 6 — the reference rows live in the RAIL now; the drawer row is gone. */
".cgb-kv{margin-bottom:10px}" +
".cgb-kv i{display:block;font-style:normal;font-size:" + CC.type.eyebrow + ";font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:2px}" +
".cgb-kv span{font-size:" + CC.type.reading + ";line-height:1.55;color:var(--ink)}" +
/* 3 — board and pane, two independent scroll regions */
".cgb-wrap{display:grid;grid-template-columns:288px minmax(0,1fr);gap:12px;padding:12px;max-width:1700px;margin:0 auto;align-items:start}" +
/* ── THE BOARD MUST STOP ABOVE THE FIXED LOG BAR ─────────────────────────────────
   Fixed 2026-08-11 from Bryce's screenshot: the last row of the left board sat
   UNDERNEATH the fixed "Capture as you go" bar and could not be scrolled into view —
   the only way to reach it was to scroll the whole page instead, which defeats the
   point of a sticky board.

   The cause: this element reserved the full viewport (100vh - 24px) while `.log-bar`
   is position:fixed at the bottom and covers roughly 96px of it. The board's own
   scrollbar therefore reached its end with its last item still hidden.

   96px is NOT a new number — `body{padding-bottom:96px}` in STANDALONE_CSS already
   reserves exactly this for exactly this bar, so the two now agree instead of one of
   them silently disagreeing. The extra bottom padding is so the final row clears the
   bar's shadow rather than tucking against it. */
".cgb-board{position:sticky;top:12px;max-height:calc(100vh - 120px);overflow-y:auto;overscroll-behavior:contain;padding-bottom:12px}" +
".cgb-board::-webkit-scrollbar{width:7px}.cgb-board::-webkit-scrollbar-thumb{background:var(--line);border-radius:20px}" +
".cgb-lane .cgb-lanehead{cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px}" +
".cgb-lane .cgb-lanehead:after{content:'\\25BE';margin-left:auto;transition:transform .15s;display:inline-block}" +
".cgb-lane.shut .cgb-lanehead:after{transform:rotate(-90deg)}" +
".cgb-lane.shut .cgb-room{display:none}" +
".cgb-lanehint{display:block;text-transform:none;letter-spacing:0;font-weight:400;font-size:" + CC.type.caption + ";font-family:var(--font-body)}" +
/* 2 — coverage. `.room.covered` is the ONE state class this module adds, and it is
   composed entirely of registered status tokens. */
".cgb .cgb-room.covered{background:var(--st-verified-bg);border-left-color:var(--teal)}" +
".cgb .cgb-room.covered .cgb-roomlabel b{color:var(--st-verified-fg);text-decoration:line-through;text-decoration-thickness:1px}" +
".cgb-roomlabel{flex:1;min-width:0}" +
".cgb-roomlabel b{display:block;font-size:" + CC.type.form + ";font-weight:600;line-height:1.3}" +
".cgb-roomlabel em{display:block;font-style:normal;font-size:" + CC.type.caption + ";color:var(--muted);line-height:1.35}" +
/* flex-shrink:0 + nowrap added 2026-08-11. The routing fix above stops prose reaching
   this slot; this stops prose DESTROYING the row if it ever does again. Without it the
   duration chip competes with the title for width and the title — correctly carrying
   min-width:0 — is the one that loses. Two defences on purpose: the first keeps the
   content right, the second keeps the layout survivable when the content is not. */
".cgb-mins{font-style:normal;font-size:" + CC.type.eyebrow + ";color:var(--muted);flex-shrink:0;white-space:nowrap;max-width:40%;overflow:hidden;text-overflow:ellipsis}" +
".cgb .cgb-tick{flex-shrink:0}" +
".cgb .cgb-room.covered .cgb-tick{background:var(--st-verified-bg);border-color:var(--teal);color:var(--st-verified-fg)}" +
/* the reading pane */
".cgb-pane .cgb-card{display:none}.cgb-pane .cgb-card.show{display:block}" +
/* 4 — the 50/50 split, and the approved collapse-to-a-NOTES-strip */
".cgb-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start;transition:grid-template-columns .18s}" +
".cgb-split.norail{grid-template-columns:minmax(0,1fr) 30px}" +
".cgb-split.norail .cgb-rb{display:none}" +
".cgb-split.norail .cgb-rail{cursor:pointer;align-items:center;justify-content:center;min-height:200px;gap:0;padding:0;background:var(--bg);border:1px solid var(--line);border-radius:8px}" +
".cgb-split.norail .cgb-rail:hover{background:var(--chip);border-color:var(--accent)}" +
".cgb-split.norail .cgb-rail:after{content:'NOTES';writing-mode:vertical-rl;font-size:" + CC.type.eyebrow + ";font-weight:700;letter-spacing:.7px;color:var(--muted)}" +
/* THE WORDS. `.scard` is the box; only the paragraph rhythm is written here.
   13px is the largest NAMED size (type-scale `form`). ⚠ Bryce has NOT ruled whether that
   is big enough to read mid-call with a video window in front of it. If it is not, the fix
   is to NAME a new size in cc_component and rebuild — never to type a bigger number here. */
".cgb-words p{font-size:" + CC.type.form + ";line-height:1.75;color:var(--ink);margin:0 0 10px}" +
".cgb-words p:last-child{margin-bottom:0}" +
".cgb-rail{display:flex;flex-direction:column;gap:8px}" +
/* the four rail blocks ARE .scard plus a registered status wash. Nothing new. */
".cgb-rb{padding:10px 12px;font-size:" + CC.type.reading + ";line-height:1.5}" +
".cgb-rb i{display:block;font-style:normal;font-size:" + CC.type.eyebrow + ";font-weight:700;letter-spacing:.7px;margin-bottom:4px}" +
".cgb-rb.when{background:var(--st-unv-bg);color:var(--st-unv-fg)}" +
".cgb-rb.why{background:var(--st-delivered-bg);color:var(--st-delivered-fg)}" +
".cgb-rb.do{background:var(--st-verified-bg);color:var(--st-verified-fg)}" +
".cgb-rb.dont{background:var(--st-blocked-bg);color:var(--st-blocked-fg)}" +
".cgb-rb ul{list-style:none;margin:0;padding:0}" +
".cgb-rb li{margin-bottom:4px;padding-left:13px;position:relative}" +
".cgb-rb.do li:before{content:'\\25B8';position:absolute;left:0}" +
".cgb-rb.dont li:before{content:'\\2715';position:absolute;left:0;font-size:" + CC.type.eyebrow + "}" +
/* the degraded marker — the UNVERIFIED status pair, which is exactly what it means */
".cgb-oldshape{background:var(--st-unv-bg);color:var(--st-unv-fg);border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:" + CC.type.caption + ";line-height:1.5;margin-bottom:10px}" +
".cgb .cgb-ref{border-left-color:var(--chip)}" +
".cgb .cgb-ref.active{background:var(--accent-soft);border-left-color:var(--accent)}" +
/* §4.3 rule 1 — the lead line is the always-visible tier */
".cgb-lead{background:var(--accent-soft);color:var(--ink);font-weight:600;margin-bottom:8px}" +
".cgb-lead i{display:block;font-style:normal;font-size:' + CC.type.eyebrow + ';font-weight:700;letter-spacing:.7px;color:var(--accent);margin-bottom:6px}" +
/* §4.3 rule 2 — tiers collapsed, opened only on a lean-in. Registered `disclosure`. */
".cgb-tiers{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}" +
".cgb-tier{padding:0 14px}" +
".cgb-tier summary{' + CC.summary + ';list-style:none}" +
".cgb-tier summary::-webkit-details-marker{display:none}" +
".cgb-tier summary::before{content:'\\25B8\\00a0'}" +
".cgb-tier[open] summary::before{content:'\\25BE\\00a0'}" +
".cgb-tierbody{font-size:' + CC.type.reading + ';line-height:1.6;color:var(--ink);padding-bottom:12px}" +
".cgb-cap{margin-top:12px}" +
".cgb-cap label{display:block;font-size:" + CC.type.eyebrow + ";font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:5px}" +
/* markup row `mic-in-a-text-box` — the 40px RIGHT padding is load-bearing: it keeps typed
   text out from under the mic. Do not drop it. */
".cgb-tawrap{position:relative}" +
".cgb-tawrap textarea{width:100%;min-height:58px;border:1px solid var(--line);border-radius:8px;padding:8px 40px 8px 8px;font:inherit;font-size:" + CC.type.form + ";line-height:1.5;resize:vertical;color:var(--ink);background:var(--panel)}" +
".cgb-tawrap textarea:focus{outline:none;border-color:var(--accent)}" +
".cgb-mic{position:absolute;top:6px;right:6px;border:1px solid var(--line);background:var(--panel);border-radius:7px;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1;padding:0}" +
".cgb-hint{color:var(--muted);font-size:" + CC.type.reading + ";line-height:1.7}" +
".cgb-sp{flex:1}" +
"@media(max-width:880px){" +
".cgb-wrap{grid-template-columns:minmax(0,1fr);padding:8px}" +
".cgb-board{position:static;max-height:none;overflow:visible}" +
".cgb-split,.cgb-split.norail{grid-template-columns:minmax(0,1fr)}" +
".cgb-split.norail .cgb-rb{display:block}" +
".cgb-split.norail .cgb-rail{background:none;border:0;min-height:0;padding:0}" +
".cgb-split.norail .cgb-rail:after{content:none}" +
"}";

/* ── THE GUARD. A stated claim about conformance is a hypothesis; this is the check. ──
   Goes RED on any hex literal outside the generated :root block, and on any font-size that
   is not one of the four NAMED sizes plus the values registered inside CC.cls itself.
   It runs on every build and the builder REFUSES rather than shipping a drifted guide —
   the rule the prototype broke silently is now a rule that cannot be broken silently.
   A guard nobody has seen refuse is decoration, so `--selftest-board-css` proves it red. */
function checkBoardIsCanonical(cssText) {
  const findings = [];
  const rootEnd = cssText.indexOf('}');
  const body = cssText.slice(rootEnd + 1);          /* everything after :root{...} */
  const hexes = body.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  if (hexes.length) {
    findings.push('HEX LITERAL outside the registry block (' + hexes.length + '): ' +
      Array.from(new Set(hexes)).join(', ') + ' — use a cc_component token via var().');
  }
  /* sizes legitimately present because a REGISTERED class declares them */
  const fromRegistry = new Set();
  Object.keys(CC.cls).forEach(function (k) {
    (String(CC.cls[k]).match(/font-size:([0-9.]+px)/g) || []).forEach(function (m) {
      fromRegistry.add(m.split(':')[1]);
    });
  });
  fromRegistry.add('14px');                          /* markup row mic-in-a-text-box */
  const named = new Set(Object.keys(CC.type).map(function (k) { return CC.type[k]; }));
  const sizes = Array.from(new Set((body.match(/font-size:([0-9.]+px)/g) || [])
    .map(function (m) { return m.split(':')[1]; })));
  const unnamed = sizes.filter(function (s) { return !named.has(s) && !fromRegistry.has(s); });
  if (unnamed.length) {
    findings.push('TYPE SIZE not on the cc_component scale: ' + unnamed.join(', ') +
      ' — a NEW size must be NAMED in cc_component BEFORE it is built.');
  }
  return findings;
}

/* ── lanes. Three, in ruled order. A lane is a GROUPING, never a sequence — nothing in
      this module emits an index (ruling 1). ── */
const CG_LANES = [
  { key: 'cover', label: 'Cover these',     hint: 'any order the call gives you' },
  { key: 'reach', label: 'Reach for these', hint: 'before they raise them' },
  { key: 'land',  label: 'Land it',         hint: 'hook · close · follow-up' },
];

function cgLaneOf(item) {
  const explicit = item.d && item.d.lane;
  if (explicit && CG_LANES.some(function (l) { return l.key === explicit; })) return explicit;
  if (item.t === 'objection') return 'reach';
  if (item.t === 'hook' || item.t === 'close') return 'land';
  return 'cover';
}

/* An item's badge. The close is the one thing he misses, so it is MUST by default — that
   is the whole point of ruling 2. */
function cgKindOf(item) {
  const k = item.d && item.d.kind;
  if (k === 'must' || k === 'if' || k === 'play') return k;
  if (item.t === 'close') return 'must';
  if (item.t === 'objection') return 'play';
  return '';
}

/* ── THE FIVE FIELDS ────────────────────────────────────────────────────────────────
   when · why · do[] · dont[] · words[]. `lens` is carried and NEVER rendered (ruling 5).

   ⚠ THE FALLBACK NEVER SPLITS A BLOB, AND THAT REFUSAL IS THE POINT.
   A guide on the old contract carries two prose blobs, `advisorRead` and `sayThis`, with
   all five pieces mashed inside. Every atom in board-v6 was hand-split BY A SESSION and
   nothing in the system does that. A builder that guessed at the split would be a hand-made
   artifact wearing a builder's name: it would LOOK authored, it would be wrong in ways
   nobody could see, and it would make the old contract survivable — which is exactly what
   this ruling ends. So words <- sayThis/answer/question split only on BLANK LINES (that is
   paragraphing, not interpretation), why <- advisorRead verbatim, and the card SAYS OUT
   LOUD that when/do/don't were never authored.
   See [[a-hand-made-artifact-bypasses-every-gate]]. */
function cgList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).filter(function (x) { return x.trim(); });
  return String(v).split(/\n+/)
    .map(function (x) { return x.replace(/^[-•*]\s*/, '').trim(); }).filter(Boolean);
}
function cgParas(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).filter(function (x) { return x.trim(); });
  return String(v).replace(/\\n/g, '\n').split(/\n\s*\n/)
    .map(function (x) { return x.trim(); }).filter(Boolean);
}
function cgFields(item) {
  const d = item.d || {};
  const authored = (d.words != null) || (d.do != null) || (d.dont != null) || (d.when != null);
  const wordsFallback = item.t === 'objection' ? d.answer
                      : item.t === 'close'     ? d.question
                      : d.sayThis;
  const dont = cgList(d.dont);
  if (d.stopNote) dont.push(String(d.stopNote));   /* the old contract's stopNote IS a don't */
  return {
    authored: authored,
    when:  d.when != null ? String(d.when) : '',
    why:   d.why  != null ? String(d.why)  : (d.advisorRead != null ? String(d.advisorRead) : ''),
    do:    cgList(d.do),
    dont:  dont,
    words: cgParas(d.words != null ? d.words : wordsFallback),
  };
}

function cgOrderedItems(g) {
  const ordered = [];
  (g.sections || []).forEach(function (s) { ordered.push({ t: 'standard', d: s }); });
  (g.objectionHandlers || []).forEach(function (o) { ordered.push({ t: 'objection', d: o }); });
  if (g.hookSection) ordered.push({ t: 'hook', d: g.hookSection });
  if (g.closeSection) ordered.push({ t: 'close', d: g.closeSection });
  ordered.forEach(function (item, idx) { item.sid = String(item.d.id || ('i' + idx)); });
  return ordered;
}

/* ── the board (left) — .panel + .stackhead + .panel h2 + .room ── */
function buildBoardHtml(g) {
  const refs = cgRefItems(g);
  const ordered = cgOrderedItems(g);
  const byLane = {}; CG_LANES.forEach(function (l) { byLane[l.key] = []; });
  ordered.forEach(function (item) { byLane[cgLaneOf(item)].push(item); });

  const closeItem = ordered.filter(function (i) { return i.t === 'close'; })[0] || null;

  const lanes = CG_LANES.map(function (l) {
    const rooms = byLane[l.key].map(function (item) {
      const d = item.d;
      const kind = cgKindOf(item);
      const badge = kind ? ' <span class="badge">' + kind.toUpperCase() + '</span>' : '';
      const label = d.label || d.title || d.concern || 'Untitled';

      /* ── THE DURATION SLOT TAKES A DURATION, OR IT TAKES NOTHING ──────────────────
         Fixed 2026-08-11 from a real broken row Bryce screenshotted (PE Innovation Team
         guide, the "close" row). The markup below was already correct — hint to <em>,
         mins to <i class="cgb-mins"> — but the CONTENT arriving in `timing` was the
         sentence "This is the whole reason you're in the room". `.cgb-mins` is a short
         chip with no flex-shrink, so a full sentence in it won the width fight against
         `.cgb-roomlabel` (which correctly carries flex:1;min-width:0 and therefore
         SHRANK). The title collapsed to one word per line and the sentence rendered
         beside it, overlapping. It read as a CSS bug and it was a data bug.

         The lesson, and it is the same one this whole session is about: a field that
         accepts anything will eventually be handed the wrong thing, and the damage
         shows up somewhere that looks unrelated. So the slot now decides. A duration is
         short and carries a number (or is literally n/a); anything else is prose and is
         routed to the hint line where it was always meant to go, rather than being
         dropped — dropping it would lose real content the author wrote. */
      const rawMins = String(d.mins || d.timing || '').trim();
      const looksLikeDuration = rawMins.length <= 16 && (/\d/.test(rawMins) || /^n\/?a$/i.test(rawMins));
      const mins = looksLikeDuration ? rawMins : '';
      const hint = d.hint || (looksLikeDuration ? '' : rawMins) || '';
      return '<div class="room cgb-room" id="t-' + esc(item.sid) + '" data-sid="' + esc(item.sid) + '">' +
        '<span class="cgb-roomlabel" onclick="cgOpen(\'' + esc(item.sid) + '\')">' +
        '<b>' + esc(label) + badge + '</b>' + (hint ? '<em>' + esc(hint) + '</em>' : '') + '</span>' +
        (mins ? '<i class="cgb-mins">' + esc(mins) + '</i>' : '') +
        '<button class="cicon cgb-tick" onclick="cgTick(event,\'' + esc(item.sid) + '\')" title="Mark covered">✓</button>' +
        '</div>';
    }).join('');
    return '<div class="cgb-lane" id="lane-' + l.key + '">' +
      '<h2 class="cgb-lanehead" onclick="cgLaneTog(this)">' + esc(l.label) +
      (l.hint ? '<span class="cgb-lanehint">' + esc(l.hint) + '</span>' : '') + '</h2>' +
      (rooms || '<div class="room cgb-room"><span class="cgb-roomlabel"><em>nothing in this lane</em></span></div>') +
      '</div>';
  }).join('');

  /* ruling 2 — the marker is PERMANENT and is rendered even when there is no close, because
     an absent marker reads as "nothing to reach." */
  const marker = '<div class="stackhead"><span class="u-pill" id="cgMust" data-close="' +
    esc(closeItem ? closeItem.sid : '') + '">Close: not yet</span></div>';

  /* the reference group. NO tick, and these sids never enter CG_ITEM_IDS. */
  function refRow(r) {
    return '<div class="room cgb-room cgb-ref" id="t-' + esc(r.sid) + '" data-sid="' + esc(r.sid) + '" ' +
      'onclick="cgOpen(\'' + esc(r.sid) + '\')">' +
      '<span class="cgb-roomlabel"><b>' + esc(r.label) + '</b>' +
      (r.hint ? '<em>' + esc(r.hint) + '</em>' : '') + '</span></div>';
  }
  function refLane(id, label, hint, rows) {
    if (!rows.length) return '';
    return '<div class="cgb-lane" id="lane-' + id + '">' +
      '<h2 class="cgb-lanehead" onclick="cgLaneTog(this)">' + esc(label) +
      '<span class="cgb-lanehint">' + esc(hint) + '</span></h2>' +
      rows.map(refRow).join('') + '</div>';
  }
  /* TWO groups, not one. Bryce, 2026-08-07: *"these 4 get their own accordion instead of
     staying inside 'Before the call'."* They are a different KIND of thing — the pre-call
     four are read ONCE before the call; these are reached for DURING it, repeatedly, and
     burying a mid-call reach inside a pre-call group is a click he pays every time. */
  const refLanes =
    refLane('ref',  'Before the call', 'read it, nothing to cover',
            refs.filter(function (r) { return r.group === 'pre'; })) +
    refLane('talk', CG_TALK_LABEL,     CG_TALK_HINT,
            refs.filter(function (r) { return r.group === 'talk'; }));

  const board = '<div class="panel cgb-board">' +
    '<div class="stackhead"><h2>Coverage</h2><span class="ctx" id="cgCov">0 of ' + ordered.length + ' covered</span></div>' +
    marker + refLanes + lanes + '<div style="height:10px"></div></div>';

  return { boardHtml: board, items: ordered, refs: refs };
}

/* ── the reading pane (right) — .card + .card .title + .card .row1 + .corner + .scard ── */
function cgCardHtml(item) {
  const F = cgFields(item);
  const d = item.d;
  const title = d.title
    || (item.t === 'objection' && d.concern ? 'Objection — ' + d.concern : '')
    || d.label || '';
  const kind = cgKindOf(item);

  const oldShape = F.authored ? '' :
    '<div class="cgb-oldshape">Authored on the old contract — this section carries two prose ' +
    'blobs, so <b>when</b>, <b>do</b> and <b>don’t</b> were never written separately. ' +
    'Nothing here was split by guesswork. Rebuild this guide to get the full rail.</div>';

  const words = F.words.length
    ? F.words.map(function (p) { return '<p>' + richAnswer(p) + '</p>'; }).join('')
    : '<p class="cgb-hint">No words authored for this one.</p>';

  const branches = (item.t === 'close' && d.branches && d.branches.length)
    ? '<div class="scard cgb-rb why"><i>THEN</i><ul>' + d.branches.map(function (b) {
        return '<li><b>' + esc(b.if) + '</b> — ' + esc(b.then) + '</li>';
      }).join('') + '</ul></div>' : '';
  const icp = (item.t === 'close' && d.icp)
    ? '<div class="scard cgb-rb why"><i>ICP CHECK</i>' + esc(d.icp) + '</div>' : '';

  const rail = '<aside class="cgb-rail" onclick="cgRailClick()">' + oldShape +
    (F.when ? '<div class="scard cgb-rb when"><i>WHEN</i>' + esc(F.when) + '</div>' : '') +
    (F.why  ? '<div class="scard cgb-rb why"><i>WHY</i>' + esc(F.why) + '</div>' : '') +
    (F.do.length ? '<div class="scard cgb-rb do"><i>DO</i><ul>' +
      F.do.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
    (F.dont.length ? '<div class="scard cgb-rb dont"><i>DON’T</i><ul>' +
      F.dont.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
    branches + icp + '</aside>';

  const ta = 'cgta-' + item.sid, mic = 'cgmic-' + item.sid;
  const capture = '<div class="cgb-cap"><label>Capture</label><div class="cgb-tawrap">' +
    '<textarea class="note" id="' + esc(ta) + '" data-note="' + esc(item.sid) + '" placeholder="type, or talk — hit the mic"></textarea>' +
    '<button class="cgb-mic" id="' + esc(mic) + '" onclick="warmDictate(\'' + esc(ta) + '\',\'' + esc(mic) + '\')" title="Talk instead of type">🎤</button>' +
    '</div></div>';

  return '<div class="card cgb-card" id="c-' + esc(item.sid) + '">' +
    '<div class="row1">' +
    (kind ? '<span class="badge">' + kind.toUpperCase() + '</span>' : '') +
    (d.timing ? '<span class="badge">' + esc(d.timing) + '</span>' : '') +
    '<span class="corner"><button class="btn mute cgb-railtog" onclick="cgRail()">hide notes</button></span>' +
    '</div>' +
    '<div class="title">' + esc(title) + '</div>' +
    (F.when ? '<div class="why">' + esc(F.when) + '</div>' : '') +
    '<div class="cgb-split"><div>' +
    '<div class="scard cgb-words">' + words + '</div>' + capture +
    '<div class="meta"><button class="btn done" onclick="cgTick(null,\'' + esc(item.sid) + '\')">Covered — back to the board</button>' +
    '<span>Notes autosave on this device.</span></div>' +
    '</div>' + rail + '</div></div>';
}

/* the card shown when nothing is open — it is the only on-screen explanation of the board,
   so it states the two moves and the fact that nothing is numbered. */
function cgNoneCardHtml() {
  return '<div class="card cgb-card show" id="c-cgnone">' +
    '<div class="title">Nothing open.</div>' +
    '<p class="cgb-hint"><b>Left = the words you reach for.</b> Right = when · why · do · don’t. ' +
    'Hit “hide notes” and the words take the full width.<br>' +
    '<b>Nothing is numbered.</b> Click a row to open it, click its ✓ to mark it covered.<br>' +
    'The drawers above hold your pre-call reading.</p></div>';
}

/* ── THE REFERENCE ROWS (ruling 6, as Bryce re-cut it 2026-08-07) ─────────────────
   His words: *"quick access is a item on the left that collapses. Same with the brief, at
   a glance, watch outs, and links. All of those can collapse on the left and content in the
   middle... everything expands into the same main."*

   So there is ONE index (the left rail) and ONE main frame. board-v6 put the pre-call
   reading in four drawer buttons ABOVE the board, which meant the page had two places a
   thing could open and two ways to open it. It now has one of each.

   WHAT CHANGED, and it is a removal not an addition:
     · the four `<details>` drawers are GONE — they are rows in the rail like everything else
     · Quick-access is GONE as a container. Bryce ruled its four aspects are FOUR ROWS
       (option (a), 2026-08-07): mid-call he is one click from VisitorResolve, not two, and
       nothing collapses inside anything.

   ⚠ REFERENCE ROWS CARRY NO ✓ AND ARE NOT IN `CG_ITEM_IDS`. They are reading, not things to
   cover. A tick on them would inflate "n of N covered" — the one number ruling 2 exists to
   make honest — and a coverage count that includes the brief is worse than no count.

   ⚠ THE ONE THING THAT STILL COLLAPSES, AND IT IS RULED, NOT LEFTOVER: an aspect's TIERS.
   Call-Guide-Content-SPEC §4.3 rules 1 and 2 — *"Lead line first, then STOP. The lead is
   always visible; deeper tiers are collapsed and open only on a lean-in."* That collapse IS
   the throttle; flattening it would ship the whole pitch at once, which is the exact defect
   the aspects were built to stop. It uses the CC's registered `disclosure` behavior —
   native details/summary, no JS, no chevron glyph the browser already draws. */
/* ⚠ THE NAME OF THIS GROUP IS FRAMEWORK VOCABULARY, NOT BRYCE'S SHORTHAND.
   He caught it 2026-08-07: *"the quick access — or maybe something more generic that any
   company can refer to — instead of 'Quick-access', that was my term for me."* This ships
   to every client, so the label has to be a word a stranger already owns. It is declared
   ONCE here and nowhere else, because a name typed in three places is three names.
   `source_registry` row cc-vocabulary carries his standing rule: he will NOT remember
   invented piece names, and a genuinely new piece gets a plain name BEFORE it is built. */
const CG_TALK_LABEL = 'Talking Points';
const CG_TALK_HINT  = 'say the lead line, then STOP';

function cgRefItems(g) {
  const R = [];
  function kvs(rows) {
    return (rows || []).map(function (r) {
      return '<div class="cgb-kv"><i>' + esc(r.label) + '</i><span>' + esc(r.value) + '</span></div>';
    }).join('');
  }
  function push(id, label, hint, body, empty) {
    R.push({ sid: 'ref-' + id, label: label, hint: hint, group: 'pre',
             body: body || '<div class="cgb-hint">' + empty + '</div>' });
  }
  push('brief',  'The brief',   'when · who · win condition', kvs(g.contextBar),
       'No brief on this guide — the row stays so a missing one looks missing.');
  push('glance', 'At a glance', 'what they do · why · where stuck', kvs(g.glance),
       'Nothing at a glance on this guide — the row stays so a missing one looks missing.');
  push('watch',  'Watch-outs',  'read the room', (g.tags || []).map(function (t) {
         return '<span class="badge">' + esc(t.text) + '</span> '; }).join(''),
       'No watch-outs on this guide — the row stays so a missing one looks missing.');
  push('links',  'Links',       'person · company', buildLinksHtml(g),
       'No links captured on this guide — the row stays so a missing one looks missing.');

  /* loadDefaultAspects() THROWS rather than return an empty set — a guide with no
     Quick-access words looks exactly like a guide that never had any. Do not catch it. */
  const A = (g && g.aspects) || loadDefaultAspects();
  /* THE HINT MOVED UP, IT DID NOT DISAPPEAR. Every one of these four rows carried the
     identical line "say the lead line, then STOP", so the rail said the same sentence four
     times and it stopped being read. A rule shared by every row in a group belongs on the
     GROUP — which is what "any order the call gives you" already does for Cover these. */
  (A.items || []).forEach(function (a) {
    R.push({ sid: 'ref-' + a.id, label: a.label, hint: '', group: 'talk',
             body: cgAspectBody(a, A.howToUse), aspect: true });
  });
  return R;
}

/* one aspect, rendered into the main frame. Lead line always visible (§4.3 rule 1);
   tiers collapsed (§4.3 rule 2); hooks and the stop rule below. */
function cgAspectBody(a, howToUse) {
  const tiers = (a.tiers || []).map(function (t) {
    return '<details class="scard cgb-tier"><summary>' + esc(t.label) + '</summary>' +
           '<div class="cgb-tierbody">' + richAnswer(t.body) + '</div></details>';
  }).join('');
  const hooks = (a.hooks && a.hooks.length)
    ? '<div class="scard cgb-rb do"><i>AH-HA LINES</i><ul>' +
      a.hooks.map(function (h) { return '<li>' + richAnswer(h) + '</li>'; }).join('') + '</ul></div>'
    : '';
  const stop = a.stop ? '<div class="scard cgb-rb dont"><i>STOP</i>' + esc(a.stop) + '</div>' : '';
  return '<div class="scard cgb-lead"><i>SAY THIS FIRST — THEN STOP</i>' + richAnswer(a.lead) + '</div>' +
         (tiers ? '<div class="cgb-tiers">' + tiers + '</div>' : '') + hooks + stop +
         (howToUse ? '<div class="cgb-hint" style="margin-top:10px">' + richAnswer(howToUse) + '</div>' : '');
}

function cgRefCardHtml(r) {
  return '<div class="card cgb-card" id="c-' + esc(r.sid) + '">' +
    '<div class="row1"><span class="badge">' + (r.aspect ? esc(CG_TALK_LABEL.toUpperCase()) : 'PRE-CALL') + '</span></div>' +
    '<div class="title">' + esc(r.label) + '</div>' +
    (r.hint ? '<div class="why">' + esc(r.hint) + '</div>' : '') +
    r.body + '</div>';
}

/* ── board runtime ──────────────────────────────────────────────────────────────
   board-v6.html's script, with three NAMED changes:
     (1) every function namespaced `cg*`, so it cannot collide with the older shell's
         `open`/`tick`/`rail`, which already exist in STANDALONE_RUNTIME.
     (2) COVERAGE PERSISTS. The prototype held `done` in a page variable, so a refresh
         mid-call wiped every tick. Notes already survive a refresh via STORE_KEY; coverage
         surviving is the same promise, and a coverage board that forgets is worse than none.
     (3) THE MIC IS THE CANONICAL `warmDictate` (cc_component behavior row), not the
         prototype's simpler one — Bryce's own stated condition. Two rules the prototype's
         mic is missing and that matter on a live call: AUTO-RESTART on `end` unless the user
         stopped it, so an engine timeout does not silently kill dictation mid-call, and
         IGNORE `no-speech`/`aborted` instead of shutting down. ANTI-WIPE is honoured by
         freezing what is already typed as a base and keying finals by result index, so
         typed text can never be clobbered. */
const BOARD_RUNTIME =
"var CG_COVKEY='callguide_covered_'+CONFIG.guideId;var cgDone={};var cgHideRail=false;" +
"var CG_IDS=(window.CG_ITEM_IDS||[]);" +
"try{cgDone=JSON.parse(localStorage.getItem(CG_COVKEY)||'{}')||{};}catch(e){cgDone={};}" +
"function cgSaveCov(){try{localStorage.setItem(CG_COVKEY,JSON.stringify(cgDone));}catch(e){}}" +
"function cgLaneTog(h){h.parentNode.classList.toggle('shut');}" +
"function cgRail(){cgHideRail=!cgHideRail;cgApplyRail();}" +
"function cgRailClick(){if(cgHideRail){cgHideRail=false;cgApplyRail();}}" +
"function cgApplyRail(){document.querySelectorAll('.cgb-split').forEach(function(s){s.classList.toggle('norail',cgHideRail);});" +
"document.querySelectorAll('.cgb-railtog').forEach(function(x){x.textContent=cgHideRail?'show notes':'hide notes';});" +
"try{localStorage.setItem(CG_COVKEY+'_rail',cgHideRail?'1':'0');}catch(e){}}" +
"function cgOpen(id){document.querySelectorAll('.cgb-card').forEach(function(c){c.classList.remove('show');});" +
"var c=document.getElementById('c-'+id);if(c)c.classList.add('show');" +
"document.querySelectorAll('.cgb-room').forEach(function(t){t.classList.remove('active');});" +
"var t=document.getElementById('t-'+id);if(t)t.classList.add('active');cgApplyRail();}" +
"function cgTick(ev,id){if(ev)ev.stopPropagation();cgDone[id]=!cgDone[id];cgSaveCov();" +
"if(!ev){document.querySelectorAll('.cgb-card').forEach(function(c){c.classList.remove('show');});" +
"var n=document.getElementById('c-cgnone');if(n)n.classList.add('show');" +
"document.querySelectorAll('.cgb-room').forEach(function(t){t.classList.remove('active');});}" +
"cgPaint();}" +
/* ruling 2 — the count and the permanent close marker are DERIVED from the covered set,
   never stored a second time. A stored count is a cached opinion that can disagree with
   its own evidence. */
"function cgPaint(){var n=0;CG_IDS.forEach(function(i){var t=document.getElementById('t-'+i);" +
"if(t)t.classList.toggle('covered',!!cgDone[i]);if(cgDone[i])n++;});" +
"var cov=document.getElementById('cgCov');if(cov)cov.textContent=n+' of '+CG_IDS.length+' covered';" +
"var m=document.getElementById('cgMust');if(m){var cid=m.getAttribute('data-close');" +
"if(!cid){m.textContent='No close section on this guide';m.style.background='var(--st-delivered-bg)';m.style.color='var(--st-delivered-fg)';}" +
"else if(cgDone[cid]){m.textContent='Close: covered';m.style.background='var(--st-verified-bg)';m.style.color='var(--st-verified-fg)';}" +
"else{m.textContent='Close: not yet';m.style.background='var(--st-blocked-bg)';m.style.color='var(--st-blocked-fg)';}}}" +
/* cc_component behavior row `warmDictate` — all eight rules */
"var CG_REC=null,CG_RECBTN=null,CG_RECSTOP=false;" +
"function cgMicOff(btn){btn.textContent='\\uD83C\\uDFA4';btn.style.background='var(--panel)';btn.style.borderColor='var(--line)';}" +
"function warmDictate(taId,btnId){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;" +
"var ta=document.getElementById(taId),btn=document.getElementById(btnId);if(!ta||!btn)return;" +
"if(!SR){ta.placeholder='This browser cannot listen — please type it instead.';return;}" +
"if(CG_REC&&CG_RECBTN===btn){CG_RECSTOP=true;try{CG_REC.stop();}catch(e){}return;}" +
"if(CG_REC){CG_RECSTOP=true;try{CG_REC.stop();}catch(e){}}" +
"var base=ta.value;var finals={};CG_RECSTOP=false;" +
"var r=new SR();r.lang='en-US';r.continuous=true;r.interimResults=true;" +
"r.onresult=function(ev){var interim='';for(var i=ev.resultIndex;i<ev.results.length;i++){" +
"var txt=ev.results[i][0].transcript;if(ev.results[i].isFinal){finals[i]=txt;}else{interim+=txt;}}" +
"var joined='';Object.keys(finals).sort(function(a,b){return a-b;}).forEach(function(k){joined+=finals[k];});" +
"ta.value=(base?base+' ':'')+joined+interim;if(typeof saveNotes==='function')saveNotes();};" +
"r.onerror=function(ev){if(ev&&(ev.error==='no-speech'||ev.error==='aborted'))return;};" +
"r.onend=function(){if(!CG_RECSTOP){try{r.start();return;}catch(e){}}CG_REC=null;CG_RECBTN=null;cgMicOff(btn);};" +
"CG_REC=r;CG_RECBTN=btn;btn.textContent='\\u23F9';btn.style.background='var(--red-soft)';btn.style.borderColor='var(--red)';" +
"try{r.start();}catch(e){}}" +
"try{if(localStorage.getItem(CG_COVKEY+'_rail')==='1'){cgHideRail=true;}}catch(e){}" +
"cgApplyRail();cgPaint();";

/* ── the whole live surface: ONE rail, ONE main frame. ── */
function buildLiveBoardHtml(g) {
  const B = buildBoardHtml(g);
  const cards = B.refs.map(cgRefCardHtml).join('') + B.items.map(cgCardHtml).join('');
  return {
    html: '<div class="cgb"><div class="cgb-wrap">' +
      '<div>' + B.boardHtml + '</div>' +
      '<div class="cgb-pane">' + cgNoneCardHtml() + cards + '</div>' +
      '</div></div>',
    ids: B.items.map(function (i) { return i.sid; }),   /* reference rows are NOT coverage */
  };
}


/* ── assemble the standalone HTML (verbatim structure from artifact) ── */
function buildStandaloneHtml(g, config) {
  /* THE CONFORMANCE GUARD RUNS BEFORE A BYTE IS ASSEMBLED, and it REFUSES.
     Bryce, 2026-08-07: "It must remain canonical to the registered components... do not
     invent anything." A stated claim about conformance is a hypothesis; this is the check,
     and it runs against the CSS actually emitted rather than against the source that wrote
     it. The prototype broke this rule silently in seven colours and twenty class names. */
  const drift = checkBoardIsCanonical(BOARD_CSS);
  if (drift.length) {
    throw new Error('build-call-guide: the live board is NOT canonical to cc_component and ' +
      'will not be built.\n  - ' + drift.join('\n  - ') +
      '\nRead the vocabulary from Neon cc_component (tenant bryce, surface command-center). ' +
      'Never from the `component` table (36 rows, all skills) and never from ' +
      'aii-site/design-system/components.css (dead, and it ships a call-guide.html decoy).');
  }

  const live = buildLiveBoardHtml(g);
  const sec = buildSectionsHtml(g);           /* still built: SECTION_LABELS feeds the CRM log */
  const cfg = Object.assign({}, config, { totalSections: live.ids.length });
  const title = (g.header && g.header.title) || ('Call Guide — ' + config.prospect);
  const sub = (g.header && g.header.subtitle) || '';

  return [
'<!DOCTYPE html>',
'<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
'<title>' + esc(title) + '</title>',
/* BOARD_CSS carries :root, so it goes FIRST — the older shell's hardcoded hexes are
   unaffected by it, and the board's var() references resolve. */
/* ASPECTS_CSS and ASPECTS_RUNTIME are NOT shipped. The Quick-access DRAWER they style
   was retired 2026-08-07 when Bryce moved its four aspects into the rail as their own
   rows. Measured before removing: 4 CSS rules and 1 runtime function were still being
   emitted into every guide against ZERO markup. Dead styling is not free — it is a
   second source of truth, and the next session to read a built guide would find
   `.asp-drawer-head` and conclude the drawer still exists. The functions stay DEFINED
   in this file (buildAspectsHtml still renders the drawer if anything asks for it);
   what stops is shipping them. */
'<style>' + BOARD_CSS + STANDALONE_CSS + '</style></head>',
'<body>',
'<div class="cgb"><div class="panel" style="max-width:1700px;margin:12px auto 0">' +
  '<div class="stackhead"><h2>' + esc(title) + '</h2>' +
  '<span class="ctx">' + esc(sub) + '</span></div></div></div>',
live.html,
'<div class="log-bar"><div class="log-info">Capture as you go — then one click logs it to <b id="crm-name-label">your CRM</b>. <span>Notes autosave on this device.</span></div>' +
  '<span class="log-status" id="log-status"></span>' +
  /* TWO buttons, two different jobs, and the labels have to say which is which (Krug).
     "Log Call Notes" writes a note onto the CRM record. "Update this guide" asks for the guide
     itself to be rebuilt from those notes. They reuse the SAME registered class on purpose —
     §9.3 generates this stylesheet from cc_component and checkBoardIsCanonical() throws on any
     unregistered class or hex, so inventing a second look here would fail the canon check. */
  '<button class="btn-log" id="cgr-btn" onclick="cgRefresh()">Update this guide<small>rebuilds it from your notes</small></button>' +
  '<button class="btn-log" id="log-btn" onclick="openLog()">Log Call Notes<small id="log-sub">saves your notes</small></button></div>',
'<div class="ov" id="logOv"><div class="ov-card"><h2>Some fields are empty</h2><p>Before you log, these are blank:</p><ul id="logMissList"></ul><div class="ov-btns"><button class="btn btn-g" onclick="closeLogOv()">Go back &amp; fill</button><button class="btn btn-p" onclick="forceLog()">Log anyway</button></div></div></div>',
'<div class="ov" id="lcnOv"><div class="ov-card"><h2>Log Call Notes</h2><p class="lcn-sub" id="lcnWho">Call with —</p><label class="lcn-l">Call notes</label><textarea id="lcnNotes" class="lcn-ta" placeholder="What happened on the call — what they said, where it landed, anything worth putting on the record."></textarea><label class="lcn-l">Anything extra to add <span class="lcn-opt">(optional)</span></label><textarea id="lcnExtra" class="lcn-ta lcn-sm" placeholder="A detail, a flag, a reminder to yourself."></textarea><div class="lcn-tx"><span>Expecting a transcript?</span><div class="lcn-seg"><button id="lcnTyes" class="lcn-segbtn" onclick="lcnTrans(true)">Yes</button><button id="lcnTno" class="lcn-segbtn lcn-on" onclick="lcnTrans(false)">No</button></div></div><p class="lcn-hint" id="lcnTransHint" style="display:none">I&#39;ll mark this note &quot;transcript pending&quot; and tee up your debrief so the two marry up when it lands.</p><div class="lcn-btns"><button class="btn btn-g" onclick="lcnClose()">Cancel</button><button class="btn btn-p" id="lcnSave" onclick="lcnSave()">Save to CRM</button></div><div class="lcn-status" id="lcnStatus"></div></div></div>',
'<div class="foot-stamp">BUILD ' + BUILD_STAMP + ' · auto-generated · Log Call Notes</div>',
'<script>var CONFIG=' + JSON.stringify(cfg) + ';var SECTION_LABELS=' + JSON.stringify(sec.labels) +
  ';var CG_ITEM_IDS=' + JSON.stringify(live.ids) + ';</' + 'script>',
'<script>' + STANDALONE_RUNTIME + BOARD_RUNTIME + '</' + 'script>',
'</body></html>'
  ].join('\n');
}


/* ── REGENERATION — re-render a guide from KEPT STATE, never re-author it ─────────────
   Call-Guide-Content-SPEC-v1.0 §8.3 listed "a standing regeneration path that re-renders
   from kept state" as NOT BUILT, and said why it could not be built: call_guide_state held
   0 rows. §8.5 built the writer on 2026-08-07. This is the READER that makes that write
   real — a store is not finished when it is filled, it is finished when a reader depends
   on it.

   EVANS — THIS IS NOT A SECOND MECHANISM. Regeneration lives inside the call-document
   bounded context. It reads call_guide_state, re-renders through THIS file's own
   buildStandaloneHtml(), and re-registers through the SAME plan/settle seam as a build.
   No new store, no new writer, and NO NEW VOCABULARY: built_by stays whatever BUILT the
   document, exactly as confirmHosted() already reasons — this path did not author it.

   NYGARD — A REGENERATION THAT CANNOT FIND ITS SOURCE REFUSES. It never falls back to a
   whole-guide rebuild. That fallback is how the store reached 0 rows with a 16/16 gate
   sitting on it: something that looked like it worked, over a source that was never there.
   Every refusal below carries its OWN exit code and its OWN reason sentence, so two
   different failures can never be reported by the same guard — the X1 lesson from
   gate_call_guide_state(), where four mutants were all being killed by a neighbour.

   THE SESSION IS STILL THE WIRE, and no credential comes near this file:
     1. node build-call-guide.js --regen-plan <docId>              -> emits {sql, params}
     2. run it through the board connector resolved BY CATEGORY, save the FULL result
     3. node build-call-guide.js --regen <readplan.json> --rows <rows.json>
     4. run plan.sql through the connector, then register-call-doc.js --settle
*/
const REGEN_EXIT = {
  NO_SUCH_DOC: 3, NO_KEPT_STATE: 4, UNUSABLE_KEPT_STATE: 5,
  PROVENANCE: 6, PATH_UNRESOLVED: 7,
};

/* ONE read answers both halves. The guide JSON is the only thing that MUST come from
   kept state; every other field the renderer and the registrar need is already a column
   on call_doc — the list we already have. Nothing new is stored to make this work. */
const REGEN_READ_SQL = [
  'SELECT d.doc_id, d.tenant_id, d.event_id, d.kind, d.call_ref, d.meeting_date, d.person,',
  '       d.domain, d.channel, d.file_title, d.local_path, d.built_by, d.event_id_source,',
  '       d.update_count, d.lead_id, d.no_lead_reason,',
  '       s.state_id, s.version AS kept_version, s.guide_json',
  '  FROM call_doc d',
  '  LEFT JOIN call_guide_state_current_v s',
  '         ON s.tenant_id = d.tenant_id AND s.doc_id = d.doc_id',
  " WHERE d.tenant_id = $1 AND d.doc_id = $2 AND d.kind = 'guide'",
].join('\n');

function regenRefuse(code, label, sentence) {
  const e = new Error('REGEN REFUSED — ' + label + ': ' + sentence);
  e.exitCode = code; e.regenCode = label;
  return e;
}

/* ════════════════════════════════════════════════════════════════
   THE CRM-RECORD GATE — an empty leadId is REFUSED, a deliberate one is DECLARED.
   Added 2026-08-11, Bryce pop-up-approved, through aii-adjudicate.

   WHAT IT REFUSES: a guide built with no CRM record attached. That guide's "Log Call
   Notes" button cannot post a note — ccWhyNot() returns 'this guide has no CRM record
   attached' and the whole thing degrades to a clipboard copy. It looks like a Save
   button and it is not one, and the operator finds out mid-call.

   MEASURED BEFORE IT WAS WRITTEN, on real bytes, 2026-08-11: 12 of the 20 guides on
   disk carried leadId:"" — Lloyd Easters, Cynthia Davis, Ryan Sutton, Jerry Waldon,
   Jim Buckley, Robert Desroches, Glenn Antoine, Brian Manning and the 4 cohorts. Eight
   of those were produced by ONE build run at 02:03 on 2026-08-10. Nothing complained,
   at build time or after, because nothing was asking.

   ⚠ THIS REVERSES A LINE IN THE GOVERNING SPEC, IT DOES NOT MERELY ADD TO IT.
   Log-Call-Notes-Modal-SPEC §4 rule 4 named "a guide with no leadId on it" as one of
   "the only legitimate fallbacks". That sentence is why this defect was not a bug for
   six days: the builder was obeying it. Eleven lines below it, in the same section,
   sits Bryce's own ruling from the same day — "The user should never have to DO
   something extra the AI should be able to do for them." A guide that tells him to
   paste his call notes into Claude by hand is the thing that ruling forbids. The
   section contradicted itself and the permissive half is what shipped. The spec is
   corrected in the same batch as this gate; if you are reading one without the other,
   one of them did not land.

   THE DECLARATION IS THE WHOLE DESIGN, NOT A CONVENIENCE HATCH.
   A cohort call (EIT, MSP, PE, TAG) genuinely has no single lead to attach. Under a
   blanket refusal those could never be built, so the escape exists — but it is a
   SENTENCE A HUMAN WROTE, never a flag and never an empty string. `noLeadReason` must
   be a real sentence of MIN_NO_LEAD_REASON characters or more, because the entire
   disease being cured here is that an empty value and a deliberate one were
   indistinguishable. `noLeadReason: "n/a"` would restore the disease with extra steps,
   so it is refused too, by length.

   NYGARD — a rule with no refusing surface has no red to go. Core §5.4 already says
   this in Bryce's own framework; four instances of this defect class shipped anyway
   (logWebhookUrl → 96 files, apiBase → 39 debriefs, leadId → 12 guides, beachhead →
   3 debriefs) because in every one of them the rule was PROSE and the builder was
   SILENT. Prose does not refuse. This does.
   ════════════════════════════════════════════════════════════════ */
const MIN_NO_LEAD_REASON = 12;

function crmRecordGate(config) {
  const leadId = String(config && config.leadId != null ? config.leadId : '').trim();
  if (leadId) return { attached: true, leadId };

  const reason = String(config && config.noLeadReason != null ? config.noLeadReason : '').trim();
  if (!reason) {
    throw regenRefuse(6, 'NO CRM RECORD',
      'this guide has no leadId, so its Log Call Notes button could not save anything — ' +
      'it would silently copy to the clipboard instead, and the operator would find that ' +
      'out during the call. Attach the CRM record, or — if this call genuinely has no ' +
      'single lead (a cohort, a group session) — say so on purpose by putting a real ' +
      'sentence in config.noLeadReason. An empty box is not a decision.');
  }
  if (reason.length < MIN_NO_LEAD_REASON) {
    throw regenRefuse(6, 'NO CRM RECORD',
      'config.noLeadReason is "' + reason + '", which is too short to be a decision. ' +
      'Write the actual reason this call has no CRM record — a placeholder puts back the ' +
      'exact thing this gate exists to remove: a deliberate empty and an accidental one ' +
      'that look identical.');
  }
  return { attached: false, leadId: '', noLeadReason: reason };
}

function planRegenRead(docId) {
  if (!docId || typeof docId !== 'string') {
    throw regenRefuse(1, 'NO DOC ID', 'a regeneration is addressed by call_doc.doc_id. ' +
      'Usage: node build-call-guide.js --regen-plan <docId>');
  }
  const R = loadRegistrar();
  return {
    _what_this_is: 'A call-guide REGENERATION read plan. Run its sql with its params through ' +
      'the board connector (resolved BY CATEGORY, never by name), save the FULL result, ' +
      'then hand both to: build-call-guide.js --regen <thisFile> --rows <result.json>',
    docId,
    tenant: R.TENANT,
    sql: REGEN_READ_SQL,
    params: [R.TENANT, docId],
  };
}

/* WHERE THE DOCUMENT LIVES — probed, never hardcoded, and it REFUSES rather than guess.
   call_doc.local_path is the operator's canonical path (/Users/...). The same disk is
   mounted somewhere else when a session runs over the device bridge, so the stored path
   is right and simply not resolvable HERE. Relocating under the live workspace root is a
   different MOUNT of the same file — which is why the registration below still records
   the STORED path. Writing fresh bytes to a scratch path and telling the registry that is
   where the document lives is the failure this refuses to be capable of. */
function probeWorkspaceRoot() {
  let d = __dirname;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(d, '04 — Daily Operating System'))) return d;
    const up = path.dirname(d); if (up === d) break; d = up;
  }
  return null;
}

function resolveDocPath(stored, explicitRoot) {
  if (!stored) {
    throw regenRefuse(REGEN_EXIT.PATH_UNRESOLVED, 'PATH UNRESOLVED',
      'the call_doc row carries no local_path, so there is nowhere to write the ' +
      'regenerated document.');
  }
  if (fs.existsSync(path.dirname(stored))) {
    return { absPath: stored, via: 'the stored local_path resolves on this filesystem' };
  }
  const root = explicitRoot || probeWorkspaceRoot();
  if (root) {
    const anchor = path.basename(root);
    const i = stored.lastIndexOf(path.sep + anchor + path.sep);
    if (i >= 0) {
      const cand = path.join(root, stored.slice(i + anchor.length + 2));
      if (fs.existsSync(path.dirname(cand))) {
        return { absPath: cand, via: 'relocated under the live workspace root ' + root };
      }
    }
  }
  throw regenRefuse(REGEN_EXIT.PATH_UNRESOLVED, 'PATH UNRESOLVED',
    'the document\'s stored home does not exist on this filesystem and could not be ' +
    'relocated. Stored: ' + stored + ' · live workspace root probed: ' + (root || 'NONE') +
    '. Pass --workspace-root <path> if this disk is mounted somewhere else. Nothing was ' +
    'written — a regeneration that lands somewhere other than the document\'s own home is ' +
    'a copy, not a regeneration.');
}

function regenerate(readPlan, rowsIn, opts) {
  opts = opts || {};
  const R = loadRegistrar();
  const want = readPlan && readPlan.docId;
  const tenant = (readPlan && readPlan.tenant) || R.TENANT;
  if (!want) {
    throw regenRefuse(REGEN_EXIT.PROVENANCE, 'PROVENANCE',
      'the read plan carries no docId, so there is nothing to check the rows against. ' +
      'Rows from an unrelated query would be indistinguishable from the right ones.');
  }
  const rows = Array.isArray(rowsIn) ? rowsIn
             : (rowsIn && Array.isArray(rowsIn.rows) ? rowsIn.rows : null);
  if (!rows) {
    throw regenRefuse(REGEN_EXIT.PROVENANCE, 'PROVENANCE',
      'the rows file is neither an array of rows nor a result object carrying one. ' +
      'Hand it the FULL connector result, unedited.');
  }
  if (rows.length === 0) {
    throw regenRefuse(REGEN_EXIT.NO_SUCH_DOC, 'NO SUCH DOC',
      'call_doc has no guide row for ' + want + '. Nothing was regenerated. An empty ' +
      'read is "I could not find it", never "build it fresh".');
  }
  if (rows.length > 1) {
    throw regenRefuse(REGEN_EXIT.PROVENANCE, 'PROVENANCE',
      'the read returned ' + rows.length + ' rows for one doc_id. call_doc is keyed on ' +
      'doc_id, so this is not the query this plan emitted.');
  }
  const row = rows[0];
  if (row.doc_id !== want || row.tenant_id !== tenant) {
    throw regenRefuse(REGEN_EXIT.PROVENANCE, 'PROVENANCE',
      'the row is for ' + row.tenant_id + '/' + row.doc_id + ' and the plan asked for ' +
      tenant + '/' + want + '. A stale rows file from another session reads exactly like ' +
      'a fresh one — this is the only thing that can tell them apart.');
  }

  /* ── THE NYGARD REFUSAL. Its own code, its own sentence, and nothing below it runs. ── */
  if (!row.state_id) {
    throw regenRefuse(REGEN_EXIT.NO_KEPT_STATE, 'NO KEPT STATE',
      'guide ' + want + ' has no call_guide_state row, so there is no source to ' +
      're-render. This path REFUSES rather than fall back to a whole-guide rebuild: a ' +
      'rebuild is a re-AUTHORING, it needs the CRM and the calendar, and dressing one up ' +
      'as a regeneration is exactly how this store reached 0 rows with a 16/16 gate on ' +
      'it. Rebuild it with the authoring skill if that is what you meant. ' +
      '(Call-Guide-Content-SPEC-v1.0 §8 D3 — no stored JSON means no per-segment refresh, ever.)');
  }
  const g = row.guide_json;
  if (!g || typeof g !== 'object' || Array.isArray(g) ||
      !Array.isArray(g.sections) || g.sections.length === 0) {
    throw regenRefuse(REGEN_EXIT.UNUSABLE_KEPT_STATE, 'UNUSABLE KEPT STATE',
      'kept state ' + row.state_id + ' exists but its guide_json carries no non-empty ' +
      'sections[]. A source with no sections is not a source. Got: ' +
      (g === null || g === undefined ? 'null' : (Array.isArray(g) ? 'array' : typeof g)) +
      ', sections=' + (g && Array.isArray(g.sections) ? g.sections.length : 'ABSENT') + '.');
  }

  const where = resolveDocPath(row.local_path, opts.workspaceRoot);

  /* The config the renderer needs is reconstructed from the call_doc row — the same
     columns the original build wrote. guideId is derived so two regenerations of the
     same document are not told apart by a timestamp nobody reads. */
  const config = {
    guideId: 'regen-' + row.doc_id,
    /* The REGENERATED page addresses the refresh door by the SAME doc_id it was read from —
       taken off the row, not re-derived, because here the authoritative value is already in
       hand and deriving it again could only ever disagree. */
    docId: row.doc_id,
    prospect: row.person || '',
    email: '', crmName: '',
    eventId: row.event_id,
    meetingDate: row.meeting_date,
    domain: row.domain || '',
    eventIdSource: row.event_id_source,
    builtBy: row.built_by,
    /* ⚠ THE LEAD MUST BE HANDED IN. THE REGISTRY CANNOT GIVE IT BACK.
       Found 2026-08-11, while fixing the very defect this line reproduces — which is why
       it is written out rather than quietly patched.

       This config used to be built WITHOUT any leadId at all. Every regenerated guide was
       therefore born with a dead Save button BY CONSTRUCTION — even when the guide it was
       regenerated FROM had a perfectly good lead attached. A regeneration silently
       downgraded a working page. That is the same defect class as the four this batch
       already fixes (logWebhookUrl, apiBase, leadId, beachhead), and it was sitting in the
       recovery path — the one thing you reach for AFTER noticing the problem.

       ~~AND IT CANNOT BE SELF-HEALED, WHICH IS THE HONEST PART. `call_doc` has no
       `lead_id` column (19 columns, checked 2026-08-11)...~~ **CLOSED 2026-08-11 PM.**
       Quoted rather than deleted, because the paragraph above is still the reason this
       code is shaped the way it is, and a reader who finds only the fix will not know
       why a regeneration is allowed to refuse at all.

       `call_doc` NOW CARRIES THE LEAD — `lead_id` + `no_lead_reason`, 21 columns, with
       `call_doc_lead_declaration_ck` making the three states structural. So the registry
       CAN answer "which lead was this built for?", and the fallback below is what turns
       that column from a stored fact into a read one. A column nothing reads is not a
       finished store; shipping the write without this read would have left one.

       THE ORDER IS THE WHOLE DESIGN, so it is stated rather than left to be inferred:
         1. `opts` — the caller has explicit intent. A lead can be corrected, and an
            explicit value must always beat a remembered one.
         2. `readPlan` — the caller's own plan for this regeneration.
         3. THE STORED ROW — what the document was actually registered with. This is the
            restoration, and it is why a regeneration no longer downgrades a working page.
         4. still nothing -> `crmRecordGate` REFUSES, unchanged. For the 80 rows registered
            before today, stored is blank because nobody ever recorded it — UNKNOWN, not
            "no lead" — and refusing is the only honest answer to a question the store
            genuinely cannot answer. The refusal did not relax; it stopped being the ONLY
            outcome. */
    leadId: (opts && opts.leadId) || readPlan.leadId || row.lead_id || '',
    noLeadReason: (opts && opts.noLeadReason) || readPlan.noLeadReason
                  || row.no_lead_reason || '',
  };

  /* Same gate as a fresh build. A regeneration is a build. */
  crmRecordGate(config);

  const html = buildStandaloneHtml(g, config);

  const plan = R.planRegistration(where.absPath, {
    eventId:       row.event_id,
    kind:          'guide',
    builtBy:       row.built_by,
    eventIdSource: row.event_id_source,
    meetingDate:   row.meeting_date,
    person:        row.person || '',
    domain:        row.domain || '',
    channel:       row.channel || 'call',
    callRef:       row.call_ref || null,
    /* THE REGISTRY KEEPS THE CANONICAL PATH. where.absPath is where these bytes land on
       THIS mount; row.local_path is where the document lives. They are the same file
       through two doors, and only one of them is worth recording. */
    localPath:     row.local_path,
    fileId: '', viewUrl: '',
    hostedGap: 'regeneration writes the local copy only — no Drive upload happens here',
    /* The SAME JSON goes back in. A regeneration mints a new kept-state version whose
       source is byte-identical to the one it read: the render changed, the content did
       not, and that is a fact the store should be able to prove later. */
    guideJson:  g,
    /* THE LEAD GOES BACK IN, from the config the gate just approved — not from the row.
       If the caller CORRECTED the lead, this is what persists the correction; if it fell
       back to the stored value, this rewrites the same value and the upsert's CASE reads
       it as ATTACH, which is a no-op. Either way the row and the page agree afterwards,
       which is the property that was missing. */
    leadId:        config.leadId,
    noLeadReason:  config.noLeadReason,
    changeNote: 'regenerated from kept state ' + row.state_id + ' (v' + row.kept_version +
                ') by build ' + BUILD_STAMP + ' — re-render only, no content change',
  });

  fs.writeFileSync(plan.quarantinePath, html, 'utf8');
  const planPath = where.absPath + '.plan.json';
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

  return {
    status: 'regenerated',
    docId: row.doc_id,
    fromKeptState: row.state_id,
    fromVersion: row.kept_version,
    pathVia: where.via,
    planPath,
    resultPath: where.absPath + '.result.json',
    quarantinePath: plan.quarantinePath,
    finalPath: plan.finalPath,
    htmlChars: html.length,
    sql: plan.sql,
    params: plan.params,
  };
}

/* ── CLI ── */
async function main() {
  const argv = process.argv.slice(2);

  /* REGENERATION — two doors, both pure until the very last write. See the block above. */
  if (argv[0] === '--regen-plan') {
    console.log(JSON.stringify(planRegenRead(argv[1]), null, 2));
    return;
  }
  if (argv[0] === '--regen') {
    const ri = argv.indexOf('--rows');
    const wi = argv.indexOf('--workspace-root');
    if (!argv[1] || ri < 0 || !argv[ri + 1]) {
      console.error('Usage: node build-call-guide.js --regen <readplan.json> --rows <rows.json> [--workspace-root <path>]');
      process.exit(1);
    }
    const readPlan = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
    const rows = JSON.parse(fs.readFileSync(argv[ri + 1], 'utf8'));
    const out = regenerate(readPlan, rows,
      { workspaceRoot: wi >= 0 ? argv[wi + 1] : null });
    console.error('✓ Regenerated ' + out.htmlChars + ' chars from kept state ' +
                  out.fromKeptState + ' (v' + out.fromVersion + ')');
    console.error('✓ QUARANTINED at ' + out.quarantinePath);
    console.error('  Path resolved: ' + out.pathVia);
    console.error('');
    console.error('NEXT — two moves, and the session is the wire:');
    console.error('  1. Run plan.sql with plan.params through the board connector, resolved BY');
    console.error('     CATEGORY (Core §11 rule 4). Save the FULL result to ' + out.resultPath);
    console.error('  2. node register-call-doc.js --settle "' + out.planPath + '" \\');
    console.error('       --result "' + out.resultPath + '"');
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const [guidePath, configPath, outPath] = argv;
  if (!guidePath || !configPath || !outPath) {
    console.error('Usage: node build-call-guide.js <guide.json> <config.json> <output.html>');
    process.exit(1);
  }
  const g = JSON.parse(stripFences(fs.readFileSync(guidePath, 'utf8')));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.guideId) config.guideId = 'g' + Date.now();

  /* ── THE GUIDE MUST KNOW ITS OWN doc_id, or its refresh button has no address ──────
     Added 2026-08-07 (S7) with POST /api/cc/call-refresh. The page addresses the door by
     call_doc.doc_id, so the id has to be baked into CONFIG at build time.

     DERIVED THROUGH THE REGISTRAR, NEVER RE-TYPED HERE. deriveDocId is the registrar's own
     rule (kind + slugged event id) and it is exported for exactly this reason. A second copy
     of that rule in this file would be one edit away from addressing a document that does not
     exist — and the door would answer "this guide is not registered", which reads like a
     registration failure rather than a builder bug. One fact, one file.

     The registrar therefore loads BEFORE the html is rendered, not after. It used to load on
     the next line down; moving it up is the whole change. */
  const R = loadRegistrar();
  if (!config.docId) config.docId = R.deriveDocId('guide', config.eventId);

  /* THE CRM-RECORD GATE RUNS BEFORE A BYTE IS RENDERED. Placement is the point: it sits
     beside the conformance guard and the eventId refusal, not after the write, because a
     refusal that fires after the file exists is a cleanup instruction, not a gate. */
  const crm = crmRecordGate(config);

  const html = buildStandaloneHtml(g, config);
  const absOut = path.resolve(outPath);

  /* PLAN FIRST — every shape refusal happens before a single byte is written. */
  const plan = R.planRegistration(absOut, {
    eventId:       config.eventId,
    kind:          'guide',
    builtBy:       config.builtBy || 'call-guide',
    eventIdSource: config.eventIdSource || 'build',
    meetingDate:   config.meetingDate,
    person:        config.prospect || '',
    domain:        config.domain || String(config.email || '').split('@')[1] || '',
    callRef:       config.callRef || null,
    // The hosted half is a STATED gap, never a blank: this builder writes the local copy only.
    fileId: '', viewUrl: '',
    hostedGap: 'builder writes the local copy only — no Drive upload happens at build time',
    /* ── KEPT STATE. Added 2026-08-07 (S5). ─────────────────────────────────────────
       THE GUIDE JSON GOES WITH THE REGISTRATION — same plan, same statement, same
       transaction. Before this, every guide this builder produced was born
       unregenerable: call_guide_state held 0 rows, 39 registered guides had no stored
       source anywhere, and the spec that BUILT that store had already said so in prose
       nobody joined to the plan ("NOT BUILT AND NAMED, never implied: ... THE BUILDER
       WRITING KEPT STATE"). Call-Guide-Content-SPEC-v1.0 §8 D3: no stored JSON means no
       per-segment refresh, ever.

       `g` is the object this builder was handed and rendered FROM — not a re-read of the
       file, not a re-parse of the output. What gets stored is exactly what was built.

       NO CREDENTIAL IS INVOLVED AND NONE IS ADDED. This rides the plan/settle seam that
       already registers call_doc: the SESSION runs plan.sql through the board connector
       resolved BY CATEGORY. This builder's database connection was removed because it
       read a raw password off local disk, and nothing here puts one back. */
    guideJson:  g,
    /* THE DECLARATION TRAVELS WITH THE ROW, not just the build log. A build-time check
       that leaves no trace cannot answer "was this guide's missing lead a decision or an
       accident?" three weeks later — which is the exact question nobody could answer about
       the 12 guides that produced this gate.

       ⚠ UNTIL 2026-08-11 PM THAT SENTENCE WAS ASPIRATIONAL AND THE CODE BELOW IS WHAT
       MAKES IT TRUE. The declaration travelled in `changeNote` — PROSE, on a kept-state
       row, which no query can filter and no check can red. "Travels with the row" was
       being satisfied by a string a human would have to read. It now travels as two
       COLUMNS the store constrains, and the change note keeps its sentence for the
       human. Both, deliberately: the column is what answers a query, the note is what
       answers "why". */
    leadId:        crm.attached ? crm.leadId : '',
    noLeadReason:  crm.attached ? '' : crm.noLeadReason,
    changeNote: 'built by ' + (config.builtBy || 'call-guide')
                + ' from ' + path.basename(guidePath)
                + (crm.attached ? '' : ' — NO CRM RECORD, DECLARED: ' + crm.noLeadReason),
  });

  /* Write to QUARANTINE. This name deliberately does not match the <YYYYMMDD>_<kind>_
     convention, so a leftover can never be mistaken for a real document. */
  fs.writeFileSync(plan.quarantinePath, html, 'utf8');
  const planPath = absOut + '.plan.json';
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

  console.error('✓ Built ' + html.length + ' chars' + ' (' + (buildSectionsHtml(g).total) + ' main sections)');
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
  main().catch((e) => { console.error(e.message); process.exit(e.exitCode || 1); });
}
module.exports = { buildStandaloneHtml, buildSectionsHtml, buildLiveBoardHtml, checkBoardIsCanonical, BOARD_CSS, CC,
                   planRegenRead, regenerate, resolveDocPath, REGEN_READ_SQL, REGEN_EXIT,
                   /* Exported so the gates can be PROVEN rather than asserted. A gate whose
                      behaviour cannot be exercised from a test is a comment with a syntax
                      error waiting to happen — and the first version of this proof correctly
                      refused to run and exited 3 rather than reporting a pass over nothing. */
                   __gates: { crmRecordGate, MIN_NO_LEAD_REASON } };
