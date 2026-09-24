# Draft article — Medium + Inkray

> **Publish `docs/article-final.md`, not this.** The session asks for 500 to 800
> words (`docs/BRIEF.md` §4); that version is 799, counting code blocks. This
> long draft is the source it was cut from and keeps everything measured.

Honest over polished. Sections marked `[M6]` need the real-user numbers from
`pnpm evidence` before publishing.

**Length.** The draft body is now about 1,950 words, well past the 500 to 800 I first aimed
at. The retraction section is the reason and it earns its space, so if this needs
to be cut, cut the prefix-versus-bare table and the Vietnamese paragraph first:
both are interesting and neither is load-bearing. Never cut the retraction or the
revocation measurement.

Working titles, written for the person searching rather than for us:

1. **I gave my chatbot memory, then gave the memory back to the users**
2. How to build a chatbot that remembers users between sessions, and lets them revoke it
3. Portable chatbot memory on Walrus: what worked, what broke

Use title 1. It carries the idea that makes this different, and the subtitle can
carry the search terms: *"Adding persistent memory to a chatbot with Walrus
Memory, Gemini and the Vercel AI SDK, and what broke along the way."*

---

## Draft

Most chatbots forget you when you close the tab. The ones that don't have a
second problem nobody mentions: the memory belongs to the company that built the
bot, not to you.

I built hippo for Walrus Session 8 to see how far the other way you can go. It
talks on the web, on Telegram and in a terminal, it remembers you across all
three, and the memory lives in a Walrus Memory account **you** own on Sui
mainnet. hippo holds a delegate key. You can take it away.

### What it stores, and when

Nothing fancy. Every memory is one line of text:

```
[profile] [by:@mai] [2026-09-21] Only uses pnpm, never npm or yarn.
[gotcha]  [by:@mai] [2026-09-21] Postgres runs on 5433 because 5432 is taken.
[style]   [by:@mai] [2026-09-21] Wants short answers, in Vietnamese.
```

Six types: profile, decision, gotcha, commitment, correction, style. The model
writes them through a tool in the same turn it learns them, without being asked.
Before each reply, hippo recalls against the user's message and injects what
comes back as untrusted data, never as instructions.

I worried the bracketed prefix would poison the embeddings, so I measured it.
Same ten facts, written twice into two namespaces, once with the prefix and once
bare, then the same ten questions against both:

| | recall@5 | mean distance of hits |
|---|---|---|
| With prefix | 10/10 at rank 1 | 0.583 |
| Bare text | 10/10 at rank 1 | 0.577 |

Six thousandths of a point. Keep the prefix.

I ran the same thing in Vietnamese, since that is what my users speak. Six facts
came back byte-identical, diacritics and all, and eight questions recalled 8/8 at
a mean distance of 0.581. Asking in Vietnamese about something stored in English
worked, and so did the reverse. Nothing to report there, which is worth saying
out loud in an article that spends its second half complaining.

That table taught me something more useful, though. Real matches landed between
**0.449 and 0.777**. The SDK's guidance calls anything above 0.7 "usually
unrelated", and `withMemWal`'s default relevance threshold works out to a 0.6
cutoff. That default would have thrown away half of my true positives. If you are
asking questions rather than matching statements, measure your own distances
before trusting a threshold.

Every reply in the web chat carries the memories it was built from, shown under
the answer with a link to each encrypted blob on Walrus. That line exists because
memory working and the model guessing read exactly the same in plain text. If a
bot claims to remember you, you should be able to check.

### Before and after

`pnpm demo` in the repo is the honest version of a demo. It teaches hippo five
things, then changes its mind about one of them ("we moved from pnpm to bun"),
throws the conversation away, and asks four questions in a session that has never
seen them:

```
PASS  Which package manager should I use here?   → "Bạn nên dùng bun."
PASS  Which ORM did we settle on?                → "Chúng ta đã chọn Drizzle…"
PASS  What port is the database on?              → "…cổng 5433."
PASS  What do you know about me?                 → answered in Vietnamese
PASS  0 of 5 answers stated pnpm without bun
```

