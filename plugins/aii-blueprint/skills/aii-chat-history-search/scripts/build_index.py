#!/usr/bin/env python3
"""
build_index.py — turn an AI chat export into a searchable local SQLite + FTS5 database.

Part of the chat-history-search deployable skill (AI Integrator Blueprint).
The database, and every message in it, NEVER leaves the user's own machine.

Supported exports (auto-detected):
  - Claude       : conversations.json  (list of {uuid, name, chat_messages:[{sender,text,created_at}]})
  - ChatGPT      : conversations.json  (list of {title, mapping:{...node.message...}})
  - Generic JSONL: one JSON object per line: {conversation_id, title, role, text, created_at}

Usage:
  python3 build_index.py --export path/to/conversations.json --db chat_history.db
  python3 build_index.py --export path/to/messages.jsonl --format jsonl --db chat_history.db

Idempotent: re-running rebuilds the FTS index cleanly. Fails loud on an unrecognized shape
(Nygard) — it never silently indexes zero messages and reports success.
"""
import argparse, json, os, sqlite3, sys, datetime

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id TEXT PRIMARY KEY,
    title           TEXT,
    source          TEXT,
    started_at      TEXT,
    message_count   INTEGER
);
CREATE TABLE IF NOT EXISTS messages (
    message_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT,
    seq             INTEGER,          -- order within the conversation
    role            TEXT,             -- 'user' | 'assistant' | other
    text            TEXT,
    created_at      TEXT
);
-- FTS5 index over message text; external-content table keyed to messages.
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    text,
    content='messages',
    content_rowid='message_id',
    tokenize='porter unicode61'
);
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, text) VALUES (new.message_id, new.text);
END;
CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, text) VALUES('delete', old.message_id, old.text);
END;
"""


def _iso(v):
    """Best-effort normalize a timestamp to ISO-8601 string; pass through if unknown."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        try:
            return datetime.datetime.utcfromtimestamp(v).isoformat() + "Z"
        except (ValueError, OSError):
            return str(v)
    return str(v)


def detect_format(raw):
    """Return 'claude' | 'chatgpt' | None from a parsed JSON payload."""
    if isinstance(raw, list) and raw:
        head = raw[0]
        if isinstance(head, dict):
            if "chat_messages" in head:
                return "claude"
            if "mapping" in head:
                return "chatgpt"
    return None


def parse_claude(raw):
    for conv in raw:
        cid = conv.get("uuid") or conv.get("id") or ""
        title = conv.get("name") or "(untitled)"
        msgs = []
        for m in conv.get("chat_messages", []):
            sender = (m.get("sender") or "").lower()
            role = "user" if sender in ("human", "user") else "assistant" if sender in ("assistant", "ai") else sender or "unknown"
            text = m.get("text")
            if not text and isinstance(m.get("content"), list):
                text = " ".join(c.get("text", "") for c in m["content"] if isinstance(c, dict))
            if text:
                msgs.append((role, text, _iso(m.get("created_at"))))
        yield cid, title, "claude", conv.get("created_at"), msgs


def parse_chatgpt(raw):
    for conv in raw:
        cid = conv.get("conversation_id") or conv.get("id") or ""
        title = conv.get("title") or "(untitled)"
        mapping = conv.get("mapping", {}) or {}
        rows = []
        for node in mapping.values():
            msg = node.get("message") if isinstance(node, dict) else None
            if not msg:
                continue
            role = ((msg.get("author") or {}).get("role")) or "unknown"
            parts = ((msg.get("content") or {}).get("parts")) or []
            text = " ".join(p for p in parts if isinstance(p, str))
            ct = msg.get("create_time")
            if text.strip():
                rows.append((role, text, ct))
        rows.sort(key=lambda r: (r[2] is None, r[2] or 0))
        msgs = [(r[0], r[1], _iso(r[2])) for r in rows]
        yield cid, title, "chatgpt", conv.get("create_time"), msgs


def parse_jsonl(path):
    convs = {}
    order = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            o = json.loads(line)
            cid = str(o.get("conversation_id") or o.get("conversation") or "default")
            if cid not in convs:
                convs[cid] = {"title": o.get("title") or cid, "msgs": []}
                order.append(cid)
            text = o.get("text") or o.get("content") or ""
            if text:
                convs[cid]["msgs"].append((o.get("role") or "unknown", text, _iso(o.get("created_at"))))
    for cid in order:
        c = convs[cid]
        yield cid, c["title"], "jsonl", None, c["msgs"]


def build(export, db_path, fmt):
    if fmt == "jsonl":
        conv_iter = parse_jsonl(export)
    else:
        with open(export, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
        detected = detect_format(raw)
        if detected == "claude":
            conv_iter = parse_claude(raw)
        elif detected == "chatgpt":
            conv_iter = parse_chatgpt(raw)
        else:
            sys.exit("ERROR: could not detect export format (expected Claude or ChatGPT "
                     "conversations.json, or pass --format jsonl). Nothing indexed.")

    if os.path.exists(db_path):
        os.remove(db_path)  # idempotent clean rebuild
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA)
    n_conv = n_msg = 0
    for cid, title, source, started, msgs in conv_iter:
        if not cid:
            cid = f"conv_{n_conv}"
        con.execute(
            "INSERT OR REPLACE INTO conversations VALUES (?,?,?,?,?)",
            (cid, title, source, _iso(started), len(msgs)),
        )
        for seq, (role, text, created) in enumerate(msgs):
            con.execute(
                "INSERT INTO messages (conversation_id, seq, role, text, created_at) VALUES (?,?,?,?,?)",
                (cid, seq, role, text, created),
            )
            n_msg += 1
        n_conv += 1
    con.execute("INSERT INTO messages_fts(messages_fts) VALUES('optimize')")
    con.commit()
    con.close()

    if n_msg == 0:  # fail loud — a "successful" empty index is the defect
        sys.exit("ERROR: 0 messages indexed. The export parsed but held no message text. "
                 "Check the export file — nothing was written.")
    print(f"Indexed {n_msg} messages across {n_conv} conversations → {db_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Build a searchable SQLite+FTS5 DB from an AI chat export (stays local).")
    ap.add_argument("--export", required=True, help="Path to the export file (conversations.json or .jsonl).")
    ap.add_argument("--db", default="chat_history.db", help="Output SQLite DB path (default: chat_history.db).")
    ap.add_argument("--format", choices=["auto", "jsonl"], default="auto", help="Force jsonl; otherwise auto-detect.")
    args = ap.parse_args()
    build(args.export, args.db, args.format)
