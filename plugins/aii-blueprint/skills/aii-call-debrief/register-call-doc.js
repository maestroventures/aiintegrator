#!/usr/bin/env node
/* register-call-doc.js — THE ONE WRITER for the call_doc pointer.
 *
 * ============================================================================
 * WHY THIS EXISTS — read this before changing anything in here.
 * ============================================================================
 * Measured 2026-08-05: build-call-guide.js was 400 lines with two requires (fs, path),
 * ONE write (fs.writeFileSync(outPath, html)) and ZERO occurrences of `call_doc`.
 * build-call-debrief.js: same shape. So THE ACT THAT CREATED A CALL DOCUMENT
 * REGISTERED NOTHING, and every downstream consumer had to REDISCOVER the file by
 * guessing:
 *   - the Command Center ran a Google Drive v3 name-contains search for 'callguide',
 *     filtered to /\.html$/i, then re-derived which meeting it belonged to by
 *     regex-parsing the FILENAME and scoring date + person tokens;
 *   - `call_doc` — the store the governing spec names as the system of record — had
 *     NO WRITER AND NO READER in any executable file in the tree (0 hits across
 *     aii-site/api, lib, and the decoded 1,085,902-char terminal-html.js; 0 across
 *     every .js/.py/.sql/.sh/.json in the workspace; 32 prose hits only).
 *
 * That single omission produced every symptom that has been "fixed" seven times:
 * a guide that exists but reads "Needs guide", a debrief with no provenance, and no
 * offline fallback — because the two LOCATIONS were never recorded either.
 *
 * Call-Guide-Discovery-Fix-SPEC-v1.0 named the root on 2026-06-23:
 *   "every prior fix optimized the GUESSING step. The fix is to REMOVE the guess —
 *    record the meeting->file link when the guide is built, and look it up instead
 *    of reconstructing it."
 * The guess was never removed. This file removes it.
 *
 * THE RULE IT IMPLEMENTS (the operator's ruling, board card
 * fw_registration_at_build_time_never_on_a_schedule_20260802):
 *   "the writer of the state is the ACT that changes it ... so the store cannot drift
 *    from reality without the act itself failing. A scheduled check is then a
 *    redundancy, never the mechanism."
 *
 * ============================================================================
 * WHAT IT REFUSES, AND WHY EACH REFUSAL IS LOAD-BEARING
 * ============================================================================
 * 1. NO SILENT SUCCESS. Every failure throws with the real reason. A registration
 *    that "sort of worked" is the exact shape of the defect this replaces.
 * 2. THE HOSTED HALF IS BICONDITIONAL. Either a real file_id AND view_url AND an
 *    empty hosted_gap, or empty file_id AND empty view_url AND a STATED hosted_gap.
 *    Enforced in Postgres by call_doc_hosted_pairing_ck; enforced here FIRST so the
 *    caller gets a sentence instead of a constraint name. "the Drive mirror does not
 *    have it" and "nobody looked" must never be the same blank.
 * 3. VOCABULARY COMES FROM THE REGISTRY, NOT FROM THIS FILE. `kind`, `built_by` and
 *    `event_id_source` are canonical terms in term_registry domain `call-artifact`
 *    (registered 2026-08-05), walled by call_doc_kind_ck / call_doc_built_by_ck /
 *    call_doc_event_id_source_ck. THIS MODULE DELIBERATELY CARRIES NO VALUE LIST —
 *    it reads the allowed values out of term_registry at run time and refuses on a
 *    miss. A value list typed into a script is the precise defect the vocabulary
 *    registry exists to end (see no_vocabulary_drift.py, which refuses to run
 *    without a snapshot for exactly this reason).
 * 4. THERE IS NO LEGAL VALUE FOR A HAND-TYPED GUIDE, and there must not be one.
 *    Found live 2026-08-05: a chat session hand-wrote a markdown "call brief" for a
 *    prospect's 10:00 call, delivered it as a chat file, and had to register it as
 *    `manual` — the closest LEGAL value and not an honest one. The operator, verbatim:
 *    "Just because it's scaled down doesn't mean it doesn't need to be a part of
 *    this entire process." `manual` stays legal ONLY so an accident can be recorded
 *    rather than hidden.
 * 5. THE CAPABILITY IS RESOLVED BY CATEGORY, NEVER BY TABLE NAME (Core §11 rule 4).
 *    Before writing, it asserts capability call-doc-map/record_call_doc resolves to a
 *    live connector. If someone retires that capability, this module goes red instead
 *    of writing into a store nothing reads — the r11 defect (145 rows, 66% of
 *    everything learned, invisible to the resolver) applied one level up.
 *
 * ============================================================================
 * USE
 * ============================================================================
 * ⚠ THE API CHANGED 2026-08-06 (T1·S88). The old `registerCallDoc` / `registerOrUnlink`
 * opened their own database connection and are GONE — see "THE CREDENTIAL DOOR IS GONE"
 * below. The old text is quoted here rather than deleted, because a session that
 * remembers it would faithfully re-create the door:
 *     const { registerCallDoc, registerOrUnlink } = require('<path>/register-call-doc');
 *     // In a builder, AFTER fs.writeFileSync(outPath, html):
 *     await registerOrUnlink(outPath, { ... });
 *
 * THE FLOW NOW — three moves, and the file gets its real name only on the third:
 *
 *   1. PLAN (in the builder, BEFORE writing a byte)
 *        const R = require('<path>/register-call-doc');
 *        const plan = R.planRegistration(outPath, { ...fields });   // throws on bad shape
 *        fs.writeFileSync(plan.quarantinePath, html);               // NOT outPath
 *        // print plan as JSON for the session
 *
 *   2. RUN (the session is the wire)
 *        run plan.sql with plan.params through the board connector, resolved BY
 *        CATEGORY (Core §11 rule 4). Save the FULL result.
 *
 *   3. SETTLE (promote or destroy)
 *        node register-call-doc.js --settle <plan.json> --result <result.json>
 *        registered -> the quarantine file is renamed to its real name.
 *        refused / zero rows -> the quarantine file is DELETED and it throws.
 *
 * The fields are unchanged:
 *   {
 *     eventId:  '<calendar event id>',
 *     kind:     'guide',              // or 'debrief'
 *     builtBy:  'call-guide',         // or 'call-debrief' / 'auto-guide-debrief-sweep'
 *     eventIdSource: 'build',
 *     meetingDate: '20260805',        // YYYYMMDD, must equal the filename's date slot
 *     person:  'Pat Doe',
 *     domain:  'acme.co',
 *     localPath: outPath,             // ABSOLUTE, must end with fileTitle
 *     // hosted half — supply EITHER of these two shapes, never a blank:
 *     fileId: '', viewUrl: '', hostedGap: 'not uploaded to the Drive mirror at build time',
 *     callRef: null,                  // Fireflies transcript id — debriefs should carry it
 *   }
 *
 * AN UNREGISTERED CALL DOCUMENT CANNOT EXIST — and that is now STRUCTURAL, not
 * best-effort. The old order wrote the file, then registered, then deleted on failure,
 * so a process killed in between left an unregistered document behind forever. Writing
 * to quarantine and promoting only on a proven row closes that window.
 *
 * THE THIRD MOVE, ADDED 2026-08-07 (S11) — CONFIRM, for a document that is ALREADY named.
 *
 *   Piece 7 of this lane (`call-doc-landing-watch`) does not build anything. It watches for
 *   the hosted mirror to finally receive a document that was built days ago, and flips the
 *   hosted half of the row it already has. There is nothing to promote, so plan/settle is
 *   the wrong pair — it would throw on a quarantine file that does not exist.
 *
 *     1. read the row back:   R.lookupSql(eventId, kind)  ->  run it  ->  the row
 *     2. CONFIRM:             const p = R.confirmHosted(row, { fileId, viewUrl });
 *     3. run p.sql / p.params through the board connector, resolved BY CATEGORY
 *     4. CONFIRM-SETTLE:      R.confirmSettle(p, result)   // touches NO file, ever
 *
 *   Both halves of { fileId, viewUrl } must have been read from the hosted store in THAT
 *   run. It is the SAME validateShape and the SAME GUARDED_UPSERT — no second writer, no
 *   raw UPDATE, and no new vocabulary: `built_by` stays whatever BUILT the document.
 *
 * CLI:
 *   node register-call-doc.js --self-test                              prove the refusals
 *   node register-call-doc.js --plan <finalPath> <fields.json>         emit the plan
 *   node register-call-doc.js --settle <plan.json> --result <res.json> promote or destroy
 *   node register-call-doc.js --lookup-sql <eventId> [kind]            emit the read SQL
 *
 * There is no flag that opens a database, on purpose.
 *
 * CLOUD MODE — localPath: null. Added 2026-09-17 (an internal card).
 *   A document built in a cloud container has NO operator path. Writing a made-up Mac path to
 *   satisfy a CHECK was the lie body v17 of auto-guide-debrief-sweep had to tell. So:
 *     - localPath === null (exactly null — never '', never absent) means "no operator path".
 *       The two path checks (absolute, ends with the title) are SKIPPED; they still hold for
 *       every non-null path.
 *     - fileTitle is then required, or derived from the basename of the settled file.
 *     - a PLAN in cloud mode must STATE hostedGap (e.g. 'cloud filing pending (<run_id>)'):
 *       the row exists before the file is filed, and it has to say so.
 *     - a CONFIRM on a row whose local_path is NULL is legal: the hosted pair is then the only
 *       copy, which is exactly what cloud filing produces.
 *     - the STATEMENT refuses (a row, not a raise) when local_path is null and this company's
 *       call_doc.local_path is still NOT NULL — i.e. 20260917-call-doc-cloud-filing.sql has
 *       not run here. A raise would strand the quarantine file; a refusal row destroys it.
 *   A disk plan (localPath absent -> defaults to the final path, or a real absolute path) is
 *   byte-for-byte the plan it was before.
 *
 * TENANT: resolved from AIOS_TENANT, else this seat's own tenant. Never hardcode a
 * tenant in a caller.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TENANT = process.env.AIOS_TENANT || 'bryce';
const TERM_DOMAIN = 'call-artifact';
const CAP_CATEGORY = 'call-doc-map';
const CAP_ACTION = 'record_call_doc';

/* ════════════════════════════════════════════════════════════════════════════
 * THE CREDENTIAL DOOR IS GONE — 2026-08-06 (T1·S88). DO NOT PUT IT BACK.
 * ════════════════════════════════════════════════════════════════════════════
 * This module used to `require('pg')` and `require('./board-conn')`, and board-conn.js
 * reads a raw postgres:// URL off local disk (~/aios-workshop/hub.env -> BOARD_DATABASE_URL).
 * That is exactly the door the operator deleted on 2026-08-02 on purpose — "a dead credential
 * path is an invitation to go satisfy it" — and the same defect class as an internal
 * card of 2026-08-04 recorded against it
 * (Connector-Build-Standard §13 / Core §8 rule 6).
 *
 * It mattered here for a second reason: aii-call-guide and aii-call-debrief could not
 * ship in the Blueprint plugin while this chain existed, because shipping them would
 * have put a code path wanting a local database URL on every client's machine. Cutting
 * the door is what makes those two skills shippable — the packer was never the blocker
 * for them (an internal card of 2026-08-05, step C).
 *
 * WHAT REPLACED IT: the session is the wire. This module RETURNS SQL; a session runs it
 * through the connector resolved BY CATEGORY (Core §11 rule 4). Same pattern, same
 * reason, as 04/scripts/memory-manifest-read.js — a Cowork sandbox has NO network
 * egress, so a module that opens its own connection is a module that only ever worked
 * on one machine.
 *
 * NOTHING WAS WEAKENED BY THE CUT — the two registry guards moved INTO the statement.
 * They used to be two extra round-trips with JS-side throws. They are now CTEs in the
 * one statement, so a vocabulary miss or a dead capability makes the INSERT match zero
 * rows and returns a `refused` row naming the reason. Fewer round-trips AND the guard
 * can no longer be skipped by a caller that decides to write the row itself.
 *
 * After this cut the whole call-doc chain needs only `fs` and `path`. No pg, no npm,
 * no credential, no local database — on the operator's seat and on a client's alike.
 */

/* ── validation that happens BEFORE any byte is written, so the caller gets a sentence ── */

function reqStr(v, name, errs) {
  if (typeof v !== 'string' || !v.trim()) errs.push(`${name} is required and must be a non-empty string`);
  return v;
}