The last one is my favourite, and it is now an assertion rather than an
observation. Nobody asked it to speak Vietnamese in that session. A `style`
memory from the previous one changed how it writes, and the eval fails if the
answer comes back in English. That is memory shaping behaviour, not memory being
quoted back.

The correction was the hardest line in that list to earn. When I first added it,
it was lost three different ways. Dedupe threw it away as a duplicate of the fact
it replaced, because "I no longer use VS Code" sits 0.24 from "I use VS Code" and
distance cannot see the word "no". The model sometimes acknowledged the change in
words and never stored it, and one of the prompt edits that made that worse was
mine. And "what do you know about me?" recalled the old fact and never the
correction, which no amount of "prefer the newer memory" can fix. Each needed its
own change, and the eval now fails if any answer states the old value.

`[M6]` Real-world use: N people over M days, X memories each, the moment it
mattered.

### What broke

Four things. The third is the one I would most like to have skipped, and it is
the reason the fourth could finally be measured.

**Writes take 24 seconds.** `rememberAndWait` on mainnet, measured. Blocking a
chat reply on that is unusable, so hippo accepts the job, replies immediately,
and records the blob ID in the background. It also writes its local row at accept
time, because a deploy inside that window would otherwise lose a memory the user
was already told about.

**Recall returns nothing while telling you it found something.** The relayer
sometimes answers with `{"results": [], "total": 0, "dropped_count": 5}`. Five
matches found, five discarded, HTTP 200, no error. The SDK's types don't include
`dropped_count`, so a caller just sees an empty list and concludes the user has
no memories. During one run of that four-question eval it fired nine times, three
of them surviving every retry.

I thought I found the trigger. A session-start turn fires four recall queries at
once, so I made them sequential, and the drops went from nine to zero. Twice.
Then I killed a stray background script that had been hitting the same key,
re-ran the identical eval with nothing else in the way, and got fifteen drops.
Worse than any run before it.

So concurrency was not the cause, and my clean-looking fix was luck. Four runs of
the same script gave 4, 9, 0 and 15 drops. The only thing that actually helps is
retrying, and the only reason every run still passed is that a session start
fires several overlapping queries, so the redundancy covers a loss. A bot that
asked once would just have forgotten.

**I wrote up a security bug against Walrus Memory, and it was mine.** This is the
one I would most like to skip and the one most worth writing down.

I read my account off chain and counted four delegate keys. The key hippo was
built with was not among them, yet the relayer accepted it for every route,
including decryption. A randomly generated key was properly rejected, so the
relayer clearly knew this specific key. I concluded that on-chain access control
was not what governed access, wrote it up with a repro, and said so in my notes
as the largest finding of the week. It also meant I could not prove that revoking
on chain stops access, which is the entire promise of the project.

Every observation in that report was accurate. The conclusion was wrong.

There are **two Walrus Memory deployments live on mainnet**, and they are
separate packages rather than one upgraded in place. I know that because a Move
upgrade keeps its original type address, and the newer registry's type carries
the newer package. The documentation names one deployment. `GET /config` serves
the other. I had taken the package id from `/config`, as the docs tell you to
since the published id is stale, and the registry id from the documentation. So
I had been resolving my owner against the wrong registry and reading a real,
active, delegate-bearing account that simply was not mine. My key was on chain
the whole time, on the other account, labelled and correct.

The same mismatch had been breaking something far more visible. Every sponsored
transaction, which is the entire onboarding path, came back:

```
502 {"code":"sponsor_upstream_error","error":"Sponsor service error"}
```

For a working session I treated that as an outage on their side. I even measured
against mainnet to show the sponsor was healthy for everybody else, which it
was. What finally named it was giving up on the relayer and executing the
transaction myself, which printed the simulation error the 502 had swallowed:

```
CommandArgumentError { arg_idx: 0, kind: TypeMismatch } in command 0
```

