# Draft article — Medium + Inkray

Target 500 to 800 words. Honest over polished. Sections marked `[M6]` need the
real-user numbers from `pnpm evidence` before publishing.

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

### Before and after

`pnpm demo` in the repo is the honest version of a demo. It teaches hippo five
things, throws the conversation away, and asks four questions in a session that
has never seen them:

```
PASS  Which package manager should I use here?   → "pnpm."
PASS  Which ORM did we settle on?                → "We settled on Drizzle."
PASS  What port is the database on?              → "Our Postgres runs on 5433."
PASS  What do you know about me?                 → answered in Vietnamese
```

The last one is my favourite. Nobody asked it to speak Vietnamese in that
session. A `style` memory from the previous one changed how it writes. That is
memory shaping behaviour, not memory being quoted back.

`[M6]` Real-world use: N people over M days, X memories each, the moment it
mattered.

### What broke

Three things, and the third is the reason I would not ship this without reading
the rest of this section.

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

**The ownership model did not hold for my own key.** The delegate key I built
with does not appear in my account's on-chain `delegate_keys`. I read the object
directly. Four keys on chain; the relayer honours six, including mine, and
decrypts with it happily. A randomly generated key is properly rejected, so it is
not an open door, but it means an owner auditing their account on chain sees
fewer clients than can actually read their memories. It also means I cannot yet
prove that revoking on chain stops access, which is the whole promise.

So hippo does the honest thing: when you revoke, it deletes its copy of your key.
Whatever the relayer decides, hippo no longer has the credential.

All of these are filed: github.com/MystenLabs/MemWal/issues.

### Run it

```bash
git clone https://github.com/UyLeQuoc/walrus-session-8-chatbots
cp .env.example .env && docker compose up -d
pnpm install && pnpm db:push && pnpm demo
```

Built with Gemini 2.5 Flash through OpenRouter on the Vercel AI SDK, Walrus
Memory on Sui mainnet, and a lot of measuring.