/** Shape checks that mirror the Postgres CHECKs, stated in plain language. */
function validateShape(f) {
  const errs = [];

  reqStr(f.eventId, 'eventId', errs);
  if (typeof f.eventId === 'string' && /\s/.test(f.eventId)) {
    errs.push('eventId must not contain whitespace (call_doc_event_id_ck)');
  }
  reqStr(f.kind, 'kind', errs);
  reqStr(f.builtBy, 'builtBy', errs);
  reqStr(f.eventIdSource, 'eventIdSource', errs);
  /* CLOUD MODE (2026-09-17). Only an EXPLICIT null means "no operator path". An empty string
     or a missing key is still refused here, because '' and "forgot" must never read as the
     deliberate cloud case — the same NULL-vs-blank rule the hosted half below lives by. */
  const cloud = f.localPath === null;
  if (!cloud) reqStr(f.localPath, 'localPath', errs);

  if (!/^\d{8}$/.test(String(f.meetingDate || ''))) {
    errs.push('meetingDate must be exactly YYYYMMDD (call_doc_date_ck)');
  }

  const fileTitle = f.fileTitle || (f.localPath ? path.basename(f.localPath) : '');
  if (!fileTitle) {
    errs.push(cloud
      ? 'fileTitle is required when localPath is null (cloud mode) — there is no path to derive it from'
      : 'fileTitle could not be derived — pass localPath or fileTitle');
  }

  if (f.localPath && !String(f.localPath).startsWith('/')) {
    errs.push('localPath must be ABSOLUTE (call_doc_local_path_ck). LOCAL IS TRUTH — a relative ' +
      'path is only true on the machine that wrote it, which is the machine that already knows.');
  }
  if (f.localPath && fileTitle && !String(f.localPath).endsWith('/' + fileTitle)) {
    errs.push(`localPath must END with the file title (call_doc_path_holds_title_ck): ` +
      `path=${f.localPath} title=${fileTitle}`);
  }

  // The filename convention is what the FALLBACK scorer reads. It stays enforced even
  // though the pointer supersedes it, because the backfill can never be complete.
  const kindSlot = f.kind === 'debrief' ? 'debrief' : 'callguide';
  if (fileTitle && !new RegExp('^\\d{8}_' + kindSlot + '_').test(fileTitle)) {
    errs.push(`fileTitle must start with <YYYYMMDD>_${kindSlot}_ (call_doc_title_kind_slot_ck): got "${fileTitle}"`);
  }
  if (fileTitle && f.meetingDate && fileTitle.slice(0, 8) !== String(f.meetingDate)) {
    errs.push(`the date in fileTitle must equal meetingDate (call_doc_title_date_slot_ck): ` +
      `title says ${fileTitle.slice(0, 8)}, meetingDate says ${f.meetingDate}`);
  }

  // THE BICONDITIONAL. This is the NULL-vs-0 rule and it is the one most likely to be
  // "simplified" by a future edit. Do not.
  const fileId = f.fileId == null ? '' : String(f.fileId);
  const viewUrl = f.viewUrl == null ? '' : String(f.viewUrl);
  const hostedGap = f.hostedGap == null ? '' : String(f.hostedGap);
  const hasHosted = fileId !== '' && viewUrl !== '';
  const hasGap = hostedGap.trim() !== '';
  if (hasHosted && hasGap) {
    errs.push('hosted half: you supplied fileId+viewUrl AND a hostedGap. Pick one — a gap reason ' +
      'alongside a real hosted copy is a contradiction (call_doc_hosted_pairing_ck).');
  }
  if (!hasHosted && !hasGap) {
    errs.push('hosted half: no fileId/viewUrl AND no hostedGap. STATE WHY there is no hosted copy — ' +
      '"the Drive mirror does not have it" and "nobody looked" must not be the same blank ' +
      '(call_doc_hosted_pairing_ck). Core §5.8: the hosted copy is the convenience, the local ' +
      'copy is the truth — but a missing convenience still has to say so.');
  }
  if (!hasHosted && (fileId !== '' || viewUrl !== '')) {
    errs.push('hosted half: fileId and viewUrl must BOTH be present or BOTH be empty.');
  }

  if (f.callRef != null && (String(f.callRef).trim() === '' || /\s/.test(String(f.callRef)))) {
    errs.push('callRef, when supplied, must be non-empty and contain no whitespace (call_doc_call_ref_ck)');
  }
  if (f.kind === 'debrief' && !f.callRef) {
    errs.push('a DEBRIEF must carry callRef (the Fireflies transcript id). It is the only id that ' +
      'joins the debrief file to the feedback captured from the same call — three different ids ' +
      'described one call until call_doc carried this one. Pass it explicitly, or pass ' +
      'allowMissingCallRef:true and say why in hostedGap.');
  }

  return { errs, fileTitle, fileId, viewUrl, hostedGap };
}

/** doc_id is derived, never guessed: kind + event id, slugged. Stable across rebuilds. */
function deriveDocId(kind, eventId) {
  const slug = String(eventId).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 48);
  return `cd_${kind}_${slug}`;
}

/* ── THE ONE STATEMENT ──────────────────────────────────────────────────────────────
 * Every guard this module used to enforce over three round-trips now lives inside ONE
 * statement, so it cannot be skipped by a caller who decides to write the row directly:
 *
 *   terms      reads term_registry for the three canonical call_doc terms
 *   vocab_gap  one reason row per bad value, plus one if the registry read is partial
 *   cap        resolves call-doc-map/record_call_doc BY CATEGORY (Core §11 rule 4)
 *   cap_gap    one reason row if that resolves to no live connector
 *   ins        the upsert, gated on `NOT EXISTS (SELECT 1 FROM gap)`
 *
 * It returns EXACTLY ONE row, always, and the row says which happened:
 *   outcome='registered' -> doc_id, update_count, was_insert, resolved_via
 *   outcome='refused'    -> reason (one row PER reason, so several may come back)
 * ZERO rows is never "fine". It means the statement never ran, and settle() treats it
 * as a hard refusal — the same discipline as the session-log ownership guard, where an
 * empty result had to stop meaning "already ok".
 *
 * PROVEN BOTH WAYS ON THE LIVE STORE, 2026-08-06 (T1·S88), not on a fixture:
 *   refused  builtBy='bogus-builder' -> one reason row naming the five allowed values,
 *            and a follow-up count confirmed ZERO rows were written.
 *   registered  the same statement with builtBy='call-guide' -> was_insert=true,
 *            resolved_via='blueprint (run_sql, rank 10)'. The probe row was deleted in
 *            the same session.
 */
const GUARDED_UPSERT = `
WITH in_f AS (
  SELECT $1::text  AS doc_id,      $2::text  AS tenant_id,  $3::text AS event_id,
         $4::text  AS kind,        $5::text  AS call_ref,   $6::text AS meeting_date,
         $7::text  AS person,      $8::text  AS domain,     $9::text AS channel,
         $10::text AS file_title,  $11::text AS local_path, $12::text AS file_id,
         $13::text AS view_url,    $14::text AS hosted_gap, $15::text AS built_by,
         $16::text AS event_id_source,
         /* KEPT STATE — added 2026-08-07 (S5). $17 is the guide JSON the builder was
            handed; $18 an optional change note; $19 says whether THIS caller is required
            to produce kept state. A confirm passes (NULL, NULL, false) because it is
            flipping the hosted half of a document that was built days ago — it must not
            mint a new version. */
         $17::jsonb AS guide_json, $18::text AS change_note, $19::boolean AS require_kept,
         /* THE LEAD — added 2026-08-11. $20 is the CRM lead id this document belongs to;
            $21 is the human sentence declaring, on purpose, that there is no single lead.
            They are the storage half of crmRecordGate, which until today lived ONLY in the
            two builders — so the store could not answer "which lead was this built for?"
            and a regeneration was born with a dead Save button by construction.

            THREE STATES, AND THEY ARE NOT TWO. call_doc_lead_declaration_ck makes them
            structural rather than a convention a writer has to remember:
              ATTACHED  lead_id <> ''  AND no_lead_reason = ''
              DECLARED  lead_id =  ''  AND length(no_lead_reason) >= 12
              UNKNOWN   lead_id =  ''  AND no_lead_reason = ''
            UNKNOWN is what all 80 pre-existing rows are, and it is the honest value: nobody
            ever recorded the lead for them. It must NEVER be read as "this call has no
            lead" — that is DECLARED, and only a human sentence can say it. The whole
            original defect was that a deliberate empty and an accidental one looked
            identical; a backfilled default that collapsed them would restore it. */
         $20::text AS lead_id, $21::text AS no_lead_reason
),
terms AS (
  /* TIER WALK, TENANT WINS — changed 2026-09-15 (a session that day, on an internal card).
     This read used to be tenant_id = the tenant ONLY. At 04:25:13Z and 06:45:48Z that day the
     three words were promoted to __house__ and the tenant copies superseded, so it returned
     0 of 3 and refused every call document on every seat. Now: __house__ and the tenant, and
     per term the tenant row wins when it has one — the same walk as term_list_for_tenant.
     The 3-of-3 rule below is unchanged: a word at NEITHER tier is still refused. */
  SELECT DISTINCT ON (term) term, allowed FROM term_registry
   WHERE tenant_id IN ((SELECT tenant_id FROM in_f), '__house__')
     AND domain = '${TERM_DOMAIN}' AND status = 'canonical'
     /* A TERM NAME IS A BARE WORD, scoped by its domain — ruled 2026-08-12,
        dr_OPEN_term_name_spelling_20260812_160306. These three were renamed out of a
        dotted table-dot-column spelling that day. The retired names still resolve
        through term_alias, but this is a term_registry read keyed on the term column
        itself, so an alias does NOT save it — it returned 0 of 3 until 2026-08-12.
        NO BACKTICKS IN THIS COMMENT ON PURPOSE: it lives inside a JS template
        literal, and the first draft of this very line closed the string. */
     AND term IN ('kind','built_by','event_id_source')
   /* THE ORDER BY IS WHAT MAKES "TENANT WINS" TRUE. DISTINCT ON keeps the FIRST row per term,
      and with no ORDER BY that is whichever row Postgres happens to return. */
   ORDER BY term, (tenant_id = (SELECT tenant_id FROM in_f)) DESC
),
asked AS (
  SELECT 'kind' AS field, 'kind' AS term, kind AS val FROM in_f
  UNION ALL SELECT 'builtBy',       'built_by',        built_by        FROM in_f
  UNION ALL SELECT 'eventIdSource', 'event_id_source', event_id_source FROM in_f
),
vocab_gap AS (
  SELECT 'VOCABULARY: term_registry domain ${TERM_DOMAIN} returned '
         || (SELECT count(*) FROM terms)
         || ' of 3 canonical terms. REFUSING to write — a partial or empty registry read is '
         || '"I could not look", never "anything goes".' AS reason
   WHERE (SELECT count(*) FROM terms) <> 3
  UNION ALL
  SELECT 'VOCABULARY: ' || a.field || '="' || a.val || '" is not a canonical value of ' || '${TERM_DOMAIN}/' || a.term
         || '. Allowed: '
         || (SELECT string_agg(k, ' | ' ORDER BY k) FROM jsonb_object_keys(t.allowed) AS k)
         || '. Do not add a new spelling in code — register it in term_registry.'
    FROM asked a JOIN terms t ON t.term = a.term
   WHERE NOT (t.allowed ? a.val)
),
cap AS (
  SELECT cc.connector_id, cc.tool_method, cc.preference_rank
    FROM capability c JOIN connector_capability cc ON cc.capability_id = c.id
   WHERE c.category = '${CAP_CATEGORY}' AND c.action = '${CAP_ACTION}' AND cc.verdict = 'CAN'
   ORDER BY cc.preference_rank LIMIT 1
),
cap_gap AS (
  SELECT 'CAPABILITY: ${CAP_CATEGORY}/${CAP_ACTION} resolves to NO live connector. REFUSING '
         || 'to write. Core §11 rule 4 — resolve by CATEGORY, never by a table or connector '
         || 'name. If the capability was retired, this must go red rather than keep writing '
         || 'into a store nothing reads.' AS reason
   WHERE NOT EXISTS (SELECT 1 FROM cap)
),
/* ── KEPT-STATE GAP. Added 2026-08-07 (S5). ────────────────────────────────────────
   A guide that registers with no stored source is born unregenerable — Call-Guide-
   Content-SPEC-v1.0 §8 D3, "no stored JSON means no per-segment refresh, ever." That
   is the defect that took call_guide_state to 0 rows with a 16/16 proof gate sitting
   on it, so this refuses the WHOLE registration rather than landing the guide anyway.

   WHY IT IS A DESIGNED REFUSAL AND NOT LEFT TO THE CHECK CONSTRAINT: cgs_json_has_
   sections_ck RAISES. A raise aborts the statement, the caller sees an error instead
   of an outcome row, --settle never runs, and the quarantine file is left on disk
   forever — the exact "unregistered document" state this module was rebuilt to make
   impossible. A refusal reason comes back as a ROW, settle deletes the quarantine, and
   the operator gets a sentence they can act on.

   NOT GUARDED HERE, ON PURPOSE: built_by. term_registry's call-artifact/built_by vocabulary
   (manual | backfill | call-guide | call-debrief | auto-guide-debrief-sweep) is a strict
   SUBSET of cgs_built_by_ck's list, so anything that clears the vocab gate above clears
   that constraint by construction. Measured 2026-08-07, both lists read live. A second
   copy of a value list is the drift this file already refuses everywhere else. */
kept_gap AS (
  SELECT 'KEPT STATE: kind=guide and no guide_json was handed to the plan. A guide with '
         || 'no stored source can never be refreshed per-segment (Call-Guide-Content-SPEC '
         || '§8 D3), so it is born unregenerable. REFUSING the registration — the builder '
         || 'has the guide JSON in hand and must pass it through planRegistration.' AS reason
   WHERE (SELECT require_kept FROM in_f) AND (SELECT guide_json FROM in_f) IS NULL
  UNION ALL
  SELECT 'KEPT STATE: guide_json carries no non-empty sections[] array. '
         || 'cgs_json_has_sections_ck would refuse the row, and a guide whose stored '
         || 'source has no sections is not a source. Got sections type: '
         || coalesce(jsonb_typeof((SELECT guide_json FROM in_f) -> 'sections'), 'ABSENT')
   WHERE (SELECT require_kept FROM in_f) AND (SELECT guide_json FROM in_f) IS NOT NULL
     AND coalesce(jsonb_array_length(
           CASE WHEN jsonb_typeof((SELECT guide_json FROM in_f) -> 'sections') = 'array'
                THEN (SELECT guide_json FROM in_f) -> 'sections' END), 0) = 0
),
/* ── CLOUD-FILING GAP. Added 2026-09-17. ──────────────────────────────────────────
   A NULL local_path is legal only after the company-database migration
   20260917-call-doc-cloud-filing.sql has made the column nullable. Before it, the INSERT
   would RAISE on NOT NULL, the caller would get an error instead of an outcome row, settle
   would never run and the quarantine file would sit on disk forever. So the statement looks
   first and refuses as a ROW, naming the migration. A disk plan never trips this. */
path_gap AS (
  SELECT 'CLOUD FILING: local_path is NULL (a cloud-built document with no operator path) but '
         || 'call_doc.local_path on this store is still NOT NULL. The company-database migration '
         || '20260917-call-doc-cloud-filing.sql has not run here. REFUSING - never write a made-up '
         || 'operator path to get past this.' AS reason
   WHERE (SELECT local_path FROM in_f) IS NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_name = 'call_doc' AND c.column_name = 'local_path'
                    AND c.is_nullable = 'NO'
                    AND c.table_schema = ANY (current_schemas(false)))
),
gap AS (SELECT reason FROM vocab_gap UNION ALL SELECT reason FROM cap_gap
        UNION ALL SELECT reason FROM kept_gap UNION ALL SELECT reason FROM path_gap),
ins AS (
  INSERT INTO call_doc (doc_id, tenant_id, event_id, kind, call_ref, meeting_date, person, domain,
                        channel, file_title, local_path, file_id, view_url, hosted_gap, built_by,
                        event_id_source, lead_id, no_lead_reason, update_count, first_built_at,
                        updated_at)
  SELECT doc_id, tenant_id, event_id, kind, nullif(call_ref,''), meeting_date, person, domain,
         channel, file_title, local_path, file_id, view_url, hosted_gap, built_by,
         event_id_source, lead_id, no_lead_reason, 0, now(), now()
    FROM in_f
   WHERE NOT EXISTS (SELECT 1 FROM gap)
  ON CONFLICT (tenant_id, event_id, kind) DO UPDATE SET
    call_ref        = COALESCE(EXCLUDED.call_ref, call_doc.call_ref),
    /* ── THE LEAD PAIR MOVES TOGETHER, AND SILENCE IS NOT AN INSTRUCTION. ────────────
       A plain "= EXCLUDED.lead_id" would be a silent half-write: the confirm door and
       any legacy caller rebuild the WHOLE row through this same statement, so a caller
       that never had an opinion about the lead would blank a perfectly good one on its
       way past. That is the defect this store was built to end, arriving through the
       door built to close it — the same shape as the regeneration that reproduced the
       dead Save button.

       So the three input states are read as three different INSTRUCTIONS:
         a lead id came in      -> ATTACH it, and clear any stale declaration
         only a reason came in  -> DETACH on purpose, and keep the sentence
         neither came in        -> THE CALLER SAID NOTHING. Change neither column.
       The last branch is what makes confirmHosted safe, and it is why a confirm can go
       on passing the row it read back without ever needing to understand the lead. */
    lead_id         = CASE WHEN nullif(EXCLUDED.lead_id, '')        IS NOT NULL THEN EXCLUDED.lead_id
                           WHEN nullif(EXCLUDED.no_lead_reason, '') IS NOT NULL THEN ''
                           ELSE call_doc.lead_id END,
    no_lead_reason  = CASE WHEN nullif(EXCLUDED.lead_id, '')        IS NOT NULL THEN ''
                           WHEN nullif(EXCLUDED.no_lead_reason, '') IS NOT NULL THEN EXCLUDED.no_lead_reason
                           ELSE call_doc.no_lead_reason END,
    meeting_date    = EXCLUDED.meeting_date,
    person          = EXCLUDED.person,
    domain          = EXCLUDED.domain,
    channel         = EXCLUDED.channel,
    file_title      = EXCLUDED.file_title,
    local_path      = EXCLUDED.local_path,
    file_id         = EXCLUDED.file_id,
    view_url        = EXCLUDED.view_url,
    hosted_gap      = EXCLUDED.hosted_gap,
    built_by        = EXCLUDED.built_by,
    event_id_source = EXCLUDED.event_id_source,
    update_count    = call_doc.update_count + 1,
    updated_at      = now()
  RETURNING doc_id, update_count, first_built_at, updated_at, (xmax = 0) AS was_insert
),
/* ── THE KEPT-STATE WRITE. Added 2026-08-07 (S5). ──────────────────────────────────
   IT IS THE SAME STATEMENT ON PURPOSE, and that is the load-bearing choice. Three
   things fall out of it that a second call could not give us:
     1. call_guide_state.doc_id is an FK to call_doc(doc_id). Chaining off the ins CTE means
        the parent row is guaranteed to exist — no ordering for a caller to get wrong.
     2. If the registration is REFUSED, the ins CTE is empty, so this selects nothing. A
        refused guide cannot leave orphan kept state behind.
     3. One statement is one transaction. There is no window in which a guide is
        registered and unregenerable, which is the exact state this card exists to end.
   And the session still runs ONE sql with ONE params array, so the plan/settle contract
   — and every caller of it — is unchanged. No credential goes near the builder.

   VERSION IS DERIVED, NEVER TYPED 1. The card said "version 1 is the only clean insert
   shape at build time" and that is true of a FIRST build only. A rebuild is real and
   routine (cd_guide_1tti0gb0tpr91lpp87d7ncia8e was rebuilt 2026-08-07, update_count 1),
   and a hardcoded 1 would collide with cgs_one_version_per_doc and abort the whole
   registration on the second build of any guide. So: max(version)+1, and a change_note
   is always present at v>1 because cgs_change_is_declared_ck refuses a bare bump. */
kept AS (
  INSERT INTO call_guide_state
    (state_id, tenant_id, doc_id, version, guide_json, notes_json, changed_segments,
     change_note, built_by)
  SELECT 'cgs_' || i.doc_id || '_v' || nv.v, f.tenant_id, i.doc_id, nv.v,
         f.guide_json, '{}'::jsonb, '{}'::text[],
         CASE WHEN nv.v = 1 THEN nullif(btrim(coalesce(f.change_note, '')), '')
              ELSE coalesce(nullif(btrim(coalesce(f.change_note, '')), ''),
                            'whole-guide rebuild by ' || f.built_by
                            || ' — the builder supplied no per-segment note') END,
         f.built_by
    FROM ins i
    CROSS JOIN in_f f
    CROSS JOIN LATERAL (
      SELECT coalesce(max(s.version), 0) + 1 AS v
        FROM call_guide_state s
       WHERE s.tenant_id = f.tenant_id AND s.doc_id = i.doc_id) nv
   WHERE f.guide_json IS NOT NULL
  RETURNING state_id, version
)
SELECT 'registered'::text AS outcome, i.doc_id, i.update_count, i.first_built_at, i.updated_at,
       i.was_insert,
       (SELECT connector_id || ' (' || tool_method || ', rank ' || preference_rank || ')' FROM cap)
         AS resolved_via,
       NULL::text AS reason,
       (SELECT state_id FROM kept) AS kept_state_id,
       (SELECT version  FROM kept) AS kept_version
  FROM ins i
UNION ALL
SELECT 'refused', NULL::text, NULL::integer, NULL::timestamptz, NULL::timestamptz,
       NULL::boolean, NULL::text, g.reason, NULL::text, NULL::integer
  FROM gap g`;

