---
name: aii-onboard-client
description: >
  AI Integrator Blueprint: Onboard Client. The one skill that owns standing a new client up on the
  Blueprint, end to end, so nobody re-derives the order. It knows where the email ends and where the
  session takes over: the email does only what cannot wait for a session — add the plugin and sign in
  to its one Blueprint connector — and hands the person into a task. Everything after that runs here, with
  someone on the line: every tool the company uses signed in once in the Command Center and its permissions checked while
  the person clicks, the required account skills, the equipment check, the interview with every answer
  written back to the client's own store, then the hand-off to the audit. Fires on "onboard," "new client setup," "get them
  started," "stand up their Blueprint," "run the install," or the first working session on a fresh
  seat. It never reports a step done that it cannot see.
---

# Onboard Client

Standing a client up used to be four things in four rooms — a walk page, a plugin, a spec, and a
card library — and **no single thing owned the order.** So every session re-derived it, each one drew
the boundary somewhere slightly different, and the honest answer to *"can this be done in session?"*
came back different every time. That is not a documentation problem. **It is a missing procedure**, and
this is the procedure.

**The one sentence this skill exists to hold: the email does as little as possible, and everything a
session can carry, the session carries.** The line is not "is this a click in Settings" — a person can
click while a session guides them. **The line is whether anyone is on the line with them.** Before the
Blueprint connector is signed in, nobody is, so those steps have to be written down in an email. The
moment it is connected, a session is there, and it can do what an email never can: see whether a step
actually landed, notice when it did not, and keep track. Every argument about "what onboarding means"
has been this line, undrawn.

---

## One entry point, three states — the words the person used do not choose the room

*"Patch me up," "tune me up," "onboard me," "set me up"* — however a person asks to be brought right,
it is **one entry point**. They never pick between onboarding, a setup check and a company audit. The
system works out which of three states they are in, and routes:

- **Installed** — they have already been set up. Check their skills, tools and connections, review the
  assets they already hand out (Patch Me Up), then offer to measure the company against its ideal
  (Tune-Up).
- **New, with files** — they have started, or they have handed over real material (a transcribed
  meeting, an executive summary). Continue where it left off, starting from what they gave.
- **New, with nothing** — there are no documents to start from. Start from scratch.

**These are separate rooms behind one door, and they call each other:** this skill stands a new client
up, Patch Me Up keeps a set-up person current, and Tune-Up measures the company against its ideal. How
many skills that is does not matter to the person and is never a question to put to them.

**The steps for each state are a lookup, not a list in this file** — the instance's first-run route
returns them in order for the state given. **Read the state from the person's own record; never infer
it from the words they used.** If the record cannot say which state they are in, say so in one plain
line and ask one plain question — *"have you been set up before, and is there anything written about
the company you want to bring?"* — rather than guessing.

---

## Step 0 — Know which side of the line you are on

Before anything else, establish **where this client is**: have they done the email's two things — the
plugin added and its Blueprint connector signed in — or not?

- **Not yet** → your job is Step 1: get them the email, or back to it. There is no session to work in
  until the Blueprint connector is signed in.
- **Both done, and they are in a task with you** → your job is Step 2 onward. Do **not** start the
  interview until Step 2 is finished: a client answering questions before their equipment is live
  produces answers with nowhere to land.

If you cannot tell, **say so and ask them one plain question** — *"have you added the plugin and
signed in to the Blueprint connector yet?"* — rather than guessing, then call `ping` to confirm it.
Guessing here is how a client gets asked to redo work they already did.

---

## Step 1 — The email does two jobs, then hands them to a session

Somebody has to reach the person before any of this can start, and nobody is on the line with them yet.
So the first message is an **email**, and its whole job is the two things that cannot wait for a
session:

1. **Get the plugin added.**
2. **Get the Blueprint connector (it arrives with the plugin) signed in.**

Around those two, it carries only what they need to do them: a short, plain description of what is
about to happen and roughly how long it takes; what to have ready before they start; how to add the
plugin and how to sign in to its Blueprint connector, each with *how you will know it worked*; and the
handoff — **open the desktop app, start a new task (not a chat), and say they are ready to onboard.**
The words for the app and the kind of task come from the person's own setup, never typed as a vendor
name into the copy.

That description also says what KIND of conversation is coming: the steps are ordered to make it easy
to follow, not a form to get through, and questions are welcome at any point and are never
interruptions. A person who arrives believing it is a script will behave like one — and will not tell
you when something is off, because nothing will feel wrong enough to mention.

**It does NOT carry anything a session can do instead** — no tool sign-ins, no permissions step, no
link to a setup page, and nothing about what happens after they are connected. An email can instruct
and can never check; a session can do both. Every step moved out of the email is a step that can be
tracked.

The reasoning, and it is the whole design principle: *as few things as possible happen in the email;
anything that can be handed to a session is handed to a session,* because that is where somebody can
see whether it actually happened.

*(Lens: Krug — one obvious next action. Carnegie — say why they should care before you say what to do.)*

---

## Step 2 — In the session, they click and you guide, one tool at a time

The person is now in a task with you. **They do the clicking; you tell them the next click, one at a
time, and you check each one landed before moving on.** Nothing here is a screen or a form.

**Say first that this is a conversation, not a script.** Before the first instruction, tell them in
your own words: the steps are ordered to make this easy to follow, not to hold them to a track; they
can talk or type at any point; a question is never a side question and never an interruption — it is
part of the setup; and if an answer does not work, or does not match what is on their screen, say so
and make you work it out rather than letting *"I cannot see that from here"* be the end of it. Say it
once, plainly, at the start — never as a written list they are meant to read.

