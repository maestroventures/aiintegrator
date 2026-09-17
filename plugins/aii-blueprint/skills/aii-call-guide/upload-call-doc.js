#!/usr/bin/env node
/* upload-call-doc.js — the CONTAINER side of cloud filing for a call guide or debrief.
 *
 * Runs where the locked builder ran (a cloud executor's container, or any machine with node 18+).
 * It reads the settled HTML off that disk and POSTs its BYTES to the Command Center's filing door
 * (api/cc/call-doc-file.js) with a ticket minted in the company store. The session never carries
 * the HTML — that is the whole point (see the door's header for the three measured failures).
 *
 * No dependencies, no credentials of its own: the ticket is the only authority and it is one-use.
 *
 *   node upload-call-doc.js --hash <file>
 *       prints {"bytes":N,"sha256":"..."} — pass these to call_doc_upload_ticket_mint()
 *   node upload-call-doc.js --upload <file> --ticket <cdt.tenant.hex> --door <url>
 *       prints the door's JSON; exit 0 filed, 2 refused (named), 3 could not reach the door
 *   node upload-call-doc.js --status --ticket <cdt...> --door <url>
 *       what happened to that ticket (use after a lost response; never re-upload blind)
 *
 * SHIPPING NOTE: this file is written in aii-site as the reference. The plugin's aii-call-guide and
 * aii-call-debrief skill folders must carry a byte-identical copy next to register-call-doc.js —
 * that is a framework-side change (03 / the plugin build), not something this branch can make.
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');

function hashFile(p) {
  const buf = fs.readFileSync(p);
  return { bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

// Only our own door may receive a ticket. A door URL is read from the mint row, and this refuses
// anything else so a mistyped or injected URL cannot collect the bytes and the ticket.
function doorAllowed(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /^(www\.)?aiintegratorhq\.com$/.test(u.hostname) && u.pathname === '/api/cc/call-doc-file';
  } catch (_) { return false; }
}

async function upload({ file, ticket, door, fetchImpl }) {
  if (!doorAllowed(door)) return { code: 2, out: { ok: false, error: 'door_not_allowed', door } };
  const buf = fs.readFileSync(file);
  const f = fetchImpl || fetch;
  let res;
  try {
    res = await f(door, { method: 'POST', headers: { Authorization: 'Bearer ' + ticket, 'Content-Type': 'application/octet-stream' }, body: buf });
  } catch (e) {
    return { code: 3, out: { ok: false, error: 'door_unreachable', detail: String(e && e.message) } };
  }
  let body;
  try { body = await res.json(); } catch (_) { body = { ok: false, error: 'non_json', status: res.status }; }
  return { code: res.ok && body && body.ok ? 0 : 2, out: body };
}

async function status({ ticket, door, fetchImpl }) {
  if (!doorAllowed(door)) return { code: 2, out: { ok: false, error: 'door_not_allowed', door } };
  const f = fetchImpl || fetch;
  try {
    const res = await f(door, { method: 'GET', headers: { Authorization: 'Bearer ' + ticket } });
    const body = await res.json();
    return { code: res.ok ? 0 : 2, out: body };
  } catch (e) {
    return { code: 3, out: { ok: false, error: 'door_unreachable', detail: String(e && e.message) } };
  }
}

module.exports = { hashFile, doorAllowed, upload, status };

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    if (argv[0] === '--hash' && argv[1]) { console.log(JSON.stringify(hashFile(argv[1]))); return process.exit(0); }
    if (argv[0] === '--upload') {
      const r = await upload({ file: argv[1], ticket: arg(argv, '--ticket'), door: arg(argv, '--door') });
      console.log(JSON.stringify(r.out)); return process.exit(r.code);
    }
    if (argv[0] === '--status') {
      const r = await status({ ticket: arg(argv, '--ticket'), door: arg(argv, '--door') });
      console.log(JSON.stringify(r.out)); return process.exit(r.code);
    }
    console.error('usage: --hash <file> | --upload <file> --ticket <t> --door <url> | --status --ticket <t> --door <url>');
    process.exit(64);
  })();
}