const LOOKUP = `
SELECT * FROM call_doc
 WHERE tenant_id = $1 AND event_id = $2
   AND ($3::text IS NULL OR kind = $3::text)`;

/* ── phase 1: PLAN. Pure. No network, no filesystem, no credential. ──────────────────
 * Call this BEFORE writing a single byte. Every shape refusal happens here, which is
 * strictly stronger than the old order: the old registerOrUnlink() wrote the file, then
 * refused, then deleted it — so a process killed between the write and the register left
 * an unregistered document behind forever. Now the builder writes to plan.quarantinePath
 * and only settle() gives it its real name, so an unregistered call document cannot exist
 * even if this process dies mid-flight. That was the whole promise; it is now structural
 * instead of best-effort.
 */
function planRegistration(finalFilePath, fields, opts = {}) {
  const f = Object.assign({ localPath: finalFilePath }, fields);
  if (f.kind === 'debrief' && opts.allowMissingCallRef) f.callRef = f.callRef || null;

  /* CLOUD MODE (2026-09-17): no operator path. The title comes from the caller or from the
     settled file's own name — never from a path that does not exist. */
  const cloud = f.localPath === null;
  if (cloud && !f.fileTitle && finalFilePath) f.fileTitle = path.basename(String(finalFilePath));

  const v = validateShape(f);
  let errs = v.errs;
  if (opts.allowMissingCallRef) {
    errs = errs.filter((e) => !e.startsWith('a DEBRIEF must carry callRef'));
  }
  if (cloud) {
    if (!String(v.hostedGap).trim()) {
      errs.push('cloud mode (localPath null) requires a STATED hostedGap, e.g. "cloud filing pending ' +
        '(<run_id>)". The row is written before the file is filed; with no operator path and no ' +
        'hosted copy yet, the gap sentence is the only honest thing the row can say.');
    }
    if (v.fileTitle && finalFilePath && path.basename(String(finalFilePath)) !== v.fileTitle) {
      errs.push('cloud mode: the settled file name must equal fileTitle, or the file uploaded is not ' +
        'the one registered: settled=' + path.basename(String(finalFilePath)) + ' title=' + v.fileTitle);
    }
  }
  if (errs.length) {
    throw new Error('register-call-doc: refused before writing anything.\n  - ' + errs.join('\n  - '));
  }

  const docId = f.docId || deriveDocId(f.kind, f.eventId);

  /* KEPT STATE — added 2026-08-07 (S5). A GUIDE must carry the JSON it was built from,
     or it is born unregenerable. The flag is what the SQL reads to decide whether to
     refuse; it is set from the KIND, never from whether the caller happened to pass
     something, so "I forgot" and "there is nothing to pass" cannot look the same. */
  /* ⚠ WIDENED 2026-09-17, and the widening is OPT-IN rather than by kind. The rule above
     stays exactly as it was written — set from the KIND, so "I forgot" and "there is nothing
     to pass" cannot look the same — and `opts.requireKept` lets a CALLER that knows it has a
     source demand the same red for a kind this file does not yet require it of.
     WHY NOT JUST ADD 'debrief' TO THE KIND TEST: confirmHosted() rebuilds the WHOLE row
     through this same guarded statement with guide_json NULL and require_kept false, days
     after the build. Making the requirement follow the kind would make every debrief's
     hosted confirm refusable by kept_gap — the door built to close a gap, refused by the
     guard built to close another. So the builder asks for the red on its own build, and the
     confirm door is untouched. build-call-debrief.js passes it. */
  const requireKept = opts.requireKept === true || f.kind === 'guide';
  const guideJson = (f.guideJson === undefined || f.guideJson === null)
    ? null : JSON.stringify(f.guideJson);

  return {
    _what_this_is: 'A call_doc registration PLAN. Run `sql` with `params` through the board ' +
      'connector (resolved BY CATEGORY, never by name), save the FULL result, then hand both ' +
      'to `register-call-doc.js --settle <plan.json> --result <result.json>`.',
    docId,
    tenant: TENANT,
    /* Present ONLY in cloud mode (true = registered with NO operator path, local_path NULL);
       settle() reads it. Absent on a disk plan so a disk plan.json stays byte-identical. */
    ...(cloud ? { cloud: true } : {}),
    finalPath: finalFilePath,
    quarantinePath: quarantinePathFor(finalFilePath),
    /* settle() JUDGES this. A guide whose result comes back with no kept_state_id is a
       guide that registered unregenerable, and settle destroys it rather than promoting
       it — the reader that makes the write real. */
    keptState: requireKept,
    sql: GUARDED_UPSERT,
    params: [
      docId, TENANT, f.eventId, f.kind, f.callRef || '', String(f.meetingDate),
      f.person || '', f.domain || '', f.channel || 'call', v.fileTitle, cloud ? null : f.localPath,
      v.fileId, v.viewUrl, v.hostedGap, f.builtBy, f.eventIdSource,
      guideJson, f.changeNote || null, requireKept,
      /* THE LEAD — added 2026-08-11. Deliberately NOT validated here: crmRecordGate in
         each builder owns the RULE (an empty lead must be declared in a real sentence)
         and call_doc_lead_declaration_ck owns the SHAPE. A third copy of the same
         assertion in this file would be one more place for it to drift. What this door
         owes is faithful carriage, and passing '' when the caller said nothing is the
         instruction the upsert reads as "change neither column". */
      f.leadId || '', f.noLeadReason || '',
    ],
  };
}

/* The quarantine name is deliberately NOT a valid call-doc filename — it does not match
   the <YYYYMMDD>_<kind>_ convention the fallback scorer reads, so a leftover quarantine
   file can never be mistaken for a real document by the very scorer this store replaced. */
function quarantinePathFor(finalFilePath) {
  const dir = path.dirname(finalFilePath);
  return path.join(dir, '_unregistered-' + path.basename(finalFilePath) + '.part');
}

/* ── phase 1b: CONFIRM. The hosted half of an ALREADY-PROMOTED document. ─────────────
 * Added 2026-08-07 (S11) for piece 7 of the call-document lane, `call-doc-landing-watch`.
 *
 * That job builds nothing. The document was built, named and shipped days earlier and
 * already sits at its final path; the only thing that changed is that the hosted mirror
 * finally has a copy of it. So this door does the ONE thing plan/settle cannot: it flips
 * the hosted half from ('', '', '<honest gap reason>') to (file_id, view_url, '') and
 * TOUCHES NO FILE. Handing that work to planRegistration() would throw on a quarantine
 * path that does not exist, which is why the gap looked like a caller problem and is not.
 *
 * WHY A FUNCTION HERE AND NOT A SECOND WRITER. The tempting shape is a raw
 * `UPDATE call_doc SET file_id=…`, and the job contract forbids it BY NAME (judge.refuse:
 * "register-call-doc.js is the one writer and its guarded statement is what asserts the
 * vocabulary and the capability. A raw UPDATE bypasses both and is the exact defect that
 * store was built to end."). So this builds params for the SAME GUARDED_UPSERT through
 * the SAME validateShape, and carries ZERO new vocabulary: `built_by` stays whatever
 * BUILT the document. The watch job did not build it, and there is no canonical term
 * saying it did — inventing one in code is the defect the vocabulary registry exists for.
 *
 * WHAT IT DELIBERATELY LACKS: `quarantinePath` and `finalPath`. Their absence is
 * load-bearing, not an omission. It is what lets settleRegistration() refuse a confirm
 * plan and confirmSettle() refuse a registration plan, so a caller reaching for the
 * familiar door cannot cross the two.
 *
 * `row`    an existing call_doc row exactly as lookupSql() returns it (snake_case).
 *          The row IS the evidence that there is something to confirm.
 * `hosted` { fileId, viewUrl } — BOTH read from the hosted store in THIS run. A
 *          remembered id, one carried from a previous run, or one derived from a url
 *          pattern is a fabricated pointer (contract judge.refuse, first clause).
 */
