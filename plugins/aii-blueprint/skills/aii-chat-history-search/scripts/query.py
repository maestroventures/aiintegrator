#!/usr/bin/env python3
"""
query.py — search and dump a chat-history database built by build_index.py.

All reads are local. Nothing is sent anywhere.

Commands:
  search "<fts query>"        Full-text search; ranked snippets with conversation + role.
  thread <conversation_id>    Dump a whole conversation in order (the 'gold thread' pull).
  list [--limit N]            List conversations, newest-titled first.
  stats                       Counts by source/role — a quick shape check.

FTS query syntax is SQLite FTS5: bare words, "quoted phrases", AND/OR/NOT, prefix* .
Examples:
  python3 query.py --db chat_history.db search "pricing AND objection"
  python3 query.py --db chat_history.db search "\"blended cost\""
  python3 query.py --db chat_history.db thread conv_42
"""
import argparse, sqlite3, sys, textwrap


def _con(db):
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    return con


def cmd_search(con, query, limit, context):
    try:
        rows = con.execute(
            """
            SELECT m.message_id, m.conversation_id, m.role, m.created_at,
                   c.title,
                   snippet(messages_fts, 0, '»', '«', ' … ', ?) AS snip,
                   bm25(messages_fts) AS score
            FROM messages_fts
            JOIN messages m ON m.message_id = messages_fts.rowid
            JOIN conversations c ON c.conversation_id = m.conversation_id
            WHERE messages_fts MATCH ?
            ORDER BY score
            LIMIT ?
            """,
            (context, query, limit),
        ).fetchall()
    except sqlite3.OperationalError as e:
        sys.exit(f"ERROR: bad FTS query {query!r}: {e}")
    if not rows:
        print(f"No matches for {query!r}.")
        return
    for r in rows:
        print(f"\n[{r['title']}]  ({r['role']}, {r['created_at'] or 'n/a'})  id={r['conversation_id']}")
        print(textwrap.fill(r["snip"], width=100, initial_indent="  ", subsequent_indent="  "))


def cmd_thread(con, cid):
    conv = con.execute("SELECT * FROM conversations WHERE conversation_id=?", (cid,)).fetchone()
    if not conv:
        sys.exit(f"ERROR: no conversation with id {cid!r}.")
    print(f"=== {conv['title']} === ({conv['message_count']} msgs, source={conv['source']})\n")
    for m in con.execute(
        "SELECT role, text, created_at FROM messages WHERE conversation_id=? ORDER BY seq", (cid,)
    ):
        print(f"--- {m['role']} ({m['created_at'] or 'n/a'}) ---")
        print(m["text"].strip() + "\n")


def cmd_list(con, limit):
    rows = con.execute(
        "SELECT conversation_id, title, source, message_count FROM conversations "
        "ORDER BY message_count DESC LIMIT ?", (limit,)
    ).fetchall()
    for r in rows:
        print(f"{r['conversation_id']:<24} {r['message_count']:>5} msgs  [{r['source']}]  {r['title']}")


def cmd_stats(con):
    tot = con.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    conv = con.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]
    print(f"{tot} messages across {conv} conversations")
    for src, n in con.execute("SELECT source, COUNT(*) FROM conversations GROUP BY source"):
        print(f"  source {src}: {n} conversations")
    for role, n in con.execute("SELECT role, COUNT(*) FROM messages GROUP BY role ORDER BY 2 DESC"):
        print(f"  role {role}: {n} messages")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Search/dump a local chat-history DB.")
    ap.add_argument("--db", default="chat_history.db")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("query"); s.add_argument("--limit", type=int, default=15); s.add_argument("--context", type=int, default=12)
    t = sub.add_parser("thread"); t.add_argument("conversation_id")
    l = sub.add_parser("list"); l.add_argument("--limit", type=int, default=50)
    sub.add_parser("stats")
    args = ap.parse_args()

    con = _con(args.db)
    if args.cmd == "search":
        cmd_search(con, args.query, args.limit, args.context)
    elif args.cmd == "thread":
        cmd_thread(con, args.conversation_id)
    elif args.cmd == "list":
        cmd_list(con, args.limit)
    elif args.cmd == "stats":
        cmd_stats(con)
