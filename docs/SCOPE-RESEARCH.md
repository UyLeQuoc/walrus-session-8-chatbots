# What is worth adding, and what is not

Researched 2026-09-24, two weeks before the deadline, against a system that is
feature-complete and deployed. Every claim below was checked in the code or
measured against production, not reasoned from memory.

The four judging criteria are the filter: does memory do real work, is it used
by real people, is the build clean and reproducible, is the article useful.
Anything that does not move one of those is not worth the risk this close.

---

## Tier 1: two defects wearing feature clothes

### 1. Nothing resolves a contradiction

> **Done 2026-09-24**, and it was worse than described here. Besides the
> ordering problem below, dedupe was discarding corrections outright and the
> topical recall was not returning them at all. Four failures, four fixes:
> `docs/evidence/conflicts-2026-09-24.md`, `docs/SPIKES.md` §K.

Tell hippo you changed your mind and it keeps both facts.

`rememberWithDedupe` only collapses near-duplicates, under a cosine distance of
0.25. A contradiction sits in the *related* band, 0.25 to 0.55, so it is stored
alongside the original. Both are then recalled, because `recallRelevant` accepts
anything under 0.8. And the system prompt never tells the model what to do when
two memories disagree, even though every memory carries a date.

Measured on production with a fresh identity:

```
1. "I use pnpm for everything, never npm or yarn."   -> stored [profile]
2. "Actually I switched to bun last week."           -> stored [correction]
3. "Which package manager should I use here?"

   recalled [profile]    rel 0.34  I use pnpm for everything, never npm or yarn.
   recalled [correction] rel 0.31  I switched to bun last week. I do not use pnpm any more.

   ANSWER: Use bun.
```

**It answered correctly, and that is the problem.** Nothing in the design
produced that: the stale memory ranked *higher* than the correction, the
`correction` type carries no link to what it supersedes, and the model was never
told newest wins. Gemini worked it out. The measured fallback, `qwen3.7-flash`,
already drops style instructions in one run out of two
(`docs/evidence/model-bakeoff-2026-09-23.md`), so there is no reason to believe
it would work this out reliably. And the crowding gets worse with every
correction: six contradictions deep, the injected set is mostly stale.

This is criterion one, directly. A real user in the M6 week changing their mind
is the likeliest way anyone discovers hippo asserting something false.

**Cost:** small. A conflict rule in the system prompt, injected memories sorted
newest-first rather than by distance alone, and an assertion in `pnpm demo` so
it is proven on every run rather than believed.

### 2. "Your memory is yours" and there is no way to take it

There is no export. `/memory` lists, `/memory search` reads back, `/proof` links
blobs, and Claude Code can read the same account, but nothing produces a file
the user keeps. For a project whose entire argument is ownership, that is the
gap a sceptical judge finds first.

**What can honestly be exported:** blob ids, types, dates, channels, storage
expiry, the account id, the namespace, and explorer links for every memory.
Enough to fetch every ciphertext without hippo. **What cannot:** the plaintext
in bulk. `GET /v1/owners/:owner/memories` returns metadata only, there is no
read-by-blob-id, and client-side decryption is blocked by an aggregator API key
(`docs/issues/12`). Recall returns text a few at a time and is the only path.

The honest version is a manifest that says exactly that, which is this project's
voice anyway.

**Cost:** small. One endpoint, one button, and copy that does not overclaim.

---

## Tier 2: raises scope, needs a decision

### 3. Superseding one memory

Today `/memory forget` is all or nothing. A user who wants one wrong fact gone
has to erase everything. The index already supports removing rows, so marking a
single memory superseded so it stops being recalled is the same machinery with a
narrower `where`. Pairs naturally with 1.

**Cost:** medium. A column, a command, a control on `/me`.

### 4. Discord and Slack, live

Both adapters are written, typechecked and never run. Two tokens from the owner
turn a one-channel bot into a four-channel one, and cross-channel recall is the
demo that makes memory feel like infrastructure rather than a chat feature.

**Cost:** none from me, and it is the cheapest scope increase available.

---

## Tier 3: genuine scope, genuine risk

### 5. Team memory

`hippo-team:<id>` is reserved in CLAUDE.md and has never been started. Shared
memory across several people in one Slack channel is a different product, and a
better one, but it needs an access model, a way to join and leave, and a story
for what happens to a team's memory when a member revokes. Two weeks out, with
M6 unstarted, this is the thing most likely to break what already works.

**Recommendation: no**, unless the real-use week finishes early and cleanly.

---

## Not worth it, with reasons

- **Moving off Railway to serverless.** Breaks three channel adapters, the
  background write, the conversation buffer, the address limiter and the relayer
  pacing, to save about a dollar. See `docs/DECISIONS.md`.
- **More React Bits blocks.** Measured: the App UI blocks are mockups of other
  products (`docs/evidence/react-bits-blocks-2026-09-23.md`).
- **Proactive recall**, where hippo brings something up unprompted. Interesting,
  and the fastest way to make a bot feel creepy during the week it is being
  judged on how it feels.

---

## Order

1. Conflict resolution, with the eval assertion. Protects criterion one.
2. Export. Closes the widest gap between what the project claims and what it does.
3. Discord and Slack, the moment tokens exist.
4. Superseding, if the week is calm.
5. Team memory, only if everything else is finished.