function confirmHosted(row, hosted, opts = {}) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('confirm-call-doc: refused — confirmHosted needs the EXISTING call_doc row ' +
      '(as lookupSql returns it), not a bag of fields. The row is what proves there is something ' +
      'to confirm at all. Got: ' + JSON.stringify(row).slice(0, 200));
  }
  for (const k of ['doc_id', 'event_id', 'kind', 'built_by', 'event_id_source', 'meeting_date',
                   'file_title', 'local_path']) {
    // CLOUD MODE (2026-09-17): a NULL local_path is a real state of a cloud-filed row, not a
    // partial read. Only an explicit null passes — undefined (key absent) and '' still refuse.
    if (k === 'local_path' && row[k] === null) continue;
    if (typeof row[k] !== 'string' || !String(row[k]).trim()) {
      throw new Error('confirm-call-doc: refused — the row is missing "' + k + '". A confirm ' +
        'rebuilds the WHOLE row through the guarded statement, so a partial row would write ' +
        'blanks over columns nobody asked to change. Read the row back with lookupSql() and ' +
        'pass it whole.');
    }
  }

  const h = hosted || {};
  const fileId = h.fileId == null ? '' : String(h.fileId);
  const viewUrl = h.viewUrl == null ? '' : String(h.viewUrl);
  if (!fileId.trim() || !viewUrl.trim()) {
    throw new Error('confirm-call-doc: refused — a confirm needs BOTH a file id and a web view ' +
      'url, read from the hosted store in THIS run. Half a pair is what the biconditional exists ' +
      'to refuse (call_doc_hosted_pairing_ck), and clearing hosted_gap without both halves is the ' +
      'exact working-around the contract names. Got fileId="' + fileId + '" viewUrl="' + viewUrl +
      '". If the mirror READ failed, that is not the same fact as "the document did not land" — ' +
      'leave the row open and report the failed read.');
  }

  const f = {
    eventId: row.event_id,
    kind: row.kind,
    builtBy: row.built_by,
    eventIdSource: row.event_id_source,
    meetingDate: String(row.meeting_date),
    person: row.person || '',
    domain: row.domain || '',
    channel: row.channel || 'call',
    fileTitle: row.file_title,
    localPath: row.local_path,
    callRef: row.call_ref == null ? null : row.call_ref,
    fileId,
    viewUrl,
    hostedGap: '',
  };

  const v = validateShape(f);
  let errs = v.errs;
  if (opts.allowMissingCallRef) {
    errs = errs.filter((e) => !e.startsWith('a DEBRIEF must carry callRef'));
  }
  if (errs.length) {
    throw new Error('confirm-call-doc: refused before writing anything.\n  - ' + errs.join('\n  - '));
  }

  return {
    _what_this_is: 'A call_doc HOSTED-HALF CONFIRMATION plan. Run `sql` with `params` through the ' +
      'board connector (resolved BY CATEGORY, never by name), save the FULL result, then hand both ' +
      'to `register-call-doc.js --confirm-settle <plan.json> --result <result.json>`. It promotes ' +
      'no file and deletes no file — there is nothing on disk to move.',
    confirm: true,
    docId: row.doc_id,
    tenant: TENANT,
    // Kept so a failure can quote the sentence piece 6 wrote, and so a caller can prove
    // afterwards that a row it did NOT resolve still carries that text byte for byte — the
    // inverse acceptance test, which is the one that proves the job measures anything.
    priorHostedGap: row.hosted_gap == null ? '' : String(row.hosted_gap),
    sql: GUARDED_UPSERT,
    params: [
      row.doc_id, TENANT, f.eventId, f.kind, f.callRef || '', String(f.meetingDate),
      f.person, f.domain, f.channel, v.fileTitle, f.localPath,
      v.fileId, v.viewUrl, v.hostedGap, f.builtBy, f.eventIdSource,
      /* KEPT STATE: a confirm mints NONE and is required to produce NONE. It flips the
         hosted half of a document that was built days ago — the guide JSON it was built
         from has not changed, so a new version here would be a lie about what happened.
         require_kept=false is why the kept_gap cannot refuse a confirm. */
      null, null, false,
      /* THE LEAD — added 2026-08-11, and this is the line the whole column was at risk
         from. A confirm rebuilds the WHOLE row through the guarded statement, so the
         moment call_doc gained a lead, THIS door became able to blank it — a guard in
         one writer letting its sibling swallow the rest. It is handed straight back off
         the row it read, never re-derived: a confirm has no opinion about the lead and
         must not express one. `== null ? ''` matters because a row read before these
         columns existed carries `undefined`, and NULL into a NOT NULL column would fail
         the INSERT path rather than the UPDATE path — a confusing way to learn this.

         DELIBERATELY NOT in the required-non-blank loop above: '' is a LEGAL value here
         (it is the UNKNOWN state that all 80 existing rows are in), so demanding it be
         non-blank would refuse every confirm on every document built before today. */
      row.lead_id == null ? '' : String(row.lead_id),
      row.no_lead_reason == null ? '' : String(row.no_lead_reason),
    ],
  };
}

/* ── phase 2: SETTLE. The only place a call document gets its real name. ─────────────
 * `result` is whatever the connector returned. Accepts the common shapes (an array of
 * rows, or an object with .rows) so a caller cannot get this subtly wrong.
 */
function settleRegistration(plan, result, io) {
  // A CONFIRM plan has no quarantine file and no final path, so settling it here would try
  // to rename a path that does not exist and, on any refusal, unlink `undefined`. Refused
  // BEFORE die(), so this branch can never delete anything.
  //
  // This is a new refusal on a shared function, so its callers were read rather than assumed
  // (`adding-a-refusal-to-a-callee-breaks-every-caller-and-the-gate-goes-greener`): the only
  // callers of settleRegistration are this file's `--settle` CLI branch and its own self-test,
  // and no plan either of them can produce carries `confirm`. Nothing existing can trip it.
  if (plan && plan.confirm === true) {
    throw new Error('register-call-doc: refused — settleRegistration was handed a CONFIRM plan ' +
      '(plan.confirm === true). A confirm promotes no file. Use confirmSettle(), which judges the ' +
      'same row and touches the filesystem not at all.');
  }
  const F = io || fs;
  const rows = Array.isArray(result) ? result
    : (result && Array.isArray(result.rows)) ? result.rows
    : null;

  const die = (why) => {
    let removed = false;
    try { F.unlinkSync(plan.quarantinePath); removed = true; } catch (_e) { /* already gone */ }
    throw new Error(
      'REGISTRATION FAILED — the built file was ' + (removed ? 'DELETED' : 'NOT deletable') +
      ': ' + plan.quarantinePath + '\n' + why +
      '\n\nThis is deliberate. An unregistered call document is invisible to the Command Center ' +
      'and to the debrief loop, and it looks IDENTICAL to a document that was never built. Fix ' +
      'the registration and re-run the builder.'
    );
  };

  if (rows === null) {
    die('the connector result was not row-shaped. Hand settle() the FULL result of the run, ' +
        'not a summary of it. Got: ' + JSON.stringify(result).slice(0, 400));
  }
  if (rows.length === 0) {
    die('the statement returned ZERO rows. That is never "already fine" — it means the write ' +
        'never ran. (rowCount lies on a bare write on this connector, which is why this ' +
        'statement always RETURNS and why the ROW is what is judged, never a count.)');
  }
  const refused = rows.filter((r) => r.outcome === 'refused');
  if (refused.length) {
    die('the store REFUSED the write:\n  - ' + refused.map((r) => r.reason).join('\n  - '));
  }
  const ok = rows.find((r) => r.outcome === 'registered');
  if (!ok) {
    die('no row came back with outcome=registered and none said refused either. Something ' +
        'other than this statement produced that result — do not assume it succeeded.');
  }
  if (ok.doc_id !== plan.docId) {
    die('the registered doc_id (' + ok.doc_id + ') is not the one this plan asked for (' +
        plan.docId + '). That result belongs to a DIFFERENT build — never settle on it.');
  }

  /* ── THE KEPT-STATE READER. Added 2026-08-07 (S5). ────────────────────────────────
     A writer with no reader and no red is how call_guide_state reached 0 rows while
     carrying a 16/16 proof gate. This is the red. A guide whose result carries no
     kept_state_id registered WITHOUT its source, so it can never be refreshed per
     segment — and rather than promote a document that is born unregenerable, settle
     destroys it, exactly as it does for a refused row.

     It judges the RETURNED COLUMN, not a count and not the absence of an error: an old
     connector result that predates the kept-state columns comes back with the key
     ABSENT, which is indistinguishable from a write that silently did nothing, and both
     must fail. `plan.keptState` is what makes this reachable — a debrief plan and a
     confirm plan do not set it, so this cannot fire on them. */
  if (plan.keptState === true && !ok.kept_state_id) {
    die('the call_doc row landed but NO kept-state row came back (kept_state_id is ' +
        (Object.prototype.hasOwnProperty.call(ok, 'kept_state_id') ? 'null' : 'ABSENT') +
        '). A guide with no stored source can never be refreshed per-segment — ' +
        'Call-Guide-Content-SPEC-v1.0 §8 D3. Either the builder passed no guideJson, or ' +
        'the statement that ran is an OLD copy of GUARDED_UPSERT that has no kept CTE. ' +
        'Re-run the builder against the current register-call-doc.js.');
  }

  // Only now does the document get its real name.
  try {
    F.renameSync(plan.quarantinePath, plan.finalPath);
  } catch (e) {
    throw new Error(
      'REGISTERED BUT NOT PROMOTED — the row landed (' + ok.doc_id + ') and the file could not ' +
      'be renamed from\n  ' + plan.quarantinePath + '\nto\n  ' + plan.finalPath + '\n' + e.message +
      '\nThe pointer now names a path that does not exist. Fix the filesystem and rename by ' +
      'hand, or re-run the builder — do NOT delete the row, that would hide the break.'
    );
  }
  /* local_path reports what was REGISTERED: null for a cloud plan, and then settled_path is
     where the bytes now sit on THIS disk — the file a cloud run hands to upload-call-doc.js.
     A disk settle returns exactly what it returned before. */
  if (plan.cloud === true) {
    return Object.assign({}, ok, { local_path: null, settled_path: plan.finalPath });
  }
  return Object.assign({}, ok, { local_path: plan.finalPath });
}

/* ── phase 2c: CLEAN UP THE SPENT PLAN. Success only. ───────────────────────────────
 * ADDED 2026-08-07 (S15). A plan file describes ONE transition: quarantine -> real name. Once
 * settle() has made that transition the plan is spent, and so is the result JSON beside it —
 * yet nobody removed them, so every built document left two files behind forever.
 *
 * THE ASYMMETRY IS THE WHOLE DESIGN, and it is why this is not called inside settleRegistration:
 *   SUCCESS -> remove both. Nothing is left that describes a transition already made.
 *   REFUSAL -> keep both. That is the diagnostic evidence, and settle() throws before we get
 *              here, so the asymmetry is enforced by CONTROL FLOW rather than by a flag anyone
 *              could get wrong. A `catch` in the caller cannot reach this line.
 *
 * IT PRINTS WHAT IT COULD NOT DO, and never throws. Two separate reasons, both learned:
 *   - the document is already correct and registered by the time this runs. Failing the process
 *     over undeleted scratch would turn a clean build into a red one.
 *   - `fs.unlinkSync` is NOT PERMITTED over the device bridge, and on 2026-08-07 a try/catch
 *     that swallowed exactly that left a 53KB deliberately-broken copy of this module sitting in
 *     scripts/ for a day. A swallowed unlink is how debris becomes invisible. So a failure is
 *     REPORTED with its path, and the returned list is what a caller can assert on.
 */
function cleanupSettleScratch(planPath, resultPath, io) {
  const F = io || fs;
  const removed = [], kept = [];
  for (const p of [planPath, resultPath]) {
    if (!p) continue;
    try { F.unlinkSync(p); removed.push(p); }
    catch (e) { kept.push(p); console.error('register-call-doc: could NOT remove spent scratch\n  ' + p + '\n  ' + e.message); }
  }
  return { removed, kept };
}

/* ── phase 2b: CONFIRM-SETTLE. The same judgement, and NO filesystem at all. ─────────
 * Added 2026-08-07 (S11) beside settleRegistration, on purpose, so the two are read
 * together and the difference is visible: this one takes no `io`, has no `F`, and names
 * no path. There is nothing on disk to promote and nothing to destroy — the document was
 * promoted days ago and a failed confirmation must leave it exactly where it is.
 *
 * The five judgements are deliberately IDENTICAL to settleRegistration's, because they
 * are judgements about the STATEMENT's result, not about the filesystem: a non-row-shaped
 * result, zero rows, a refused row, no registered row, and a doc_id that belongs to some
 * other build. Zero rows is never "already fine" here either — on this connector a bare
 * write's rowCount lies, which is why the guarded statement always RETURNS and why the
 * ROW is what is judged.
 */
function confirmSettle(plan, result) {
  if (!plan || plan.confirm !== true) {
    throw new Error('confirm-call-doc: refused — confirmSettle was handed something that is not ' +
      'a CONFIRM plan (plan.confirm !== true). Settling a REGISTRATION plan through this door ' +
      'would leave its built file sitting in quarantine forever — unregistered, invisible, and ' +
      'indistinguishable from a document that was never built, which is the one state this ' +
      'module exists to make impossible. Use settleRegistration().');
  }

  const rows = Array.isArray(result) ? result
    : (result && Array.isArray(result.rows)) ? result.rows
    : null;

  const die = (why) => {
    throw new Error(
      'CONFIRMATION FAILED — nothing on disk was touched, and the row keeps its original hosted ' +
      'gap:\n  "' + (plan.priorHostedGap || '') + '"\n' + why +
      '\n\nLeaving that sentence intact is CORRECT, not a fallback: a document that has not landed ' +
      'must go on saying so, in the words the build step wrote. Never rewrite it to "checked and ' +
      'not found" — that destroys the one honest statement in the row.'
    );
  };

  if (rows === null) {
    die('the connector result was not row-shaped. Hand confirmSettle() the FULL result of the ' +
        'run, not a summary of it. Got: ' + JSON.stringify(result).slice(0, 400));
  }
  if (rows.length === 0) {
    die('the statement returned ZERO rows. That is never "already fine" — it means the write ' +
        'never ran. (rowCount lies on a bare write on this connector, which is why this ' +
        'statement always RETURNS and why the ROW is what is judged, never a count.)');
  }
  const refused = rows.filter((r) => r.outcome === 'refused');
  if (refused.length) {
    die('the store REFUSED the write:\n  - ' + refused.map((r) => r.reason).join('\n  - '));
  }
  const ok = rows.find((r) => r.outcome === 'registered');
  if (!ok) {
    die('no row came back with outcome=registered and none said refused either. Something other ' +
        'than this statement produced that result — do not assume it succeeded.');
  }
  if (ok.doc_id !== plan.docId) {
    die('the confirmed doc_id (' + ok.doc_id + ') is not the one this plan asked for (' +
        plan.docId + '). That result belongs to a DIFFERENT document — never settle on it. A ' +
        'pointer that opens the wrong document is worse than the honest blank it replaced.');
  }

  return Object.assign({}, ok, { confirmed: true, prior_hosted_gap: plan.priorHostedGap });
}