**Say what "Always allow" means BEFORE the first prompt appears, not after they ask.** The very first
Blueprint tool call puts an Always allow / Allow once choice in front of them, and it reads like a
blank cheque. It is not, and they will ask — every walker so far has. Tell them first, in your own
words: **you keep control, and this prompt is not where control lives.** Always allow only says this
AI app may reach that tool without asking again; WHAT the AI may then DO is set by them in the
Command Center, act by act — always-allow, always-ask, or blocked — and that is enforced on our side,
on every single call, whatever they clicked here. Allow once works too and simply asks again next
time.
⚠ **AND SAY THAT IT COMES BACK — ONCE PER TOOL, NOT ONCE.** This is the part that rattles people:
they approve, assume it is done, then it appears again, and again. It is the AI APP asking, once for
each tool it reaches for, and it prints the tool's raw property names rather than a sentence.
MEASURED 2026-09-22 on one walk: four separate cards, one reading only *"Do one thing in one of my
tools"* with a bare *"Limit 3"* beneath it. We do not draw that card and cannot restyle it, so telling
them first is the ONLY remedy. Say plainly: you will see this several times, it is the app and not
us, the wording is blunt because it is machine-generated, and none of them widen what the AI may do.
Never let them meet the second one unwarned — a repeat nobody mentioned reads as something going
wrong. Say it once, plainly, before they hit the prompt. A
person who is asked to approve something they do not understand either refuses and stalls, or agrees
uneasily and trusts the whole setup less from that moment on.

**The failure this prevents is not confusion, it is politeness.** Measured 2026-09-22: a walker sent
every screenshot to his sponsor instead of to the session, saved his questions up as *"side questions
that are separate from the process we are doing,"* and said afterwards *"I haven't really been 'stuck'
completely."* He was not lost and would never have said he was — he had read the walk as a script and
himself as someone following it. A line that only invites people to speak up when they are stuck does
not reach that person.

1. **Confirm their setup — never ask it cold.** Call `my_seat_env`, show them its `confirm_question`
   word for word, and ask only "is this right?". If they correct a field, call `correct_my_seat_env`
   with just that field. Everything you tell them to click branches on it, and getting it wrong
   describes a screen they do not have.
2. **Confirm the plugin and its Blueprint connector from the email actually landed.** Call `ping` and read the live
   state; a person who followed the email is not proof that it worked. The framework's own skills
   **arrive with the plugin** — there is no separate step for them, and telling a client to install
   them individually sends them hunting for something that is already there.
   **And confirm the plugin is CURRENT, not merely present.** `ping` proves the connector answers; it
   says nothing about which plugin the seat is running. Run `aii-patch-me-up` Step 2g here — read the
   installed version off the `aii-job-poke` stamp and compare it with the plugin door — and if the seat
   is behind, stop and have them update before anything else (Cowork: ⋮ → Check for updates, then
   Update). Say which version they have and which is current. A plugin installed weeks ago does not
   update itself, and every step after this one is written against the current one.
   **THEN TURN AUTO-UPDATE ON FOR THE MARKETPLACE, ONCE, WHILE YOU ARE BOTH LOOKING AT IT.** A
   marketplace a person added themselves has auto-update **OFF by default** — that default is only ON
   for Anthropic's own marketplaces, so every client of ours starts frozen. It is one toggle, in the
   plugin screen under the marketplace's own entry, and it is the ONLY thing that stops this person
   freezing again the moment we ship. Do it here, with them, and never leave it as something to do
   later. Two honest limits to say out loud rather than hide: a running session keeps the version it
   started with, so a new task is what picks an update up; and if "Check for updates" ever answers
   "Failed to update marketplace" and leaves Update greyed out, that is a known desktop bug and the
   fix is to remove the marketplace and add it back from the same link.
3. **Check their permissions with them — and GET THEM INTO THE COMMAND CENTER FIRST.** It is a
   separate site from Claude and from Google. It lives at **https://app.aiintegratorhq.com**, and sign-in is
   by email: they type their address there and the system emails them a link back. **Say the address
   out loud before the first step that needs it.** It is not linked from the public homepage, and no
   tool a session can reach knows it — so naming "the Command Center" without giving the address
   strands the person completely. Measured 2026-09-22: a walker asked *"I have to be in the AI
   Integrator Command Center. Where is that exactly?"*, his own AI answered that it did not know and
   that only the person who set him up knew it, and his walk stopped dead until a human handed the
   address over. Then
   call `what_can_i_do` and walk the settings it returns; any change is theirs to make in the Command
   Center, never the session's.