Argument zero is the registry. One wrong object id, two failures that looked like
completely different problems, and one retracted accusation against somebody
else's security model.

Three habits would have saved the week. Check the Move **type** of every object
id you configure, not just that it resolves. Treat "the vendor's access control
is broken" as needing far more evidence than "the vendor's endpoint is down".
And when a service masks an error, reproduce the operation without that service
in the path.

The fix upstream is one line of JSON: `GET /config` should return `registryId`
beside `packageId`, so a client cannot mix deployments. That is written up with a repro. The
retracted report stays in my repo under its correction, because the mistake is
more instructive than the finding would have been.

### What revoking actually does

With the account id corrected, the test that had been blocked since day one ran
in about a minute and needed nobody's permission. A throwaway wallet, a fresh
account, a delegate key registered on chain, a memory written and recalled with
it, then the key removed on chain:

```
add delegate key      on chain after 3s
write and recall      blob written, recall returned 1
remove delegate key   gone from chain after 3s
recall at +0s         accepted
recall at +15s        accepted
recall at +32s        refused, 401
```

**Revocation works, and it is not instant.** Roughly half a minute passed before
the relayer stopped honouring a key the chain had already dropped. So hippo says
"within about a minute", and on `/disconnect` it also destroys its own copy of
the key, which closes that window immediately and costs nothing to keep.

Every transaction there was sponsored. The wallet never held any SUI, which is
what makes one-click onboarding possible in the first place.

**You cannot read your own memory without the relayer.** I wanted to end the
demo by downloading the ciphertext from a public Walrus aggregator and decrypting
it locally with the account's own key: anyone can fetch the bytes, only you can
read them. The bytes download fine. The decryption does not, and not because of
permissions. Mainnet memories are sealed by a committee key server that the SDK
does not list among its mainnet defaults, so the obvious attempt fails as "Not
enough shares", which reads like an access problem and is not one. Take the key
servers from the ciphertext, which names them, and you get told the server needs
an aggregator. Point at the aggregator and you finally get the truth: `No API key
found in request`.

So ownership here is real about permission and not yet real about possession.
The chain decides who may read, and I measured that it does. Reading the bytes
yourself still goes through somebody's service. That is worth saying plainly in
an article whose title is about giving memory back to users.

What hippo can hand you is a file. `/export` lists every blob it wrote for you,
with the text of each one checked against the hash hippo recorded when it wrote
it, so the file proves it holds exactly what was stored. It also says, inside the
file, that you cannot decrypt the blobs without the relayer, because that is
true.

There is one more limit worth stating, because I built a UI for it before I read
carefully enough. You cannot delete a memory. `forget` removes the search index,
so nothing can recall it, and the encrypted blob sits on Walrus until its storage
epochs run out. The API that looks like permanent deletion turns out to be
migration cleanup for pre-July blobs and explicitly never accepts a new one. That
is a defensible position for immutable storage to take. It is just not the
position "you own your memory" leads a user to expect, so hippo says it out loud
when you ask it to forget something.

One more, found while writing the recovery tooling. `restore()` is the documented
answer to "what if the relayer loses its index": the blobs are on Walrus, re-index
them. On my account it reports finding zero blobs for a namespace whose memories
recall returns right now, and reports it with `truncated: false`, which reads
like completeness. The address does own the blobs, 197 of them. So the memory is
genuinely on Walrus and I currently have no working way to rebuild an index from
it.

These are written up with repros and filed at
github.com/MystenLabs/MemWal/issues `[HUMAN: file them before publishing; none
is filed yet]`. Twelve of them. A thirteenth is the one I retracted, which stays
in my repo rather than theirs.

### Run it

```bash
git clone https://github.com/UyLeQuoc/walrus-session-8-chatbots
cp .env.example .env && docker compose up -d
pnpm install && pnpm db:push && pnpm demo
```

Built with Gemini 2.5 Flash through OpenRouter on the Vercel AI SDK, Walrus
Memory on Sui mainnet, and a lot of measuring.