/* ── read side: also SQL, for the same reason ── */
function lookupSql(eventId, kind) {
  return {
    _what_this_is: 'Run `sql` with `params` through the board connector to read the call_doc ' +
      'pointer back. Returns zero rows when nothing is registered — which is an answer, not a ' +
      'failure.',
    sql: LOOKUP,
    params: [TENANT, eventId, kind || null],
  };
}

/* ── self-test: proves the REFUSALS without a database and without writing anything ──
   A check that only proves the happy path is decoration. Each case below is a real
   defect this module exists to refuse; C-cases are positive controls that MUST pass,
   because a matcher that refuses everything is not a matcher. */
function selfTest() {
  const base = {
    eventId: '4p9e9u82qq2au5hl31o7tsq21d', kind: 'guide', builtBy: 'call-guide',
    eventIdSource: 'build', meetingDate: '20260805', person: 'Pat Doe',
    domain: 'acme.co',
    localPath: '/Users/x/Calls/20260805_callguide_pat-doe_reconnect.html',
    fileId: '', viewUrl: '', hostedGap: 'not in the Drive mirror at build time',
  };
  const mut = (o) => Object.assign({}, base, o);
  const cases = [
    ['C1 the real fixture-shaped guide is ACCEPTED', base, false],
    ['C2 a real hosted pair is ACCEPTED', mut({ fileId: '1abc', viewUrl: 'https://drive.google.com/file/d/1abc/view', hostedGap: '' }), false],
    ['M1 blank hosted half with no reason', mut({ hostedGap: '' }), true],
    ['M2 hosted pair AND a gap reason', mut({ fileId: '1abc', viewUrl: 'https://x/view' }), true],
    ['M3 only half a hosted pair', mut({ fileId: '1abc', hostedGap: '' }), true],
    ['M4 relative localPath', mut({ localPath: 'Calls/20260805_callguide_pat-doe_reconnect.html' }), true],
    ['M5 path does not end with the title', mut({ fileTitle: '20260805_callguide_other_x.html' }), true],
    ['M6 filename date disagrees with meetingDate', mut({ meetingDate: '20260804' }), true],
    ['M7 wrong kind slot in the filename', mut({ kind: 'debrief', callRef: '01JX', localPath: '/Users/x/Calls/20260805_callguide_pat-doe_reconnect.html' }), true],
    ['M8 debrief with no transcript id', mut({ kind: 'debrief', localPath: '/Users/x/Calls/20260805_debrief_pat-doe_reconnect.html' }), true],
    ['M9 meetingDate not YYYYMMDD', mut({ meetingDate: '2026-08-05' }), true],
    ['M10 eventId with whitespace', mut({ eventId: 'has space' }), true],
  ];
  let pass = 0, fail = 0;
  for (const [name, fields, shouldRefuse] of cases) {
    const { errs } = validateShape(fields);
    const refused = errs.length > 0;
    const ok = refused === shouldRefuse;
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && refused ? '  -> ' + errs[0] : ''}${!ok && !refused ? '  -> was ACCEPTED but should have been refused' : ''}`);
  }
  /* ── SETTLE cases. Added 2026-08-06 (T1·S88) with the credential cut. ────────────
     These are the load-bearing new logic — the half that decides whether a built file
     lives or dies — and every one of them runs offline against a fake fs, so the proof
     does not depend on a database being reachable. A settle() that was only ever
     exercised on the happy path would be exactly the "sort of worked" registration
     this whole module exists to refuse. */
  const fakeFs = () => {
    const st = { unlinked: [], renamed: [] };
    return [{
      unlinkSync: (p) => st.unlinked.push(p),
      renameSync: (a, b) => st.renamed.push([a, b]),
    }, st];
  };
  const plan = { docId: 'cd_guide_abc', quarantinePath: '/q/_unregistered-x.html.part',
                 finalPath: '/q/20260805_callguide_x.html' };
  const okRow = { outcome: 'registered', doc_id: 'cd_guide_abc', update_count: 0, was_insert: true };

  const settleCases = [
    ['S1 a registered row PROMOTES the file', [okRow], 'promote'],
    ['S2 a refused row DESTROYS the file', [{ outcome: 'refused', reason: 'VOCABULARY: nope' }], 'destroy'],
    ['S3 ZERO rows DESTROYS the file (never "already fine")', [], 'destroy'],
    ['S4 a result that is not row-shaped DESTROYS the file', { rowCount: 1 }, 'destroy'],
    ['S5 a row for a DIFFERENT doc_id DESTROYS the file',
     [Object.assign({}, okRow, { doc_id: 'cd_guide_someone_else' })], 'destroy'],
    ['S6 an unrecognised row shape DESTROYS the file', [{ ok: true }], 'destroy'],
  ];
  for (const [name, result, want] of settleCases) {
    const [F, st] = fakeFs();
    let threw = false;
    try { settleRegistration(plan, result, F); } catch (_e) { threw = true; }
    const got = (!threw && st.renamed.length === 1 && st.unlinked.length === 0) ? 'promote'
              : (threw && st.unlinked.length === 1 && st.renamed.length === 0) ? 'destroy'
              : 'NEITHER';
    const ok = got === want;
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '  -> got ' + got}`);
  }

  /* ── CONFIRM cases. Added 2026-08-07 (S11) for the call-doc-landing-watch door. ──
     WHY THEY EXIST, and it is not "more coverage". C2 above proves the VALIDATOR
     accepts a real hosted pair, and the piece-7 handoff read that green as "so the
     gap is only the caller." The green was true, complete, and its conclusion was
     wrong: there was no DOOR that could deliver a hosted pair to the store without a
     file to promote (`a-green-self-test-proves-the-validator-not-the-door`). These
     cases prove the door, which is a different question from the one C2 answers.

     CF2 is the one the next reader needs: a confirm SUCCEEDS with no quarantine file
     present anywhere. That is the state EVERY real confirm runs in — the document was
     named days ago — and it is exactly the state settleRegistration() cannot survive.

     CF2/CF3/CF9 do not use a fake fs. They REPLACE the module's real fs methods with
     recorders that throw, so "touches the filesystem not at all" is measured rather
     than assumed. A fake `io` object would only prove what the test author handed in. */
  const fsSpy = () => {
    const st = { calls: [] };
    const names = ['unlinkSync', 'renameSync', 'writeFileSync', 'readFileSync',
                   'existsSync', 'statSync', 'rmSync', 'copyFileSync'];
    const orig = {};
    for (const k of names) {
      orig[k] = fs[k];
      fs[k] = function () { st.calls.push(k); throw new Error('self-test: fs.' + k + ' called'); };
    }
    return [st, () => { for (const k of names) fs[k] = orig[k]; }];
  };

  const stagedRow = {
    doc_id: 'cd_guide_abc', tenant_id: 'bryce', event_id: '4p9e9u82qq2au5hl31o7tsq21d',
    kind: 'guide', call_ref: null, meeting_date: '20260805', person: 'Pat Doe',
    domain: 'acme.co', channel: 'call',
    file_title: '20260805_callguide_pat-doe_reconnect.html',
    local_path: '/Users/x/Calls/20260805_callguide_pat-doe_reconnect.html',
    file_id: '', view_url: '', hosted_gap: 'not in the Drive mirror at build time',
    /* ATTACHED, on purpose — added 2026-08-11. The confirm door rebuilds the whole row
       through the guarded statement, so a staged row with a BLANK lead could never have
       caught the defect CF10 exists for: blanking a live lead on the way past. A fixture
       that cannot express the failure makes its test green by construction. */
    lead_id: 'lead_abc123', no_lead_reason: '',
    built_by: 'call-guide', event_id_source: 'build',
  };
  const realPair = { fileId: '1abc', viewUrl: 'https://drive.google.com/file/d/1abc/view' };
  const confirmOk = { outcome: 'registered', doc_id: 'cd_guide_abc', update_count: 1,
                      was_insert: false };

  const chk = (name, fn) => {
    let ok = false, why = '';
    try { ok = fn() === true; } catch (e) { ok = false; why = e.message.split('\n')[0]; }
    if (ok) pass++; else fail++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : '  -> ' + (why || 'assertion false')}`);
  };

  chk('CF1 a real hosted pair CONFIRMS, and the plan carries no path to promote', () => {
    const p = confirmHosted(stagedRow, realPair);
    return p.confirm === true
        && p.docId === 'cd_guide_abc'
        && p.sql === GUARDED_UPSERT                       // the SAME statement, not a sibling
        && p.params[11] === '1abc'                        // file_id
        && p.params[12] === realPair.viewUrl              // view_url
        && p.params[13] === ''                            // hosted_gap cleared
        && p.params[14] === 'call-guide'                  // built_by UNCHANGED — no new vocabulary
        && p.priorHostedGap === 'not in the Drive mirror at build time'
        && p.quarantinePath === undefined && p.finalPath === undefined;
  });

  chk('CF2 confirmSettle SUCCEEDS with NO quarantine file present, touching fs 0 times', () => {
    const p = confirmHosted(stagedRow, realPair);
    const [st, restore] = fsSpy();
    let out;
    try { out = confirmSettle(p, [confirmOk]); } finally { restore(); }
    return st.calls.length === 0 && out.confirmed === true && out.doc_id === 'cd_guide_abc';
  });

  chk('CF3 a REFUSED confirm throws and still deletes NOTHING', () => {
    const p = confirmHosted(stagedRow, realPair);
    const [st, restore] = fsSpy();
    let threw = false;
    try { confirmSettle(p, [{ outcome: 'refused', reason: 'VOCABULARY: nope' }]); }
    catch (_e) { threw = true; } finally { restore(); }
    return threw === true && st.calls.length === 0;
  });

  chk('CF4 ZERO rows is never "already fine" for a confirm either', () => {
    const p = confirmHosted(stagedRow, realPair);
    try { confirmSettle(p, []); return false; } catch (_e) { return true; }
  });

  chk('CF5 a row for a DIFFERENT doc_id is refused', () => {
    const p = confirmHosted(stagedRow, realPair);
    try {
      confirmSettle(p, [Object.assign({}, confirmOk, { doc_id: 'cd_guide_someone_else' })]);
      return false;
    } catch (_e) { return true; }
  });

  chk('CF6 half a hosted pair is refused — the biconditional still governs a confirm', () => {
    try { confirmHosted(stagedRow, { fileId: '1abc', viewUrl: '' }); return false; }
    catch (_e) { return true; }
  });

  chk('CF7 a debrief row with no transcript id is refused — validateShape still runs', () => {
    const d = Object.assign({}, stagedRow, {
      doc_id: 'cd_debrief_abc', kind: 'debrief', call_ref: null,
      file_title: '20260805_debrief_pat-doe_reconnect.html',
      local_path: '/Users/x/Calls/20260805_debrief_pat-doe_reconnect.html',
    });
    try { confirmHosted(d, realPair); return false; } catch (_e) { return true; }
  });

  chk('CF8 a partial row is refused rather than writing blanks over live columns', () => {
    const partial = Object.assign({}, stagedRow); delete partial.built_by;
    try { confirmHosted(partial, realPair); return false; } catch (_e) { return true; }
  });

  /* CF11 and CF12 exist because CF6 and CF8 turned out to be SHADOWED, and the mutant
     harness said so rather than anyone noticing. Deleting `built_by` or passing half a
     pair is ALSO caught by validateShape, so disabling confirmHosted's own two guards
     left both cases green — a guard proven only by an input something else already
     refuses is proven by nothing. These two aim at the narrow band only these guards
     can see: a WHITESPACE file id (validateShape compares against '', so "   " reads as
     a real hosted id), and a row with no doc_id (validateShape never sees doc_id at all,
     so the plan would carry docId: undefined into the write). */

  chk('CF11 a WHITESPACE-only file id is refused — validateShape cannot see this', () => {
    try { confirmHosted(stagedRow, { fileId: '   ', viewUrl: 'https://x/view' }); return false; }
    catch (_e) { return true; }
  });

  chk('CF12 a row with no doc_id is refused — validateShape never sees doc_id', () => {
    const noId = Object.assign({}, stagedRow); delete noId.doc_id;
    try { confirmHosted(noId, realPair); return false; } catch (_e) { return true; }
  });

  chk('CF9 settleRegistration REFUSES a confirm plan and unlinks nothing', () => {
    const p = confirmHosted(stagedRow, realPair);
    const [F, st] = fakeFs();
    let threw = false;
    try { settleRegistration(p, [confirmOk], F); } catch (_e) { threw = true; }
    return threw === true && st.unlinked.length === 0 && st.renamed.length === 0;
  });

  chk('CF10 confirmSettle REFUSES a registration plan (the reverse crossing)', () => {
    try { confirmSettle(plan, [okRow]); return false; } catch (_e) { return true; }
  });

  /* ── SCRATCH CLEANUP. Added 2026-08-07 (S15). Both directions and the source shape,
     because the asymmetry lives in CONTROL FLOW and a case-only test cannot see it. */
  chk('SC1 cleanup removes BOTH the plan and the result on success', () => {
    const [F, st] = fakeFs();
    const r = cleanupSettleScratch('/c/x.plan.json', '/c/x.result.json', F);
    return st.unlinked.length === 2 && r.removed.length === 2 && r.kept.length === 0;
  });
  chk('SC2 an unlink that FAILS is reported, not swallowed, and does not throw', () => {
    const F = { unlinkSync: () => { throw new Error('Operation not permitted'); }, renameSync: () => {} };
    const r = cleanupSettleScratch('/c/x.plan.json', '/c/x.result.json', F);
    return r.removed.length === 0 && r.kept.length === 2;
  });
  chk('SC3 the CLI calls cleanup only AFTER settleRegistration, never before', () => {
    // TWICE red on its own source before it measured anything, both times the same shape:
    // this assertion sits EARLIER in the file than the branch it describes, so every anchor it
    // names it also CONTAINS. First the branch string; then the CLI-block anchor, which my own
    // explanatory comment quoted a third time. lastIndexOf is what makes the anchor mean the
    // PRODUCTION site, and no anchor string may be spelled out in prose above. Same class as
    // gate sixteen's check U (2026-08-07) — an assertion that reads itself proves nothing.
    const src = fs.readFileSync(__filename, 'utf8');
    const cli = src.slice(src.lastIndexOf('if (require' + '.main === module)'));
    if (cli.length === 0) return false;          // a zero slice is "I could not look"
    const branch = cli.slice(cli.indexOf("cmd === '--settle'"), cli.indexOf("cmd === '--confirm'"));
    if (branch.length < 100) return false;       // a collapsed slice is "I could not look"
    const iSettle = branch.indexOf('settleRegistration(plan');
    const iSweep = branch.indexOf('cleanupSettleScratch(');
    return branch.length > 0 && iSettle > -1 && iSweep > -1 && iSettle < iSweep;
  });
  chk('SC4 settleRegistration itself never calls cleanup (the asymmetry stays in the caller)', () => {
    const src = fs.readFileSync(__filename, 'utf8');
    const body = src.slice(src.indexOf('function settleRegistration('), src.indexOf('function cleanupSettleScratch('));
    return body.indexOf('cleanupSettleScratch') === -1;
  });

  /* ── KEPT STATE. Added 2026-08-07 (S5). ───────────────────────────────────────────
     K4 and K5 are a MATCHED PAIR and one field apart. K5 alone would be a check that
     cannot fail — "settle promoted the file" is true of every happy path ever written.
     K4 is what gives it meaning: the SAME plan, the SAME result row, with kept_state_id
     removed, must DESTROY. If K4 ever goes green the reader is measuring nothing.

     K6 is the case that actually bites in the field and is not the same as K4: an OLD
     copy of GUARDED_UPSERT returns a row with no kept_state_id KEY AT ALL. A reader
     written as `ok.kept_state_id === null` would pass that. Absent must fail like null. */
  const guideFields = {
    eventId: '4p9e9u82qq2au5hl31o7tsq21d', kind: 'guide', builtBy: 'call-guide',
    eventIdSource: 'build', meetingDate: '20260805', person: 'Pat Doe',
    domain: 'acme.co', fileId: '', viewUrl: '', hostedGap: 'local only',
  };
  const goodGuide = { sections: [{ id: 's1', label: 'Open' }] };
  const gPlan = (extra) => planRegistration(
    '/q/20260805_callguide_pat-doe_x.html', Object.assign({}, guideFields, extra));

  chk('K1 a GUIDE plan carries the guide JSON and demands kept state', () => {
    const p = gPlan({ guideJson: goodGuide });
    return p.keptState === true
        && p.params.length === 21
        && p.params[18] === true                                  // require_kept
        && JSON.parse(p.params[16]).sections[0].id === 's1';      // guide_json, serialised
  });

  chk('K2 a GUIDE plan with NO guideJson STILL demands it — forgetting cannot look like ' +
      'having nothing to pass', () => {
    const p = gPlan({});
    return p.keptState === true && p.params[18] === true && p.params[16] === null;
  });

  chk('K3 a DEBRIEF plan demands none — the gap cannot fire on the sibling builder', () => {
    const p = planRegistration('/q/20260805_debrief_pat-doe_x.html', {
      eventId: '4p9e9u82qq2au5hl31o7tsq21d', kind: 'debrief', builtBy: 'call-debrief',
      eventIdSource: 'build', meetingDate: '20260805', person: 'Pat Doe',
      domain: 'acme.co', callRef: 'ff_abc', fileId: '', viewUrl: '',
      hostedGap: 'local only',
    });
    return p.keptState === false && p.params[18] === false && p.params[16] === null;
  });

  chk('K4 RED — a guide that registers with NO kept-state row is DESTROYED, not promoted', () => {
    const p = gPlan({ guideJson: goodGuide });
    const [F, st] = fakeFs();
    let threw = false;
    try {
      settleRegistration(p, [Object.assign({}, okRow, { doc_id: p.docId, kept_state_id: null })], F);
    } catch (_e) { threw = true; }
    return threw === true && st.unlinked.length === 1 && st.renamed.length === 0;
  });

  chk('K5 GREEN — SCOPED INVERSE of K4: the identical settle with a kept_state_id PROMOTES', () => {
    const p = gPlan({ guideJson: goodGuide });
    const [F, st] = fakeFs();
    let threw = false;
    try {
      settleRegistration(p, [Object.assign({}, okRow,
        { doc_id: p.docId, kept_state_id: 'cgs_' + p.docId + '_v1', kept_version: 1 })], F);
    } catch (_e) { threw = true; }
    return threw === false && st.renamed.length === 1 && st.unlinked.length === 0;
  });

  chk('K6 an ABSENT kept_state_id (an OLD statement) fails exactly like a null one', () => {
    const p = gPlan({ guideJson: goodGuide });
    const [F, st] = fakeFs();
    let threw = false, why = '';
    try { settleRegistration(p, [Object.assign({}, okRow, { doc_id: p.docId })], F); }
    catch (e) { threw = true; why = e.message; }
    return threw === true && st.unlinked.length === 1 && /ABSENT/.test(why);
  });

  chk('K7 a DEBRIEF settle is untouched by the new reader — no kept_state_id, still promotes', () => {
    const p = { docId: 'cd_debrief_abc', quarantinePath: '/q/_unregistered-d.part',
                finalPath: '/q/20260805_debrief_x.html', keptState: false };
    const [F, st] = fakeFs();
    let threw = false;
    try { settleRegistration(p, [Object.assign({}, okRow, { doc_id: 'cd_debrief_abc' })], F); }
    catch (_e) { threw = true; }
    return threw === false && st.renamed.length === 1;
  });

  chk('K8 a CONFIRM carries all 21 params and demands no kept state — it mints no version', () => {
    const p = confirmHosted(stagedRow, realPair);
    return p.params.length === 21 && p.params[16] === null && p.params[18] === false
        && p.keptState === undefined;
  });

  /* CF13 — THE SIBLING-SWALLOW GUARD. Added 2026-08-11 with the lead columns.
     ⚠ NUMBERED 13, NOT 10, AND THE NEAR-MISS IS WORTH THE LINE: these three were first
     written as CF10/CF11/CF12, which ALREADY EXIST 130 lines up. The suite still printed
     "46 passed, 0 failed" — a duplicate label costs nothing until something goes red, and
     then it costs the one thing a test name is for, which is knowing WHICH assertion
     broke. `grep -o "chk('CF[0-9]*"` before adding to a hand-numbered set; the highest
     number in a file is not where the block you are editing ends.

     confirmHosted rebuilds the WHOLE row through the guarded statement, so the moment
     call_doc gained a lead this door became able to blank one while doing its job
     correctly. That is a guard in one writer letting its sibling swallow the rest, and
     it is invisible from the builder side because the builder's own gate is green.
     This asserts the CARRIAGE, which is the only thing the confirm owes the lead. */
  chk('CF13 a confirm hands the lead straight back — it never blanks a live one', () => {
    const p = confirmHosted(stagedRow, realPair);
    return p.params[19] === 'lead_abc123' && p.params[20] === '';
  });

  /* CF14 — the inverse, and it is the one that matters for the 80 legacy rows. A row
     that has never had a lead recorded must confirm cleanly rather than being refused,
     because '' here means UNKNOWN, not "no lead". A door that demanded a lead would
     refuse every confirm on every document built before 2026-08-11. */
  chk('CF14 a confirm on a row with no recorded lead is allowed, not refused', () => {
    const legacy = Object.assign({}, stagedRow, { lead_id: '', no_lead_reason: '' });
    const p = confirmHosted(legacy, realPair);
    return p.params[19] === '' && p.params[20] === '';
  });

  /* CF15 — a row read back BEFORE these columns existed carries undefined. NULL into a
     NOT NULL column fails on the INSERT path only, so this would have surfaced as a
     confusing intermittent rather than as a clear refusal. */
  chk('CF15 a pre-column row (undefined lead fields) becomes blank, never null', () => {
    const old = Object.assign({}, stagedRow);
    delete old.lead_id; delete old.no_lead_reason;
    const p = confirmHosted(old, realPair);
    return p.params[19] === '' && p.params[20] === '';
  });

  chk('K9 the STATEMENT gates the kept write on guide_json, and the GAP on require_kept — ' +
      'a confirm can never be refused by the kept gap', () => {
    const s = GUARDED_UPSERT;
    return /kept_gap AS \(/.test(s)
        && /WHERE \(SELECT require_kept FROM in_f\) AND \(SELECT guide_json FROM in_f\) IS NULL/.test(s)
        && /kept AS \(/.test(s)
        && /WHERE f\.guide_json IS NOT NULL/.test(s)
        && /coalesce\(max\(s\.version\), 0\) \+ 1/.test(s);   // never a hardcoded 1
  });

  /* ── CLOUD MODE — localPath null. Added 2026-09-17. ──────────────────────────────
     N1/N2 are a matched pair one field apart: the same cloud plan with and without its
     hostedGap. N4/N5 prove null is the ONLY spelling of "no path". N12 is the disk-mode
     control: a plan with no localPath key is still the plan it was before today. */
  const cloudFields = Object.assign({}, guideFields, {
    localPath: null, hostedGap: 'cloud filing pending (run_test)', guideJson: goodGuide });
  const cloudFinal = '/tmp/container/20260805_callguide_pat-doe_x.html';

  chk('N1 a CLOUD guide plan (localPath null + hostedGap) is ACCEPTED and carries NULL local_path', () => {
    const p = planRegistration(cloudFinal, cloudFields);
    return p.cloud === true && p.params.length === 21 && p.params[10] === null
        && p.params[9] === '20260805_callguide_pat-doe_x.html'
        && p.params[13] === 'cloud filing pending (run_test)' && p.keptState === true;
  });
  chk('N2 RED — the identical cloud plan with NO hostedGap is refused', () => {
    try { planRegistration(cloudFinal, Object.assign({}, cloudFields, { hostedGap: '' })); return false; }
    catch (e) { return /cloud mode \(localPath null\) requires a STATED hostedGap/.test(e.message); }
  });
  chk('N3 RED — a cloud plan carrying a hosted pair instead of a gap is refused', () => {
    try {
      planRegistration(cloudFinal, Object.assign({}, cloudFields,
        { hostedGap: '', fileId: '1abc', viewUrl: 'https://drive.google.com/file/d/1abc/view' }));
      return false;
    } catch (e) { return /requires a STATED hostedGap/.test(e.message); }
  });
  chk('N4 an EMPTY-STRING localPath is still refused — "" is not "no path"', () => {
    const { errs } = validateShape(Object.assign({}, base, { localPath: '' }));
    return errs.some((e) => /^localPath is required/.test(e));
  });
  chk('N5 a MISSING localPath key is still refused by validateShape — absent is not null', () => {
    const noKey = Object.assign({}, base); delete noKey.localPath;
    const { errs } = validateShape(noKey);
    return errs.some((e) => /^localPath is required/.test(e));
  });
  chk('N6 RED — a cloud plan whose settled file name differs from fileTitle is refused', () => {
    try {
      planRegistration(cloudFinal, Object.assign({}, cloudFields,
        { fileTitle: '20260805_callguide_someone-else_x.html' }));
      return false;
    } catch (e) { return /settled file name must equal fileTitle/.test(e.message); }
  });
  chk('N7 a cloud plan with no fileTitle derives it from the settled file, and the path checks are skipped', () => {
    const { errs } = validateShape(Object.assign({}, cloudFields, { fileTitle: '20260805_callguide_pat-doe_x.html' }));
    return errs.length === 0 && planRegistration('relative/20260805_callguide_pat-doe_x.html', cloudFields).params[10] === null;
  });
  chk('N8 cloud validateShape with NO fileTitle names the cloud reason', () => {
    const { errs } = validateShape(Object.assign({}, cloudFields));
    return errs.some((e) => /fileTitle is required when localPath is null/.test(e));
  });
  chk('N9 a cloud SETTLE promotes, reports local_path null and the settled path', () => {
    const p = planRegistration(cloudFinal, cloudFields);
    const [F, st] = fakeFs();
    const out = settleRegistration(p, [Object.assign({}, okRow,
      { doc_id: p.docId, kept_state_id: 'cgs_' + p.docId + '_v1', kept_version: 1 })], F);
    return st.renamed.length === 1 && out.local_path === null && out.settled_path === cloudFinal;
  });
  chk('N10 a CONFIRM on a cloud row (local_path NULL) is ACCEPTED and keeps local_path NULL', () => {
    const cloudRow = Object.assign({}, stagedRow, { local_path: null, hosted_gap: 'cloud filing pending (run_test)' });
    const p = confirmHosted(cloudRow, realPair);
    return p.params[10] === null && p.params[11] === '1abc' && p.params[13] === ''
        && p.priorHostedGap === 'cloud filing pending (run_test)';
  });
  chk('N11 RED — a confirm row with local_path "" or ABSENT is still refused (only null is cloud)', () => {
    let a = false, b = false;
    try { confirmHosted(Object.assign({}, stagedRow, { local_path: '' }), realPair); } catch (_e) { a = true; }
    const noKey = Object.assign({}, stagedRow); delete noKey.local_path;
    try { confirmHosted(noKey, realPair); } catch (_e) { b = true; }
    return a && b;
  });
  chk('N12 DISK CONTROL — a plan with no localPath key is unchanged: path in params, no cloud key, no settled_path', () => {
    const p = gPlan({ guideJson: goodGuide });
    const [F] = fakeFs();
    const out = settleRegistration(p, [Object.assign({}, okRow,
      { doc_id: p.docId, kept_state_id: 'cgs_x', kept_version: 1 })], F);
    return p.cloud === undefined && !('cloud' in p) && out.settled_path === undefined
        && p.params[10] === '/q/20260805_callguide_pat-doe_x.html'
        && out.local_path === '/q/20260805_callguide_pat-doe_x.html';
  });
  chk('N13 a cloud DEBRIEF with a transcript id is ACCEPTED', () => {
    const p = planRegistration('/tmp/container/20260805_debrief_pat-doe_x.html', {
      eventId: '4p9e9u82qq2au5hl31o7tsq21d', kind: 'debrief', builtBy: 'call-debrief',
      eventIdSource: 'build', meetingDate: '20260805', callRef: 'ff_abc',
      localPath: null, hostedGap: 'cloud filing pending (run_test)' });
    return p.cloud === true && p.params[10] === null && p.keptState === false;
  });
  chk('N14 the STATEMENT refuses a NULL local_path on an unmigrated store as a ROW, in the gap union', () => {
    const s = GUARDED_UPSERT;
    return /path_gap AS \(/.test(s)
        && /WHERE \(SELECT local_path FROM in_f\) IS NULL/.test(s)
        && /c\.is_nullable = 'NO'/.test(s)
        && /UNION ALL SELECT reason FROM path_gap\)/.test(s);
  });

  /* ── OPENABLE + STAGED + DISK HANDOFF (0.9.50). The verdict is the thing a sweep will trust
     to say "done", so every NOT-done shape is a RED case here, beside its one positive control. */
  const OK_ROW = { doc_id: 'cd_guide_x', file_id: '1abcDEFghiJKL', view_url: 'https://drive.google.com/file/d/1abcDEFghiJKL/view', hosted_gap: '' };
  chk('O1 CONTROL — a row with file_id + view_url and no gap is OPENABLE (exit 0)', () => {
    const v = openableVerdict([OK_ROW]); return v.openable === true && v.exit === 0;
  });
  chk('O2 RED — a stated gap is NOT OPENABLE even with ids present', () => {
    const v = openableVerdict([Object.assign({}, OK_ROW, { hosted_gap: 'no local copy - filing pending' })]);
    return v.openable === false && v.exit === OPENABLE_EXIT && /hosted_gap/.test(v.reason);
  });
  chk('O3 RED — a local-only row (empty file_id, the build-time gap) is NOT OPENABLE', () => {
    const v = openableVerdict({ rows: [{ doc_id: 'd', file_id: '', view_url: '', hosted_gap: 'builder writes the local copy only' }] });
    return v.openable === false && v.exit === OPENABLE_EXIT;
  });
  chk('O4 RED — no gap but no ids (a blank) is NOT OPENABLE', () => {
    return openableVerdict([{ doc_id: 'd', file_id: '', view_url: '', hosted_gap: '' }]).openable === false;
  });
  chk('O5 RED — zero rows, two rows, or no rows key is NOT OPENABLE', () => {
    return !openableVerdict([]).openable && !openableVerdict([OK_ROW, OK_ROW]).openable && !openableVerdict({}).openable;
  });
  chk('O6 the stage plan round-trips: chunks rejoin and gunzip to the exact bytes, each chunk within the store CHECK', () => {
    const bytes = Buffer.from('<html>' + 'x\u00e9\u2014'.repeat(40000) + require('crypto').randomBytes(30000).toString('hex') + '</html>', 'utf8');
    const t = 'cdt.' + TENANT + '.' + 'a'.repeat(48);
    const sp = stagePlan(bytes, t, 'run_self_test');
    const joined = sp.statements.map((x) => x.params[5]).join('');
    const back = require('zlib').gunzipSync(Buffer.from(joined, 'base64'));
    return sp.n_chunks > 1 && sp.statements.length === sp.n_chunks && back.equals(bytes) &&
      sp.statements.every((x, i) => x.params[2] === i + 1 && x.params[3] === sp.n_chunks && x.params[5].length <= 16000 && x.params[1] === t) &&
      /call_doc_upload_status/.test(sp.status.sql);
  });
  chk('O9 every staged chunk carries the sha256 of ITS OWN text as $8, and is at most 6,000 characters (0.9.54)', () => {
    const bytes = Buffer.from('<html>' + require('crypto').randomBytes(40000).toString('hex') + '</html>', 'utf8');
    const sp = stagePlan(bytes, 'cdt.' + TENANT + '.' + 'c'.repeat(48), 'run_self_test');
    const h = (c) => require('crypto').createHash('sha256').update(c, 'utf8').digest('hex');
    return sp.n_chunks > 3 && /\$8\)/.test(STAGE_SQL) && sp.statements.every((x) => x.params.length === 8 &&
      x.params[5].length <= 6000 && x.params[7] === h(x.params[5]) && x.chunk_sha256 === x.params[7]);
  });
  chk('O10 RED — a chunk altered after planning no longer matches its own $8 (what the store refuses on arrival)', () => {
    const sp = stagePlan(Buffer.from('<html>' + 'y'.repeat(9000) + '</html>'), 'cdt.' + TENANT + '.' + 'd'.repeat(48), 'run_self_test');
    const x = sp.statements[0];
    const altered = (x.params[5][0] === 'A' ? 'B' : 'A') + x.params[5].slice(1);
    return require('crypto').createHash('sha256').update(altered, 'utf8').digest('hex') !== x.params[7];
  });
  chk('O7 RED — the stage plan refuses a placeholder ticket or a missing writer', () => {
    const b = Buffer.from('x');
    const threw = (f) => { try { f(); return false; } catch (_) { return true; } };
    return threw(() => stagePlan(b, '{{TICKET}}', 'r')) && threw(() => stagePlan(b, 'cdt.' + TENANT + '.' + 'a'.repeat(48), ''));
  });
  chk('O8 a DISK plan gets the same seven-step handoff and keeps its absolute local path in step 1', () => {
    const plan = planRegistration('/Users/x/Calls/20260805_callguide_pat-doe_reconnect.html', base);
    const h = hostedHandoff(plan, Buffer.from('<html></html>'), { resolved: true, driveFolderId: '1AbCdEfGhIjKlMn', pathLabel: 'x' },
      { planPath: '/tmp/p.json', resultPath: '/tmp/r.json', runId: 'run_1' });
    return h.status === 'ready' && h.steps.length === 7 && h.steps[0].params[10] === base.localPath &&
      /--stage-sql/.test(h.steps[3].staged.run) && /--openable/.test(h.steps[6].judge);
  });

  console.log(`\n  ${pass} passed, ${fail} failed`);
  console.log('  This proves the SHAPE refusals and every SETTLE outcome, offline.');
  console.log('  The VOCABULARY and CAPABILITY refusals live in the SQL now, not in this');
  console.log('  file — they were proven on the live store 2026-08-06 (T1·S88), both');
  console.log('  directions, and the probe row was deleted in the same session.');
  return fail === 0;
}

/* ── HOSTED HANDOFF — added 2026-09-17 (an internal card).
   ──────────────────────────────────────────────────────────────────────────────────────
   Cloud mode (--cloud) already registered a row with NO operator path and printed three
   prose lines about what to do next. Two things were still missing, and together they are
   why a cloud executor with no local folder built nothing and left file_id empty:
     1. NOTHING MACHINE-READABLE SAID WHAT TO DO AFTER --settle. The ticket mint, the upload,
        the confirm and the read-back lived in stderr prose, so an unattended run had to
        re-derive them — and re-derived "paste it into the storage connector" instead.
     2. THE FOLDER WAS NOT KNOWN UNTIL AFTER THE ROW EXISTED. The ticket needs a REGISTERED
        Calls folder id. A company with no registered folder got a call_doc row whose hosted
        half could never be filled: a stranded row that reads "filing pending" forever.
   So the folder is resolved FIRST, by the session, through resolve_folder_address — this
   file never guesses one and never takes a folder from a name — and the builder turns the
   answer into one of two handoffs:
     ready                      → every remaining step as {sql, params} or a command, with
                                  named {{PLACEHOLDERS}} and the step whose result fills each.
     folder_address_unresolved  → nothing is registered and nothing is written.

   ⛔ THE UPLOAD IS THE BYTE DOOR (upload-call-doc.js → /api/cc/call-doc-file), NOT THE STORAGE
   CONNECTOR'S create CALL. Measured, not preferred: that call re-rendered ten \u escapes
   (91,713 bytes in, 91,680 out, 2026-08-31), failed outright past ~40KB (2026-09-09), and is
   Ask-first, which an unattended run cannot answer (2026-09-17 07:27, died-in-gate). The door
   takes the container's BYTES, checks them against the sha256 minted here, and checks Drive's
   reported size after upload. */
const FOLDER_SQL = 'SELECT drive_folder_id, path_label, verified_at\n' +
  '  FROM resolve_folder_address($1, $2, $3, $4, $5)';
const MINT_SQL = 'SELECT ticket, expires_at, door_url, file_title, drive_folder_id\n' +
  '  FROM call_doc_upload_ticket_mint($1, $2, $3, $4, $5, $6)';
const READBACK_SQL = 'SELECT doc_id, file_title, local_path, file_id, view_url, hosted_gap\n' +
  '  FROM call_doc WHERE tenant_id = $1 AND doc_id = $2';
const HOSTED_EXIT_UNRESOLVED = 4;

function folderSql(o) {
  const q = o || {};
  const channel = String(q.channel == null ? '' : q.channel).trim();
  const company = String(q.company == null ? '' : q.company).trim();
  const partner = q.partner == null || String(q.partner).trim() === '' ? null : String(q.partner).trim();
  if (!channel || !company) {
    throw new Error('folder-sql: refused — --channel and --company are both required. The channel ' +
      'is read off the matched CRM record\'s source channel, never guessed from the company name.');
  }
  return {
    _what_this_is: 'Run `sql` with `params` through the board connector. Save the FULL rows to a ' +
      'file and pass it to the builder with --folder. If the resolver RAISES, save ' +
      '{"error": "<the message>"} to that file instead — that is an answer, not a failure.',
    sql: FOLDER_SQL,
    params: [TENANT, channel, company, 'calls', partner],
  };
}

/* Reads what the session saved from FOLDER_SQL. Exactly one row with a plain Drive id is
   resolved; everything else is unresolved WITH A NAMED REASON. Never picks one of several. */
function readFolderAddress(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) &&
      (raw.error || raw.ok === false) && !Array.isArray(raw.rows)) {
    return { resolved: false, reason: 'resolver raised: ' + String(raw.error || 'ok=false').slice(0, 400) };
  }
  const rows = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.rows) ? raw.rows : null);
  if (!rows) return { resolved: false, reason: 'folder file carries no rows — a resolver that returned nothing was never asked' };
  if (rows.length === 0) return { resolved: false, reason: 'no registered Calls folder (0 rows)' };
  if (rows.length > 1) return { resolved: false, reason: 'ambiguous: ' + rows.length + ' rows — pass the partner; never pick one' };
  const id = rows[0] && rows[0].drive_folder_id != null ? String(rows[0].drive_folder_id).trim() : '';
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
    return { resolved: false, reason: 'the one row carries no usable drive_folder_id (got ' + JSON.stringify(id) + ')' };
  }
  return { resolved: true, driveFolderId: id, pathLabel: rows[0].path_label == null ? '' : String(rows[0].path_label) };
}

/* plan    the cloud registration plan (planRegistration with localPath null)
   bytes   the EXACT Buffer written to the quarantine file — the hash is of what ships
   folder  readFolderAddress() output
   o       { planPath, resultPath, runId, company, skillDir } */
function hostedHandoff(plan, bytes, folder, o) {
  const opt = o || {};
  /* 0.9.50: a DISK plan gets the same handoff. The sessions that filed every openable
     document on 2026-09-24 built on disk and then ran exactly these steps (register, settle,
     mint, upload, confirm); a disk plan simply keeps its local_path while the hosted half is
     filled. What is refused is a plan that is not a registration plan at all. */
  if (!plan || !Array.isArray(plan.params) || !plan.finalPath || plan.confirm === true) {
    throw new Error('hosted-handoff: refused — needs the registration plan the builder just made.');
  }
  if (!Buffer.isBuffer(bytes) || !bytes.length) {
    throw new Error('hosted-handoff: refused — needs the exact bytes that were written.');
  }
  const fileName = plan.params[9];
  const kind = plan.params[3];
  const eventId = plan.params[2];
  if (!folder || !folder.resolved) {
    return {
      status: 'folder_address_unresolved',
      registered: false,
      written: false,
      docId: plan.docId,
      fileName,
      reason: folder && folder.reason ? folder.reason : 'no folder answer was given',
      marker: '⚑ NEEDS YOU — No registered Calls folder: ' + (opt.company || '(company unknown)') +
        ' — ' + kind + ' authored, NOT registered and NOT filed. Register the folder by ID-descent, then rebuild.',
    };
  }
  const sha256 = require('crypto').createHash('sha256').update(bytes).digest('hex');
  const dir = opt.skillDir || __dirname;
  const q = (s) => '"' + String(s).replace(/(["\\$`])/g, '\\$1') + '"';
  const upload = path.join(dir, 'upload-call-doc.js');
  const registrar = path.join(dir, 'register-call-doc.js');
  const by = opt.runId || '{{RUN_OR_SESSION_ID}}';
  return {
    status: 'ready',
    route: 'byte-door',
    docId: plan.docId,
    fileName,
    bytes: bytes.length,
    sha256,
    folder: { driveFolderId: folder.driveFolderId, pathLabel: folder.pathLabel },
    notThrough: 'the storage connector create call — measured mangling bytes, failing past ~40KB, and Ask-first',
    placeholders: {
      '{{RUN_OR_SESSION_ID}}': opt.runId ? 'filled: --run-id' : 'your job_run id, or this session id',
      '{{TICKET}}': 'step 3 result: ticket',
      '{{DOOR_URL}}': 'step 3 result: door_url',
      '{{FILE_ID}}': 'step 4 result: file_id (the door\'s JSON, or call_doc_upload_status when staged)',
      '{{VIEW_URL}}': 'step 4 result: view_url (the door\'s JSON, or call_doc_upload_status when staged)',
    },
    steps: [
      { n: 1, do: 'register', via: 'board connector', sql: plan.sql, params: plan.params,
        save: opt.resultPath, expect: "one row, outcome='registered'" },
      { n: 2, do: 'settle', run: 'node ' + q(registrar) + ' --settle ' + q(opt.planPath) + ' --result ' + q(opt.resultPath),
        expect: 'exit 0; the file now has its real name: ' + plan.finalPath },
      { n: 3, do: 'mint one upload ticket', via: 'board connector', sql: MINT_SQL,
        params: [TENANT, plan.docId, sha256, bytes.length, folder.driveFolderId, by],
        expect: 'one row: ticket, door_url (15 minutes, one use)' },
      { n: 4, do: 'upload the bytes', run: 'node ' + q(upload) + ' --upload ' + q(plan.finalPath) +
        ' --ticket {{TICKET}} --door {{DOOR_URL}}',
        expect: 'exit 0 and {file_id, view_url}. Exit 3 (lost response): run --status with the same ticket; never upload twice.',
        /* 0.9.50 — THE NO-EGRESS ROUTE. A cloud container whose egress proxy refuses our host
           (measured 2026-09-17: curl 56, 403 connect_rejected) never reaches the door, so the
           ticket is still unused. The same bytes go through the BOARD CONNECTOR instead, as
           chunks the server-side filer (every 5 minutes) reassembles, re-hashes and files with
           this same ticket. No local disk on anybody's machine, no HTTP from the container. */
        staged: {
          when: 'upload exits 3 with door_unreachable, or the container cannot reach the door at all',
          run: 'node ' + q(registrar) + ' --stage-sql ' + q(plan.finalPath) + ' --ticket {{TICKET}} --by ' + q(by),
          then: 'run EVERY statement it prints, in order, through the board connector, straight after the mint ' +
            '(a ticket with under 6 minutes left is refused at the FIRST chunk; each accepted chunk extends it). ' +
            'CHUNK-CHANGED-IN-TRANSIT = that one chunk arrived altered: re-send THAT statement, never mint again for it. ' +
            'Then run its `status` read every ~2 minutes until ' +
            "state is 'filed' (about 5 minutes): its file_id and view_url are {{FILE_ID}} and {{VIEW_URL}}. " +
            "State 'refused' or 'expired': mint a NEW ticket and stage again; never guess an id.",
        } },
      { n: 5, do: 'read the row back', via: 'board connector', sql: LOOKUP, params: [TENANT, eventId, kind],
        save: 'row.json (the one row, whole)' },
      { n: 6, do: 'plan the hosted half', run: 'node ' + q(registrar) + ' --confirm row.json ' +
        "'{\"fileId\":\"{{FILE_ID}}\",\"viewUrl\":\"{{VIEW_URL}}\"}'",
        then: 'run its sql with its params through the board connector, save the FULL result, then ' +
          'node ' + q(registrar) + ' --confirm-settle <confirm-plan.json> --result <confirm-result.json>' },
      { n: 7, do: 'prove it', via: 'board connector', sql: READBACK_SQL, params: [TENANT, plan.docId],
        expect: "file_id = {{FILE_ID}}, view_url = {{VIEW_URL}}, hosted_gap = ''. Anything else is INCOMPLETE, not built.",
        /* 0.9.50: the verdict is a command with an exit code, not a sentence to eyeball. */
        judge: 'save the row to readback.json, then: node ' + q(registrar) + ' --openable readback.json ' +
          '(exit 0 = OPENABLE, the only "done"; exit ' + OPENABLE_EXIT + ' = NOT OPENABLE, the run is not done)' },
    ],
    /* 0.9.50: what a finished document still owes after step 7 (SKILL.md Step 4.5 / Step 6). */
    after: 'write the pointer with the file_id and view_url from step 7 (localPath null when the row has none)',
  };
}