4. **Capture their sender addresses, then let them confirm each one.** Once Google is signed in (Me →
   Connections, #settings/connections), call `do_action` for "See sending identity" on their own account and pass the addresses
   unchanged to `capture_my_sender_addresses` with source "connector". If that read fails, ask them to
   list the addresses they send email from, and pass their words with source "person_said". Then call
   `list_my_unconfirmed_sender_addresses` and ask each `question` word for word, one address at a time:
   business, personal, or no longer used, and may I send email from it. Record each answer with
   `confirm_my_sender_address` before asking the next. Never answer for them; `suggested` is a hint,
   not their answer. No new Google permission is asked for (ruling
   dr_a_clients_sender_addresses_are_captured_in_their_first_onboarding_session_20260915).
5. **Then each tool THIS company uses, and nothing else.** The list is the company's own tools marked
   allowed (`client_connector.allowed = true`), never the plugin's manifest and never the catalog. A
   tool the company does not use is not offered, not mentioned and not signed in. For each one, the same
   loop: sign it in once in the Command Center, then call `what_can_i_do` and confirm its acts read `connected`, then check its settings — then the next.
   ⚠ **HAND THEM A LINK THEY CAN CLICK, NEVER A PATH TO WALK.** Company tools is
   **https://app.aiintegratorhq.com/#settings/tools** and a person's own Google is
   **https://app.aiintegratorhq.com/#settings/connections**. Give the whole link, as a link, and stop
   there — do NOT also recite "Settings → Admin → Company tools", because the link already lands on
   that screen and the menu path just asks them to do by hand what the link already did. A bare host
   with a hash route is something they have to retype; a full link is one click. Measured 2026-09-22:
   a walker was handed the host plus a four-step menu path for a screen the link opens directly.
   ⚠ **THIS APPLIES TO THE TOOL'S OWN SCREENS TOO, NOT JUST OURS** — but READ OUR OWN CODE BEFORE YOU
   SEND ANYONE INTO A TOOL. Most tools here are signed in FROM the Command Center and need nothing
   fetched by hand. WooCommerce is the worked example and it is a warning, not a template: on
   2026-09-22 a session sent a client into `wp-admin` to generate REST API keys, when
   `lib/woo/connect.js` takes the STORE ADDRESS ONLY, sends the person to their own store's approval
   screen, and receives the keys automatically. The manual step was invented, and it cost a client
   their time on a live call. So: before describing any step inside a tool, read the connector's own
   file and hand the person the step our code actually expects.
   ⚠ **NEVER HAND A LINK WITH A PLACEHOLDER IN IT — THAT IS NOT A LINK.** `https://<their-store>/...`
   is a template for YOU, not something a person can click. If their domain is not already on record,
   ASK FOR IT FIRST — "what is the web address of your store?" — then build the whole link from their
   answer and hand it finished. A person handed `YOUR-STORE.com` has been given homework, and the
   session has quietly moved its own job onto them. Read the domain back as part of the link so a
   wrong one is caught before they click rather than after.
   Nothing is installed: the only connector is Blueprint, and every action goes through `do_action` / `check_action`.
   Never report a later act as done because an earlier one succeeded.
   Every tool runs through the Blueprint connector (its sign-in stored in the Command Center); none is
   installed as a connector of its own. Sign it in once, in the Command Center, and verify one call.
   If the company has no allowed tools recorded, say so and ask which tools they use; never fall
   back to installing everything.
   Once `what_can_i_do` shows a tool's acts as `connected`, record it with `record_my_connection_test`: pass the tool and what it answered, word for word. Never record a test that did not answer.
6. **Enable the required account-level skills.** These are **not** the framework's own skills and do
   **not** arrive with the plugin — each is enabled per account, one at a time. Which ones are required
   is a property of the JOBS the framework performs for this client, read from the capability floor;
   never inferred from what happens to be installed.
   Read your own skill listing and record what is really on with `record_my_skills_observed`, one call per provider. Say whether the listing is complete. Read any `uncovered` names back to them: those are skills that are on but that the setup does not know about.
7. **Turn on the check-in that runs the company's scheduled work, on this account.** Follow
   `aii-job-poke` *Installing it on an account* exactly: one hourly schedule, the standard name and
   text, and its allowed-tools block passed IN THE CREATE CALL — a schedule missing one of those tools
   stops at the first run and never says so. On their yes, create it; then `get` it and read its allowed
   tools back against the block. If a schedule named `AII Poke` already exists, do not create a second
   and do not update it: run `aii-patch-me-up` Step 2f for this account. Tell them it is proven only
   when the first beat lands (a `job_run` row for their company whose detail starts `door=`), and say
   which outside tools their company's jobs will reach so they can allow those too.

**This step ends when the last of these is done and verified.** Nothing that asks the client a question
about their business belongs here — that is Step 4.

⚠ **Verifying a step is part of the step.** Say *here is how you will know it worked* before they click,
then read the result yourself. **Some settings cannot be read from inside a session.** When a step's
result is one of those, say so out loud and ask them to tell you what they see — never let a step you
could not see read as a completed one.

*(Lens: Norman — one next action, and its result visible. Nygard — never let an unverified step read as
a completed one.)*

---

## Step 3 — First thing in the session: check the equipment before you ask anything

By now the client has done the email's two things and Step 2 with you. **Do not open with a question
about their business.** Open by confirming that what they just set up is actually live — hand this to
**`aii-patch-me-up`**, which owns it: it reads the Blueprint connector, which tools read connected, and the required-capability
floor, sorts everything into plain buckets, and offers the one fix for anything that is not live.

This is a hand-off, not a re-implementation. **One fact, one file.**

Two things this skill insists on, because a checklist the client ticks cannot check either:

- **A step the client ticked is a claim, not a proof.** Re-read the live state. A client who clicked
  "authorize" and landed on an error page will tick the box anyway, because the page told them to.
- **A missing skill announces nothing.** A tool that is not signed in fails loudly the first time something
  reaches for it; a missing skill just quietly does not fire. So the floor gets checked explicitly,
  every time, and a floor read that comes back empty is a **defect, never a clean result.**

---

## Step 3b — Give their workspace its shape BEFORE anything is filed into it

Numbered 3b on purpose rather than renumbering the steps below it: this is a small step that has to
happen at a specific moment, not a re-cut of the sequence.

The client's folders get their declared shape and their drawer vocabulary **now**, before the
interview writes the first thing into them. The house tier's *When you put working files away* block
is the rule; this is the only moment it can be applied for free.

- **Register this client's drawer vocabulary in their OWN store first, then create the folders.** The
  order matters: the standing work-drawer check refuses to run without a vocabulary for the seat it
  is checking, so folders created before the vocabulary exists are folders nothing can police. If the
  write target cannot be resolved, **stop and say so** — the Step 4 rule about never falling through
  to a default store applies here too, and it applies harder, because a drawer vocabulary written to
  the wrong seat makes every later check answer confidently about somebody else.
- **Say the shape out loud, in their words, before creating anything, and get a yes.** What each
  top-level folder is for, in one plain line each. This is a client-facing structure they will live
  in for years, so it is a question, not a default — and per Step 6 it is *said*, one at a time,
  recommendation first. Never a rendered list they are expected to approve by looking at it.
- **Then create the shape, and write the declaration down where they will find it.** A shape that
  exists only in this conversation is not declared. The folder that holds the declaration is part of
  the shape.
- **Create it through the one door, so the shape is recorded all at once.** Read the shape from
  `client_workspace_template()`. First look for a folder already named exactly "AIOS — <Company>" at
  the top of their Drive (and for each ruled folder under it): if there is one, reuse it and create
  only what is missing; if there are two, stop and show them both — never pick one. After their yes,
  create the root in the person's own Drive at the
  account root, named "AIOS — <Company>", then each folder under it with `do_action` "Create file" (a folder), keeping every
  id Drive returns. Then record the whole shape in ONE call to `record_my_workspace_shape`, with the root's id and every folder's id exactly as Drive returned them. It
  refuses a partial shape or a folder that is not in the template, and records nothing when it refuses
  — so if it refuses, say what Drive already made and stop. `lib/onb/workspace-shape.js` is this same
  flow in code.
- **Why this is a step and not a cleanup task later:** measured 2026-08-10 on a workspace with no
  declared shape, the folders that had none held 86, 35, 16 and 13 things and the one with a written
  taxonomy held 5 — and untangling one of them afterwards nearly broke the product, because by then a
  personal folder had become a load-bearing address for something else. People adopt what is already
  there. Born with the shape costs one step; retrofitting it costs a session and risks a regression.
- **Do not report this step done if you cannot see the folders.** Same rule as every other step here.
  Seeing them means reading them back: list "AIOS — <Company>" and its folders with `do_action` "See file", and
  read the saved workspace root and one folder record per folder from their store. If any is missing,
  say which and do not move on.

*(Lens: Rogers — an innovation is adopted on its observability and its complexity, and a folder that
already exists scores on both where a written rule scores on neither. Evans — one bounded context,
one owner: the client's vocabulary lives in the client's store.)*

---

## Step 3c — Read what they already gave you, BEFORE you ask them anything

Numbered 3c for the same reason 3b is 3b: a small step at a specific moment, not a re-cut of the
sequence. It is the **session reads** half of the operator's ruling on the intake step (option label
verbatim and complete: *"Both — walk collects, session reads, client confirms on screen
(Recommended)"*). **The walk that label names no longer exists**, so the collect half happens here, at
the start of this step: ask them to put the documents they already have into the declared folder, then
read. Step 4's opening bullet is the third half.

**Why it is a step and not a courtesy, measured.** Against one real client's artifact set: of the
five seeded onboarding cards, **3 were already fully answered** in documents we authored and
delivered to them eleven weeks earlier, **2 were partly answered**, and **0 were genuinely new
questions**. The worst asked them to run a multi-hour engine whose finished output — 46,000 words,
marked Final — had been in their folder for thirteen days. Skipping this does not waste their
minutes. It teaches them in the first five that this room does not remember what they paid us to
write down.

- **Check the store can hold it before you open a single file.** If the intake tables are absent from
  the client's own store, that is a **schema apply that is owed, not a table to build** — the house
  declaration already carries them and nothing re-applies it after a client is provisioned. Say that
  in those words and stop. Never regenerate the install schema; it is already correct.
- **Read the declared set, never a walk of their tree.** Every file read becomes a document the
  interview **states out loud it has read**, so a tree walk swallows another client's notes the first
  time somebody drops a folder in. Reading too little costs one question they were going to be asked
  anyway; reading too much silences a question forever and nothing goes red.
- **You do the reading, and you own what you write down.** The loader calls no model. It hands you
  each document and the closed menu of elements; you return quoted claims. Quote only from the
  extract you were handed, never from a fuller copy of the file — the store keeps and re-checks the
  extract, and a quote from outside it lands marked verified against text nobody can check again.
- **Report what you could NOT read, by name, out loud.** A skipped file, two folders holding the same
  filename, a renamed folder, a document longer than the extract — each is a question the client
  still gets asked, and that is the correct failure. Never let *"we could not read your PDF"* reach
  them as *"your document answered nothing"*: the first is true about us, the second is false about
  them.
- **A quote proves it came from their document. It does not prove it answers the question.** A real
  sentence filed under the wrong element passes every wall here, silences its question permanently,
  and nothing goes red. That gap is open and named on the board; your judgement is the only thing
  standing in it.
- **Do not report this step done if you did not open a file.** Same rule as every other step here. A
  client who handed over nothing gives an honest empty result — and that is indistinguishable from a
  step that never ran unless you say which one happened. Then read back the saved record for each
  document you named, with what it answers. Your own summary of a file is not proof it was recorded.
- **Save each document you read with `register_my_document`, once per document, as you finish reading it.** Pass its name, its kind, where it lives, the whole text you read, and the sha256 of the file bytes you opened. It saves the document and its text into the company's own store in one step. Then read `read_by_interview` and `truncated` back to the person in plain words.

*(Lens: Christensen — the job they hired us for includes taking setup work off them, and asking for
what they already sent is the opposite. Nygard — the preflight names the real cause instead of
throwing a raw missing-table error at whoever reads it next.)*

---

## Step 4 — The interview is a conversation, and every answer is written back

Now the questions. They already exist as data — this skill does not author them and must not restate
them; it **runs** them, in order, in the client's own words.

- **OPEN BY SAYING WHAT YOU ALREADY KNOW, AND ASK THEM TO CONFIRM IT.** This is the *"client confirms
  on screen"* half of the operator's intake ruling and it is the first thing out of your mouth in
  this step, before a single question. Name the documents you read, in their own filenames. Say what
  those documents already answer. Where two of their documents answer the same thing differently, do
  not tick it off and do not adjudicate it — **ask them the ordinary question**, because two
  different answers means the element is unsettled, not that somebody is wrong (option label
  verbatim: *"Don't tick it off — just ask them (Recommended)"*). Then ask only what is genuinely
  still open.
- **READ THE PLAN BEFORE THE FIRST QUESTION: call `my_interview_plan`.** It says, for each question,
  whether their own documents already answer it (never ask it), answer part of it (ask only the part
  that is missing) or leave it open (ask it the ordinary way), and it hands you the opening sentence
  naming the documents you read. If they say a document is wrong or out of date, its answers stop
  counting and those questions are asked normally. If the plan cannot be read, **say so plainly** —
  never fall back to asking everything as if nothing had been read. *(Approved 2026-09-18 by pop-up,
  option label verbatim: "Yes, after #449 merges (Recommended)".)*
- **IF THE COMPANY WAS SET UP FROM A CONFIGURED ONBOARDING, ASK ITS BELIEFS AS CONFIRMATIONS, ONE AT A
  TIME.** A configured onboarding is set up in advance by a trade or a partner. Read the confirm
  prompts the store hands you for this company (`interviewPlanFor`). For each one, say the belief in
  its own words and ask *"Is that true for your business?"*, with three replies: **yes** (save the
  belief as their answer), **mostly, in my words** (save their words), **not us** (save nothing and ask
  that question in full, the ordinary way). Save only through `recordConfirmReply`, which records where
  the belief came from and what they said. Nothing is saved before they answer. Never offer a belief for
  a goal question, and if the store refuses, stop and say so. With no prompts, run the interview exactly
  as below. *(Approved 2026-09-16/17, `dr_third_onboarding_path_is_configured_onboarding_20260916`.)*
- **Ask them here, one at a time, in plain language.** A form does this badly: it cannot follow up, cannot notice an answer that contradicts an earlier one, and cannot
  tell the difference between *"I do not know"* and *"that does not apply to us."* A conversation can.
- **Write every answer back with `record_my_answer`, as it is given**, in their words. On the last answer of each card, pass `section_finished: true` so what they said reaches the company's instructions straight away. If `publish.state` comes back `requested` or `refused`, tell them in plain words that the answer is saved and what is still waiting. Not at the end, not in a
  summary. An answer held in the conversation and never written is lost the moment the chat closes.
- **A question that belongs to somebody else gets handed to them**, with enough context to answer it,
  and the answer lands beside the client's rather than replacing it. When they say *"I do not know"*,
  never offer a likely answer. Ask who does know, hand the question to that person with
  `hand_off_question`, and read back the delegation row it wrote before moving on.
- **Before `finish_my_onboarding`, call `publish_my_answers` once.** Only report the interview as done when it answers `published`. `requested` means someone with publish rights still has to approve it: say who. Any refusal: say what `detail` says.
- **Whose store the answers land in is not a detail.** A client's answers about their own company
  belong in the client's own record. If the write target cannot be resolved, **stop and say so** —
  never fall through to a default store and report success. A wrong write here succeeds silently, and
  a silent success is the worst outcome available.

*(Lens: Evans — one bounded context, one owner. Nygard — a fallback that fires on failure is a defect
wearing a helpful face.)*

---

## Step 4b — Then the person, not only the company

Step 4 is about the company. This step is about the **person in front of you**: who they are, what they
want for themselves, what they care about, how they sound, and how they want to grow. It runs for every
new person, for every teammate joining a company that is already running, and for anyone coming back who
never had it. The operator, 2026-09-24: *"I don't see anything here about the actual user, themselves.
Their own personal goals, their own personal interests, their own uh, personal profile, who they are,
their own speaking voice."* (`dr_the_blueprint_wizard_covers_the_person_not_only_the_company_20260924`.)

Five parts, in this order, one at a time, with Step 4's rules (say what you already know first, one fact
per question, their words, every answer written back with `record_my_answer` as it is given):