/* ── OPENABLE — added 2026-09-24 (v0.9.50, fix B4 of the Call Record fix list). ───────────
   The rule (blueprint-core v1.210, Call-Record-Lifecycle-SPEC stages 4 and 8): a guide or a
   debrief is DONE only when the operator can OPEN it — call_doc.file_id and view_url set,
   hosted_gap empty. A local copy, a registered row with a stated gap, a minted ticket or a
   "filing pending" sentence are all NOT done. This is the one place that verdict is computed,
   so the builders, the sweep and a person all read the same answer:
     exit 0              OPENABLE — the read-back row carries a hosted copy and no gap;
     exit OPENABLE_EXIT  NOT OPENABLE — with the reason. A sweep treats this as not-done. */
const OPENABLE_EXIT = 20;

function openableVerdict(raw) {
  const rows = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.rows) ? raw.rows
    : (raw && typeof raw === 'object' && raw.doc_id ? [raw] : null));
  const no = (reason, row) => ({ openable: false, exit: OPENABLE_EXIT, reason,
    docId: row && row.doc_id ? row.doc_id : null });
  if (!rows) return no('the read-back carries no call_doc row — nothing was read, so nothing is proven');
  if (rows.length !== 1) return no('the read-back returned ' + rows.length + ' rows; one document is one row');
  const r = rows[0] || {};
  const fileId = r.file_id == null ? '' : String(r.file_id).trim();
  const viewUrl = r.view_url == null ? '' : String(r.view_url).trim();
  const gap = r.hosted_gap == null ? '' : String(r.hosted_gap).trim();
  if (gap) return no('hosted_gap is stated: ' + gap.slice(0, 200), r);
  if (!fileId || !viewUrl) return no('no hosted copy: file_id=' + JSON.stringify(fileId) + ' view_url=' + JSON.stringify(viewUrl), r);
  return { openable: true, exit: 0, docId: r.doc_id || null, fileId, viewUrl };
}

/* ── STAGED UPLOAD — the no-egress route for step 4 (0.9.50). ─────────────────────────────
   Emits one call_doc_upload_stage() statement per chunk, for the board connector to run.
   gzip-base64, chunks of at most STAGE_CHUNK characters (the store's own CHECK is 16,000),
   at most 400 chunks. The filer decodes, re-hashes against the ticket and files; this file
   never touches the network. */
const STAGE_SQL = 'SELECT doc_id, staged, n_chunks, complete, expires_at\n' +
  '  FROM call_doc_upload_stage($1, $2, $3, $4, $5, $6, $7, $8)';
const STAGE_STATUS_SQL = 'SELECT doc_id, state, staged, n_chunks, file_id, view_url, detail, expires_at\n' +
  '  FROM call_doc_upload_status($1, $2)';
/* 0.9.54: 6,000, down from 15,000, and every chunk carries its own sha256 ($8). MEASURED 2026-09-25 09:46, the
   cloud sweep staging the Tony Scelzo 09-17 guide (84,514 bytes = 28,624 gzip-base64 characters): the SESSION is the
   wire on this route - it re-types every character into the connector call - and one character came through wrong.
   Nothing noticed until the filer's gunzip five minutes later, which burned the ticket 'refused / bad_content'. The
   retry's 13,624-character chunk took 4.8 minutes to emit and met the 6-minute expiry guard. Now the store hashes
   each chunk ON ARRIVAL (call_doc_upload_stage, 8 arguments, lib/cc/call-doc-cloud/
   20260925-call-doc-retire-door-and-chunk-check.sql) and refuses a changed one with CHUNK-CHANGED-IN-TRANSIT, the
   ticket untouched, so the session re-sends ONE small chunk instead of losing the document; and every accepted chunk
   extends the ticket, so a slow session is not refused mid-set. */