1. **Who they are.** Run the personal questions for their role — where they sit, what they do, how they
   like to be talked to — from the interview plan, exactly as Step 4 runs the company's. If the plan
   carries no personal questions for their role, **say so plainly** and ask the plainest few from the
   framework's personal question bank for their role by hand.
2. **Their own goals.** What they want to achieve for themselves this year, separate from the company's
   goals, dated, so a return visit can ask how they did.
3. **Their interests.** What they care about outside the work, in their words.
4. **Their speaking voice.** Run **`aii-voice-capture`**: ask for a few things they have written, or where
   to find them, and build their voice profile. If they have nothing to hand, say it can be done later and
   put it on their board — never skip it silently.
5. **Their growth.** Make **`aii-betterment-slot`**'s offer, once, with its one plain example and a yes or
   no. Record the answer either way.

**Where it lands.** Everything here belongs to the person: their own company's store, the user tier,
never the company tier and never anyone else's record. If a part has no dedicated place to be written
yet, write it to their own profile and **say where it went** — never keep it only in the conversation.

**Done means read back.** A part is done only when its written answer reads back. A part the person
chose to leave for later is recorded as left for later, with a board card, and offered again on their
next visit.

*(Lens: Carnegie — what changes for them is that the system talks like them and about their goals, not
only the company's. Allen — a part left for later gets one home and one next action.)*

---

## Step 5 — Then, and only then, the audit

Once the equipment is live and the interview is captured, hand off to **`aii-tune-up`** for the deep
audit of the company against the framework. This skill does not perform the audit and does not
duplicate any part of it.

Note the seam that already exists and do not re-litigate it: the Tune-Up's **build half** needs no
connectors and can run early; its **reconcile half** waits until the company's tools read connected, because it
reads the company's real stuff through them.

The hand-off is done only when the board shows the ranked gap cards the Tune-Up wrote for this
company, dated after it ran and naming the goal. Hand-off started is not hand-off done.
When the tune-up finishes, update the company's first-tune-up card with `put_tune_up_card` (card `hand_off`): what ran, when, and where the ranked gap cards are.

---

## Step 6 — Never leave an offer as a rendered affordance

Everything this skill hands a client — a step, an install, an enable, a fix — is **said, in words, one
at a time, recommendation first.** Drawing a button or a list on a screen is not asking. The rule and
its lived proof are homed in **`aii-patch-me-up`** Step 3; this skill enforces it and does not restate
it.

---

## Fail loud, and never fake a finish

- **A step you cannot verify is reported as unverified**, by name. Never fold it into a count of
  completed steps.
- **A capability floor that reads empty is a defect**, not an empty result.
- **A client store that cannot be reached stops the run.** Say which store and say what you tried.
- **A step that fails and cannot be fixed in the session is raised, not only said.** Tell the person in
  plain words what broke and that their setup partner has been told, then call `raise_setup_problem`
  once with the step and what the tool answered, word for word. It lands as an owned alert the
  operator is sent. Read back the alert it returns; if it refuses, say so. Never go on past the step.
- **"They said it is done" is not evidence, and neither is "the email told them how."** The live read is
  the evidence.

---

## When NOT to use

Not for a client who is already stood up and running — that is `aii-patch-me-up` for the setup and
`aii-tune-up` for the company. Not for signing one more tool in on an existing seat. This is the first
run, once, for a new client.

---

*v1.18 — 2026-09-22. Approved by the operator in chat, one word: "yes". Corrects v1.17, which said the prompt lets the app "reach the Blueprint connector without asking again each time" — implying ONE prompt. It is once per TOOL.

ESTABLISHED BY A PEER SESSION AND CORROBORATED HERE FROM SCREENSHOTS. The card is the AI APP's, not ours: it renders the tool's raw JSON property names, we do not draw it and cannot restyle it. Measured on one walk 2026-09-22: four separate cards, including one reading only "Do one thing in one of my tools" with a bare "Limit 3" beneath, plus Check the connection, See what my setup has actually proved, and See which machine and AI app I am signed in on. Confirmed independently from the store that our own engine does NOT fire them — line_answer_for(..., 'See', 'permission') returns always-allow held at the company tier since 2026-09-18, so every See line was already permitted at the moment the app asked. A walker told "you will see this once" meets the second card unwarned, and a repeat nobody mentioned reads as a fault. RELATED AND NOT DONE: job_3_8_20260810 is a registered job, never run — "the moment a connector is installed, the person is walked through its permissions - always allow first, then tighten the exceptions." Lens: Norman (a control that reappears must be predicted or it reads as failure), Carnegie (warn before, never explain after), Nygard (name whose surface it is — ours or the app's).*

*v1.17 — 2026-09-22. Instructed by the operator mid-install, verbatim in part: "we need to basically do a good job up front of saying, you always have control we have permissions in place ... I keep getting the question and they're going to get the question and it's vague and ambiguous". Adds one paragraph to the Step 2 opener: say what Always allow means BEFORE the first prompt appears.

WHY IT BELONGS AT THE OPENER AND NOT AT THE PROMPT: the first Blueprint tool call raises the choice within seconds of the walk starting, before any other step, and it reads as a blank cheque to someone who has just met the product. It is not one - it only lets the AI app reach the connector without re-asking; what the AI may DO is the Command Center's per-act setting (always-allow / always-ask / blocked), enforced server-side on every call by lib/svc/lines.js whatever was clicked in the app. MEASURED: the operator reports being asked this by every walker so far, and answering it live each time. The cost of not saying it first is not a delay - it is a person either stalling at the prompt or agreeing uneasily and trusting the rest of the setup less. Lens: Carnegie (say why before what), Krug (answer the question they are about to ask), Schneier (a permission a person does not understand is not consent).*

*v1.16 — 2026-09-22. Instructed by the operator in chat during a live install, verbatim and complete: "you should have given thhat link to chelle". Extends v1.15's link rule to THIRD-PARTY screens. One paragraph on Step 2 item 5; nothing renumbered.

v1.15 made the session hand a clickable link instead of a menu path for OUR Command Center. The same session then walked a person through WooCommerce by describing where to click INSIDE WooCommerce - the identical defect, one product over, committed within the hour by the very session that had just written the rule. The rule was scoped to our own screens and so did not reach the case that mattered. It now names the tool's own screens explicitly, carries WooCommerce as the worked example with the real deep link, and states the one fact a person cannot recover from if nobody says it first: the consumer key and secret are shown ONCE. It also records the way this very rule was got WRONG first: the session's initial worked example sent a client into wp-admin to generate WooCommerce REST keys by hand, when lib/woo/connect.js takes the store address alone and the store returns the keys itself - an invented step, paid for live. Hence the standing instruction to read the connector's own file before describing anything inside a tool. It also forbids handing over a link that still carries a placeholder: the operator caught exactly that in the same exchange, verbatim, "the user needs a way to get their verison of this / without me" - a templated link is the session keeping its own work and posting the remainder to the client. Lens: Krug (hand the thing, never the route to the thing), Norman (the person should not have to hold a map of someone else's product), Nygard (a rule that stops at your own boundary has not been tested at the boundary that breaks).*

*v1.15 — 2026-09-22. Instructed by the operator in chat, verbatim and complete: "why are we giving them instructions that they can't actually click? Why are we making them work for it?" Recorded as an in-chat instruction, not a pop-up label. Two wording changes, no step renumbered. (1) Step 2 item 3's Command Center address is now a whole clickable link rather than a bare host. (2) Step 2 item 5 gains one rule: hand a link that lands on the screen, never a menu path to walk, and never both. The hash routes this skill has carried since v1.10 (#settings/tools, #settings/connections) are useless on their own — a route with no host cannot be clicked, which is the same defect v1.13 fixed for the Command Center itself, repeated one item further down. MEASURED 2026-09-22 on a live install: the walk handed a person "app.aiintegratorhq.com/#settings/tools" as plain text AND a four-step menu path (Settings → Admin → Company tools) for the screen that link opens directly — so the one thing they could not do was click, and the one thing they were asked to do twice was navigate. Lens: Krug (do not make me think, and do not make me type what you could have linked), Norman (the control and the action must be the same gesture), Nygard (a route printed without its host is not a route).*

*v1.14 — 2026-09-22. Instructed by the operator in chat, verbatim and complete: "we do not want anyone to freeze -- we ant the plugin to auto update ALWAYS with no human intervention whenever possible" (typo his). Recorded as an in-chat instruction, not a pop-up label. Extends Step 2 item 2: after the version check, turn AUTO-UPDATE ON for the marketplace, once, with the person watching.

WHY THIS IS THE WHOLE FIX AND ALSO WHY THE GOAL AS STATED CANNOT BE MET. Researched against the Claude Code docs and the help centre on 2026-09-22. (a) Auto-update for a marketplace a person added themselves is OFF BY DEFAULT; it defaults ON only for Anthropic's own marketplaces. So every client we onboard starts frozen, by default, and no change we make to our own repo alters that. (b) "Shared with you" distribution, which DOES auto-update for recipients, is Team/Enterprise and ORGANISATION-ONLY — there is no documented way to share a plugin with someone on a separate account, so it is unavailable for external clients however convenient it sounds. (c) There is no settings, CLI or marketplace.json field that reaches an account we do not manage; managed settings (enabledPlugins, extraKnownMarketplaces) stop at the organisation boundary. (d) Even with auto-update on, a RUNNING session keeps the version it launched with (updates land after start, with a random delay of up to ten minutes), so a new task is what activates one. CONCLUSION: zero-human-intervention is not achievable for external accounts today. ONE toggle, done once during onboarding while somebody is on the line, is the closest reachable state and it converts "frozen forever" into "current from the next task onward". That is why it belongs in the walk and not in a document nobody opens. Known bug named in the step: anthropics/claude-code #72089, unfixed on desktop for git-backed marketplaces. MEASURED THE SAME DAY: a seat added from our marketplace sat on 0.9.36 against a 0.9.47 shelf for a week with nothing telling anyone. Lens: Nygard (name the default that is against you), Krug (one toggle, done for them, beats a instruction they will not follow), Christensen (the job they hired us for does not include version admin).*

*v1.13 — 2026-09-22. Instructed by the operator in chat, verbatim and complete: "fix this before we repack and submit" — recorded as an in-chat instruction rather than a pop-up label, because that is what actually happened and a fabricated option label would be worse than an honest note. Adds the Command Center's ADDRESS and sign-in method to Step 2 item 3, the first step that needs it. No step renumbered; the sentence is folded into the existing item.

WHY IT WAS MISSING AND WHY THAT IS THE WHOLE POINT: this skill names the Command Center in items 3 and 5 and hands out hash routes (#settings/tools, #settings/connections) — routes that are useless without a host. It never said the host. Nothing else fills the gap: the mint door's invitation email carries no Command Center link, the address is not linked from the public homepage, `app_surface` is empty, and no store this session could read holds it. MEASURED 2026-09-22 on the first real second seat: the walker asked where it was, his AI told him truthfully that it could not find it and that only the operator knew, and the walk halted for six minutes until the operator typed "App.aiintegratorhq.com" into a chat by hand. Two people onboard within the hour on the same sequence and would have hit the identical wall. Lens: Krug (the one obvious next action is not obvious if its address is a secret), Nygard (a route with no host is not a route), Norman (an instrument the person cannot locate cannot be operated).*

*v1.12 — 2026-09-22. Pop-up-approved by the operator, twice on the same day: first "Write both as drafted (Recommended)", then "both" on the reframe below. THREE additive edits, no renumbering. (1) Step 2 opens by saying this is a CONVERSATION, NOT A SCRIPT — the steps are ordered to make it easy to follow, not to hold anyone to a track; a question is never a side question; and an answer that does not match their screen gets pushed back on rather than accepted. (2) Step 1's existing "short, plain description" clause now also says what KIND of conversation is coming, so the person does not arrive believing it is a script. This does NOT breach the minimise-the-email principle: it adds nothing the email must DO, only what its already-required description must SAY. (3) Step 2 item 2 gains the plugin-currency check: `ping` proves the connector, not the plugin, so run `aii-patch-me-up` Step 2g HERE and stop if the seat is behind. Edit 3 is a MOVE, not a new rule — the check stays homed in patch-me-up Step 2g; onboarding simply reaches it at Step 2 instead of at Step 3, where an old plugin has already broken the steps in between.

MEASURED, 2026-09-22, one walker, three findings. He ran a seat at plugin 0.9.36 against a 0.9.47 shelf, added from a marketplace (which never self-updates) on the email's own instructions, and carried a second, retired `aii-onboarding` plugin alongside it. His walk called See permission at 13:07 local time, got `not-found`, and at 13:15 fell back to reciting the RETIRED per-connector permissions procedure — naming the Workspace connector, which `dr_one_blueprint_connector_is_the_target_20260917_141400` had already replaced. He stalled in Step 2 item 3 and so never reached the Step 3 hand-off that carries 2g. And the reason nobody heard about any of it for hours is edit 1's: he was not confused and did not consider himself stuck. His words, verbatim: "I haven't really been 'stuck' completely." Lens: Krug (say the one thing they need before they need it), Norman (the person must know the instrument accepts input), Nygard (a check that runs behind the failure it detects is not a check), Carnegie (tell them what kind of room they walked into).*

*v1.11 — 2026-09-19. Approved by the operator (`dr_onboard_client_raises_setup_failure_20260919_055433`). Adds one "Fail loud" bullet: a step that fails and cannot be fixed in the session is told to the person and raised with `raise_setup_problem`, an owned alert the operator is sent (ruling `dr_a_break_during_a_clients_stand_up_routes_to_the_proctor_20260825_113800`). The tool `raise_setup_problem` is in aii-site PR #515. Nothing else changed.*

*v1.10 — 2026-09-19. Approved by the operator in chat, verbatim "skill lines yes" (`dr_setup_skills_use_the_client_seat_tools_20260919`). Applies the lines of house file 69 (Parts 1 and 2) so a client's own seat can make each store write through a Blueprint tool now that `run_sql` is builder-only: Step 2 items 5 and 6 record the connection test (`record_my_connection_test`) and the observed skills (`record_my_skills_observed`); Step 3b records the shape with `record_my_workspace_shape`; Step 3c saves each document with `register_my_document`; Step 4 writes answers with `record_my_answer` and publishes with `publish_my_answers` before `finish_my_onboarding`; Step 5 updates the hand-off card with `put_tune_up_card`. The tools shipped in aii-site PRs #486/#488. Nothing else changed.*

*v1.9 — 2026-09-18. Pop-up-approved by the operator (question 2 of 2 in "Every Company Gets Its Own Place S5", option label "Yes, after #449 merges (Recommended)"). Adds one Step 4 bullet: read `my_interview_plan` before the first question and never ask what the company's own documents already answer. The tool ships in aii-site PR #449 (merged 2026-09-18, 606b963); it reaches a seat when the plugin is next repacked and shipped. Nothing else changed.*

*v1.8 — 2026-09-17. Pop-up-approved by the operator (`dr_03_onboard_client_asks_configured_beliefs_as_confirmations_20260917`, option label "Yes, add the step (Recommended)"). Adds a Step 4 bullet after "open by saying what you already know": when the company was set up from a configured onboarding (a trade or a partner), ask each belief as a confirmation, one at a time (yes / mostly, in my words / not us), through `interviewPlanFor` and `recordConfirmReply`; nothing saved before they answer; never a goal question. The code ships in aii-site PR #411 (merged 2026-09-17); shipped in plugin 0.9.34. Nothing else changed.*

*v1.7 — 2026-09-15. Pop-up-approved by the operator (dr_onboard_client_captures_and_confirms_sender_addresses_20260915, option label "Approve the edit (Recommended)"), carrying his prose ruling dr_a_clients_sender_addresses_are_captured_in_their_first_onboarding_session_20260915 ("b"). Adds Step 2 item 4: after Workspace is authorized, capture the client's sender addresses from `email_sendas_list` (or their own words) with `capture_my_sender_addresses`, then have them confirm each one with `list_my_unconfirmed_sender_addresses` and `confirm_my_sender_address`; no new Google permission. The tools ship in aii-site PR #364 (merged 2026-09-15). Former items 4 and 5 renumbered to 5 and 6. Nothing else changed.*

*v1.6 — 2026-09-15. Pop-up-approved by the operator, two edits (dr_onboard_client_confirm_setup_never_cold_20260914_224841, option label "Approve edit 1 (Recommended)"; dr_onboard_client_i_dont_know_hands_off_20260914_224841, option label "Approve edit 2 (Recommended)"). Step 2 item 1 no longer asks which machine and which app cold: it reads the seat with `my_seat_env` and asks only "is this right?", correcting a field with `correct_my_seat_env`. The interview's hand-off bullet adds: on *"I do not know"*, never offer a likely answer; hand the question to the person who knows with `hand_off_question` and read back the row it wrote. The GENERIC MASTER banner now allows naming a Blueprint tool only where a step must call it (dr_onboard_client_banner_never_names_a_tool_20260915_004858, "Approve fix 2 (Recommended)"). Nothing else changed.*

*v1.6 — 2026-09-24. Pop-up-approved by the operator (dr_locked_03_edit_aii_onboard_client_step_20260924_151826, option label "Add it and publish (Recommended)"). Adds **Step 4b — Then the person, not only the company**: who they are, their own goals, their interests, their speaking voice (`aii-voice-capture`), and the growth offer (`aii-betterment-slot`), for every new person, joining teammate and returning person who never had it. Additive; no existing step changed. Cause, measured: the person half of onboarding was prescribed (dr_the_whole_onboarding_job_and_why_it_exists_20260817) and carried by the retired card walk; when the walk was retired, only the company interview moved into this skill.*

*v1.5 — 2026-09-14. Pop-up-approved by the operator (dr_locked_03_edit_aii_onboard_client_proof_20260914_080933, option label "Add all three (Recommended)"). Adds ONE read-back sentence each to Step 3b (read the Drive folders and the saved workspace records back), Step 3c (read back the saved record for each document named) and Step 5 (the Tune-Up hand-off is done only when its ranked gap cards are on the board). Matches first_run_step 9, 10 and 17, whose evidence was rewritten the same day. Nothing else changed.*

*v1.4 — 2026-09-13. Pop-up-approved by the operator (dr_locked_03_edit_aii_onboard_client_step_20260913_203304, option label "Write it as drafted (Recommended)"). Adds ONE sentence to Step 3b in front of "After their yes, create the root": look first for a folder already named exactly "AIOS — <Company>" (and each ruled folder under it), reuse it and create only what is missing, and stop and show both if there are two. Matches PR #242 (workspace-shape.js re-run reuses the root). Nothing else changed.*

*v1.3 — 2026-09-13. Pop-up-approved by the operator (dr_locked_03_edit_aii_onboard_client_step_20260913_195432, option label "Write it as drafted (Recommended)"). Adds ONE bullet to Step 3b naming the door that records the client workspace shape: client_workspace_template() for the shape, drive_create in the person's own Drive after their yes, then one all-or-nothing client_workspace_shape_apply() call (the flow shipped as lib/onb/workspace-shape.js in PRs #234 and #237). Placement follows dr_where_a_clients_aios_root_lands_and_who_creates_it_20260905. Nothing else in the skill changed.*

*v1.2 — 2026-09-13. Pop-up-approved by the operator 2026-09-13 (dr_locked_03_edit_aii_onboard_client_v1_2_20260913_063207, option label "Write it as drafted (Recommended)"). **Corrects the skill to the onboarding that actually runs.** The spine sentence "a session cannot click Settings" and Steps 0–2 described the retired setup walk; they now describe the email (plugin + Workspace connector, then a task) and the session that carries every other step while the person clicks. Every other step is unchanged except that "the walk" is no longer named as a thing that exists. Registers dr_the_web_walk_is_gone_the_email_hands_off_to_a_session_20260817 (clauses 1, 3, 4), dr_the_email_is_minimal_and_session_is_where_tracking_starts_20260825_130000 (the email's two requirements and the minimise-the-email principle, superseding the permissions clause of the 08-17 row), dr_the_old_onboarding_generation_is_retired_and_recoverable_20260907, and dr_command_center_install_wizard_and_the_20260913_053931. Step 3c's placement of the intake collect half is the session's reading, marked as such in the step. Lens: Evans (one boundary, named for its real reason), Nygard (an email cannot verify; a step you could not see is never done), Norman (one next action, its result visible), Ohno (fix the skill that taught sessions the walk, not only the page).*

*v1.1 — 2026-09-11. New section **One entry point, three states** above Step 0 — the single home for the ruling that however a person asks to be brought right, it is one door, the system reads which of three states they are in (installed · new with files · new with nothing), and the skills are rooms behind it that call each other. `aii-patch-me-up` and `aii-tune-up` each carry a one-line pointer here and never restate it. Registers `dr_one_entry_point_onboard_or_realign_20260821_165142` (item (b) of its landing, amended to three states 2026-09-09) and `dr_locked_03_edit_asset_review_and_entry_20260911_083405` (the approval of the exact wording, 2026-09-11). Additive: Step 0 and every numbered step unchanged. Lens: Evans (three bounded contexts behind one door), Nygard (never infer the state from the words used; say so and ask when the record cannot tell), Krug (the person never picks a mode).*

*v1.0 — 2026-08-06. New deployable body, pop-up-approved by the operator (T14 S74). Adopted via `aii-adjudicate`:
KIND = SKILL (a procedure that must run in order); classify = **Absent** — 18 bodies in
`deployable-skills/` and none owns the onboarding walk; **sharpen-first tested and failed to find a
home** — `aii-patch-me-up`'s moment is "check my setup" and `aii-tune-up`'s is "audit the company,"
neither is "walk this person from the door to done." Three-strikes cleared: it RECURRED (the operator,
verbatim: "we keep going round and round about what onboarding actually means," and separately "what I
was told multiple sessions was everything could be done in session, then they couldn't, and I could
never get a straight answer"), it COST DIAGNOSIS every time, and a FIXED SEQUENCE would have prevented
it; the severity override also applies, since the gap blocks an install. Stage: **4 (Do)** —
`blueprint-skills.md` §9. It does **not** close §9's stage-7 hole, which is about confirming that a
written rule or shipped file reached its reader; that hole stays named. Spine is two operator rulings
of 2026-08-06: the walk ends at the last Settings step and everything after is a conversation, and the
first message is a door-opener carrying an overview plus a link and nothing else. Master is
instance-ID-free per §7 — it names the walk, the floor, the question set and the client's own record as
SLOTS; the overlay fills them. Lens: Evans (onboarding is one bounded context with one vocabulary),
Krug (one obvious next action, never a screen to interpret), Norman (the instrument must match the
action — a page for a click, a conversation for a question), Nygard (an unverified step is never a
completed one), Rogers (adoption friction is what the first walk surfaces). Register:
dr_onboarding_is_a_skill_20260806.*