const STAGE_CHUNK = 6000;

function stagePlan(bytes, ticket, by) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw new Error('stage-sql: refused — needs the settled file\'s bytes.');
  if (!/^cdt\.[A-Za-z0-9_-]+\.[0-9a-f]{48}$/.test(String(ticket || ''))) {
    throw new Error('stage-sql: refused — --ticket must be the ticket step 3 minted (cdt.<tenant>.<48 hex>), not a placeholder.');
  }
  if (!by || !String(by).trim() || /\{\{/.test(String(by))) {
    throw new Error('stage-sql: refused — --by needs your job_run id or session id.');
  }
  const b64 = require('zlib').gzipSync(bytes).toString('base64');
  const n = Math.ceil(b64.length / STAGE_CHUNK);
  if (n > 400) throw new Error('stage-sql: refused — ' + n + ' chunks; the store takes at most 400.');
  const statements = [];
  for (let i = 0; i < n; i++) {
    const chunk = b64.slice(i * STAGE_CHUNK, (i + 1) * STAGE_CHUNK);
    const chunkSha = require('crypto').createHash('sha256').update(chunk, 'utf8').digest('hex');
    statements.push({ seq: i + 1, chunk_sha256: chunkSha, sql: STAGE_SQL,
      params: [TENANT, ticket, i + 1, n, 'gzip-base64', chunk, String(by), chunkSha] });
  }
  return {
    _what_this_is: 'Run every statement in order through the board connector, copying each chunk EXACTLY. ' +
      'CHUNK-CHANGED-IN-TRANSIT on a statement means that one chunk arrived altered: nothing was staged and the ' +
      'ticket is still good - run THAT statement again, then carry on. The last one must return ' +
      'complete=true. Then run `status` until state is filed and take file_id / view_url from it.',
    bytes: bytes.length,
    sha256: require('crypto').createHash('sha256').update(bytes).digest('hex'),
    encoding: 'gzip-base64',
    n_chunks: n,
    statements,
    status: { sql: STAGE_STATUS_SQL, params: [TENANT, ticket],
      expect: "state 'filed' with file_id and view_url (the filer runs every 5 minutes)" },
  };
}

module.exports = { planRegistration, settleRegistration, quarantinePathFor, lookupSql,
                   confirmHosted, confirmSettle, cleanupSettleScratch,
                   validateShape, deriveDocId, GUARDED_UPSERT,
                   /* TENANT is exported so a caller never types a tenant literal twice.
                      A tenant literal in a second file is the drift this module refuses
                      everywhere else; build-call-guide.js --regen reads it from here. */
                   TENANT,
                   /* HOSTED HANDOFF (2026-09-17) — see the block above module.exports. */
                   folderSql, readFolderAddress, hostedHandoff, HOSTED_EXIT_UNRESOLVED,
                   /* OPENABLE + STAGED UPLOAD (0.9.50) — see the blocks above module.exports. */
                   openableVerdict, OPENABLE_EXIT, stagePlan, STAGE_SQL, STAGE_STATUS_SQL };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  try {
    if (cmd === '--self-test') { process.exit(selfTest() ? 0 : 1); }

    if (cmd === '--plan') {
      // --plan <finalPath> <fieldsJsonOrFile> [--allow-missing-call-ref]
      const finalPath = argv[1];
      const raw = argv[2];
      const fields = raw && raw.trim().startsWith('{') ? JSON.parse(raw) : readJson(raw);
      const opts = { allowMissingCallRef: argv.includes('--allow-missing-call-ref') };
      console.log(JSON.stringify(planRegistration(finalPath, fields, opts), null, 2));
      process.exit(0);
    }

    if (cmd === '--settle') {
      // --settle <plan.json> --result <result.json>
      const plan = readJson(argv[1]);
      const ri = argv.indexOf('--result');
      if (ri < 0 || !argv[ri + 1]) {
        console.error('--settle needs --result <file> — the FULL result of running plan.sql.');
        process.exit(64);
      }
      const out = settleRegistration(plan, readJson(argv[ri + 1]));
      // Only reachable when settle SUCCEEDED — settleRegistration throws on every refusal, so
      // a refused build keeps its plan and result as evidence without needing a flag.
      const swept = cleanupSettleScratch(argv[1], argv[ri + 1]);
      console.log(JSON.stringify(Object.assign({}, out, { scratch_removed: swept.removed, scratch_kept: swept.kept }), null, 2));
      process.exit(0);
    }

    if (cmd === '--confirm') {
      // --confirm <row.json> <hostedJsonOrFile> [--allow-missing-call-ref]
      // <row.json> is the EXISTING call_doc row, read back with --lookup-sql.
      const row = readJson(argv[1]);
      const raw = argv[2];
      const hosted = raw && raw.trim().startsWith('{') ? JSON.parse(raw) : readJson(raw);
      const opts = { allowMissingCallRef: argv.includes('--allow-missing-call-ref') };
      console.log(JSON.stringify(confirmHosted(row, hosted, opts), null, 2));
      process.exit(0);
    }

    if (cmd === '--confirm-settle') {
      // --confirm-settle <plan.json> --result <result.json>
      const cplan = readJson(argv[1]);
      const ci = argv.indexOf('--result');
      if (ci < 0 || !argv[ci + 1]) {
        console.error('--confirm-settle needs --result <file> — the FULL result of running plan.sql.');
        process.exit(64);
      }
      console.log(JSON.stringify(confirmSettle(cplan, readJson(argv[ci + 1])), null, 2));
      process.exit(0);
    }

    if (cmd === '--folder-sql') {
      // --folder-sql --channel <c> --company <x> [--partner <p>]
      const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
      console.log(JSON.stringify(folderSql({ channel: val('--channel'), company: val('--company'),
        partner: val('--partner') }), null, 2));
      process.exit(0);
    }

    if (cmd === '--openable') {
      // --openable <readback.json>   exit 0 OPENABLE, exit 20 NOT OPENABLE (0.9.50)
      if (!argv[1]) { console.error('--openable needs <readback.json> — the call_doc row read back by doc_id.'); process.exit(64); }
      const v = openableVerdict(readJson(argv[1]));
      if (!v.openable) console.error('✗ NOT OPENABLE — ' + v.reason + '. The run is NOT done.');
      console.log(JSON.stringify(v, null, 2));
      process.exit(v.exit);
    }

    if (cmd === '--stage-sql') {
      // --stage-sql <settledFile> --ticket <cdt...> --by <run or session id>   (0.9.50)
      const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
      if (!argv[1] || argv[1].startsWith('--')) { console.error('--stage-sql needs the settled file first.'); process.exit(64); }
      console.log(JSON.stringify(stagePlan(fs.readFileSync(argv[1]), val('--ticket'), val('--by')), null, 2));
      process.exit(0);
    }

    if (cmd === '--lookup-sql') {
      console.log(JSON.stringify(lookupSql(argv[1], argv[2]), null, 2));
      process.exit(0);
    }

    console.error(
      'usage: register-call-doc.js\n' +
      '  --self-test                              prove the offline refusals, write nothing\n' +
      '  --plan <finalPath> <fields.json>         emit the plan (sql + params + quarantinePath)\n' +
      '                                           fields.localPath null = cloud mode: no operator\n' +
      '                                           path, hostedGap required (see header)\n' +
      '  --settle <plan.json> --result <res.json> promote or destroy the built file\n' +
      '  --confirm <row.json> <hosted.json>       emit a HOSTED-HALF confirmation plan\n' +
      '                                           (row.json = the existing call_doc row;\n' +
      '                                            hosted.json = {fileId, viewUrl} read THIS run)\n' +
      '  --confirm-settle <plan.json> --result <res.json>\n' +
      '                                           judge a confirmation. Touches no file.\n' +
      '  --lookup-sql <eventId> [kind]            emit the read SQL\n' +
      '  --folder-sql --channel <c> --company <x> [--partner <p>]\n' +
      '                                           emit the Calls-folder read a cloud build needs\n' +
      '  --openable <readback.json>               exit 0 OPENABLE (file_id + view_url, no gap),\n' +
      '                                           exit 20 NOT OPENABLE — the only "done" test\n' +
      '  --stage-sql <settledFile> --ticket <t> --by <id>\n' +
      '                                           the no-egress upload: chunk statements for the\n' +
      '                                           board connector, then the status read\n' +
      '\nThere is no flag that opens a database. The session is the wire: run plan.sql through\n' +
      'the board connector, resolved BY CATEGORY (Core §11 rule 4), and hand the result back.'
    );
    process.exit(64);
  } catch (e) { console.error('\n' + e.message + '\n'); process.exit(1); }
}
