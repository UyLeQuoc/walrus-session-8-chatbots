# The LinkedIn article

This is the promo entry for Walrus Session 8. Nothing here has been published;
that is the human's call. Read the publishing notes and the pre-flight list
before posting.

## What the prize asks for, and why this is shaped the way it is

> Post about **the session** in a community outside the Walrus and Sui
> ecosystem. A relevant subreddit, developer forum, Discord server, newsletter,
> dev.to, Hacker News, or similar all count. Posts on X, r/sui, r/walrus, or any
> Walrus or Sui channel do not count.

The subject is the session, not hippo. hippo appears as evidence that the author
did the work, never as the headline. Prize: 5 winners, $100 WAL each.

**Where LinkedIn stands.** It is not on the excluded list, so it is not
disqualified — but every example the rules name is a *community*, and a personal
LinkedIn feed is structurally what X is: a broadcast to your own followers, and X
is excluded by name. Two ways to remove the doubt, both mapping onto something
the rules name:

1. Publish it as a **LinkedIn Newsletter or Article** — "newsletter" is on the
   list verbatim. This document is written as an article for that reason.
2. Also share it into a **relevant LinkedIn Group**, which is a community, and
   screenshot which one.

### Not the same thing as the merch draw

| | Where | What it gets you |
|---|---|---|
| **Merch draw** | A link or screenshot in the Walrus Discord `🤖┃session-8-chatbots` | First 20 entrants, 10 winners |
| **Promo prize** | This article, published outside Walrus and Sui | 5 winners, $100 WAL each |

Do both. They are two entries, not one.

## Publishing notes for LinkedIn

- **Cover image:** `article-images/cover.png`, 1920×1080. LinkedIn displays an
  article cover at roughly 744×400, so the crop is mild, but check the preview.
- **LinkedIn articles have no code blocks.** Bold, italic, headings, bullets and
  quote blocks are all you get. The one code sample below is written as a quote
  block for that reason; do not paste it expecting monospace.
- **Markdown does not paste.** Rebuild headings and bold using the editor's own
  toolbar. Pasting `**like this**` leaves the asterisks visible.
- **Images go inline** at the four marked points. LinkedIn lets you add a caption
  under each; the captions are written out below and they are load-bearing —
  figure 4 makes no sense to an English reader without its caption.
- **Title field** is separate from the body. Keep it under about 100 characters
  so it does not truncate in the feed.

## The feed post that links to the article

Publishing the article creates a feed post with the article's card below it —
cover, title, and your name. This is the line above that card, and it is the only
thing most people will read. Its whole job is to give a reason to click, so it
must **not** restate the title the card already shows.

The first ~140 characters are what shows on mobile before "see more". Everything
that matters goes there.

**Primary:**

> The cheapest models I tested recalled every stored fact perfectly — and ignored
> the one that said *how* to answer.
>
> That turned out to be the most useful thing I learned in two weeks of building
> for Walrus Session 8, an open hackathon on chatbots that remember their users,
> with the memory stored on Walrus instead of in your own database. It runs to
> October 9.
>
> I wrote up what it is actually like inside: the 24-second write that decided my
> architecture before I wrote a line of it, the recall failure that returns
> HTTP 200, and the security report I wrote that turned out to be my own
> misconfiguration.
>
> Not affiliated. Just building in it like everyone else.
>
> #AI #LLM #SoftwareEngineering #Hackathon

**One-sentence version**, if you would rather let the cover do the work:

> Two weeks inside an open hackathon on chatbot memory, and the thing I did not
> expect was that the cheap models recall your facts perfectly and stop letting
> those facts change how they answer.

**Vietnamese variant**, if your network is mostly Vietnamese:

> Model rẻ nhất trong bài test của mình recall đúng từng fact một — rồi bỏ qua
> đúng cái memory nói *phải trả lời thế nào*.
>
> Đó là thứ hữu ích nhất mình học được sau hai tuần build cho Walrus Session 8,
> một hackathon đang mở về chatbot nhớ được người dùng, bộ nhớ lưu trên Walrus
> thay vì trong database của mình. Hạn 9/10.
>
> Mình viết lại đầy đủ: con số 24 giây quyết định kiến trúc trước khi viết dòng
> code đầu, lỗi recall trả về HTTP 200, và cái báo cáo bảo mật mình viết mà hoá ra
> là do mình cấu hình sai.
>
> Không liên quan gì tới Walrus, chỉ đang dự thi.
>
> #AI #LLM #Hackathon

**Do not put a second link in this post.** The article card is already the link.
A bare URL in the text on top of it looks like a bot and splits the click.

---

# Article

**Title:**

```
Chatbots That Remember: what two weeks of building on Walrus Memory measured
```

**Cover image:** `article-images/cover.png`

---

Every chatbot with memory has the same quiet arrangement. The bot remembers you,
and the bot owns the remembering. You can usually delete it. You cannot usually
take it somewhere else, inspect it, or point a different application at it.

There is an open hackathon about inverting that. **Walrus Session 8 — "Chatbots
That Remember"** runs until **October 9, 2026**, with $2,500 across five tracks.
The brief is one sentence: build a chatbot that remembers the people it talks to,
and store that memory on Walrus rather than in your own database.

I have spent two weeks inside it. This is the article I wanted to read before I
started: what Walrus Memory actually is, and the five things building on it
measured — most of which have nothing to do with this particular stack.

## What Walrus Memory is

It is a memory layer for agents, and the mental model is smaller than the name
suggests.

You hand it a sentence. It embeds that sentence, encrypts it, stores the
ciphertext as a blob on Walrus — a decentralized storage network — and keeps a
vector in a searchable index pointing back at the blob. Later you hand it a
question, and it returns the nearest stored sentences with a distance score. You
put those in the prompt.

**[FIGURE 1 — `article-images/fig1-how-it-works.png`]**

> *Caption: The write path and the read path. Nothing is keyed by an ID; you ask
> in the words the user just used and the store decides what is close enough.*

Three properties matter more than the mechanics.

**The account is an object on Sui, owned by a wallet.** Not by the application.
It is public — anyone can read who owns it and which keys can reach it.

**The bot authenticates with a delegate key**, which the owner registers on chain
and can remove on chain, without asking the application's permission.

**Isolation is `owner + namespace`.** That pair is the entire boundary. Get it
wrong and you have mixed two users' memories together, so it is worth being
boring and explicit about namespaces from the first commit.

Writing one memory is about this much code:

> const memwal = MemWal.create({ key, accountId, serverUrl, namespace })
> await memwal.rememberAndWait("User prefers dark mode.", namespace)
> const r = await memwal.recall({ query, namespace, limit: 5 })

One more thing worth knowing before you dismiss this as a crypto project with a
crypto tax: **you do not need to hold any token.** The Walrus Foundation runs a
managed relayer that pays the storage fees from its own wallet. You need a wallet
to own the account, not a balance in it.

## The part that is actually different

**[FIGURE 2 — `article-images/fig2-revoke.png`]**

> *Caption: Measured on Sui mainnet. The dashed segment is the part the
> measurement does not pin down — the removed key still authenticated at 15
> seconds and was refused by 32, and I do not know where in between it flipped.*

This is the claim the whole idea rests on, so I measured it rather than assuming
it: create an account, register a delegate key, write a memory with it, remove
the key on chain, then keep calling recall until the relayer refuses.

It works. It is not instant. The key kept authenticating for at least 15 seconds
after the chain stopped listing it and was refused by 32 seconds. That is the
sort of gap a marketing page rounds to "immediately", and I would rather write
*about half a minute* than have someone test the claim and find me wrong about
the one thing the project is built on.

The same property points at something I have not finished demonstrating.
Isolation is `owner + namespace`, not key — so a second delegate key on the same
account should read exactly what the first one wrote, which would make
portability something other than an export feature. Point the official MCP server
at the same account and another agent gets the same memories, with no migration
and no file. That follows from the model and I have not measured it yet, so I am
flagging it as the next thing I test rather than listing it above with the things
I did.

## What it looks like when it works

**[FIGURE 3 — `article-images/fig4-recall.png`]**

> *Caption: A real session on mainnet. The question is in English; the answer is
> in Vietnamese, because a memory stored days earlier says the user wants
> Vietnamese. Nothing in this conversation asked for it — the conversation was
> deleted before the question was typed. Each recalled line links to its blob on
> Walrus.*

That screenshot is the whole product in one frame, and the interesting part is
not that it recalled the cat's name. It is that a stored instruction changed
*how* the bot wrote, in a session that had no memory of ever being told.

Which turns out to be the thing that breaks first.

## Five things two weeks measured

**1. A memory write takes about 24 seconds, and that is a design constraint.**
Encrypt, upload, index: 23.7 seconds end to end. If the model calls a `remember`
tool and you await it, every turn where the bot learns something is a turn where
the user watches a spinner. So writes are fire-and-forget with a visible pending
state — which means you need somewhere to record in-flight writes, a way to
surface failed ones, and the discipline never to count a pending write in any
number you report. All of that follows from one latency measurement I could have
taken on day one and took on day four.

**2. The most expensive failure returns HTTP 200.** Recall intermittently
answers with an empty result set while the same response body reports that it
found matches and discarded them. Nothing throws. Nothing retries. The bot simply
does not know you for one turn, and then does again. For a memory product this is
worse than an outage, because the symptom is indistinguishable from the model
choosing not to use what it recalled. I spent a day tuning prompts before I
thought to log the raw response. Log reported-versus-returned counts from the
first commit.

**3. Cheap models recall fine and stop being changed by what they recall.**

My eval teaches five things, throws the conversation away, and asks four
questions in a fresh session. The fifth thing is not a fact, it is the stored
instruction from figure 3 — *answers in Vietnamese*. DeepSeek and Qwen both
recalled the facts perfectly, pulled that instruction into context, and answered
in English anyway.

**[FIGURE 4 — `article-images/fig3-models.png`]**

> *Caption: Two runs per model, reported as the small sample it is. "Stored
> instruction obeyed" is whether the answer actually came back in Vietnamese.
> Cost is the OpenRouter balance before and after each run, so it includes
> retries.*

They are a third of the price and no worse at retrieval. They are worse at
letting retrieval change their behaviour.

If your eval only asks *did it quote the right fact*, every model passes and you
learn nothing. Include one item that has to change **how** the answer is written.

The same lesson came back when I taught it a correction — "we moved from pnpm to
bun". It was lost three different ways: dedupe discarded it as a duplicate of the
fact it replaced, because "I no longer use VS Code" sits 0.24 from "I use VS
Code" and distance cannot see the word *no*; the model sometimes acknowledged the
change without storing it; and "what do you know about me?" recalled the old fact
and never the correction. The eval now fails if any answer states the old value.

**4. I wrote up a security finding that was my own misconfiguration.** For a
week I was certain the service was authorising a key the chain did not list. I
wrote it up carefully, with a repro. It was wrong. There are two separate
deployments live on mainnet, and I had taken one identifier from the live config
endpoint and another from the documentation — which put me on a real account that
was not mine, so of course the key I was looking for was not on it. The report is
still in my repo, marked RETRACTED at the top, with what actually happened
underneath and the real bug written up next to it. Deleting it would have been tidier
and would have taught nobody anything, including me. Ask *what would I have to be
misconfigured about for this to be boring* before you type the word
**vulnerability**.

**5. "Your data is yours" has a testable part and an untested part.** The account
is genuinely the user's; I measured what happens when they revoke. I can hand you
your memory as a file, with every line checked against the hash recorded when it
was written. What I cannot give you is the ability to read it without the relayer:
it seals blobs against a key server the client library does not list, so the
ciphertext is public and the bytes behind it still go through somebody's service.
Ownership of the account, yes. Ownership of the content, not yet. I am shipping
with that written on the page rather than shipping without it written anywhere.

## Early software is a feature of a hackathon, not a defect

I have written up twelve issues with repros: stale contract IDs in the docs, an
undocumented rate limit, two documented call signatures that return different
results, the silent recall failure above. The session pays **$100 per reproducible issue** through a
bug bounty track judged separately by the engineering team.

That changes how it feels to hit friction. Every wasted hour has a form to put it
in. And it means two of the five tracks — bug bounty and the promo post — do not
require you to build a bot at all.

## If you want in

The session runs to **October 9, 2026, 14:00 UTC**, with results on October 16.
You need a chatbot real people can reach on any channel, memories written to
Walrus mainnet, a public repo, and a 500–800 word article. There is also a track
for not using OpenAI or Anthropic, which stacks with the main prize.

**Session and rules:** thewalrussessions.wal.app/chatbots

### Documentation worth starting from

- **What Walrus Memory is** — docs.wal.app/walrus-memory/getting-started/what-is-memwal
- **Quick start** — docs.wal.app/walrus-memory/getting-started/quick-start
- **Ownership and access** — docs.wal.app/walrus-memory/fundamentals/concepts/ownership-and-access
  (the concept everything else follows from)
- **Data flow and security model** — docs.wal.app/walrus-memory/fundamentals/architecture/data-flow-security-model
- **SDK quick start** — docs.wal.app/walrus-memory/sdk/quick-start
- **Vercel AI SDK integration** — docs.wal.app/walrus-memory/sdk/ai-integration
  (the lightest way in, if you already have a chatbot)
- **A worked chatbot example** — docs.wal.app/walrus-memory/examples/chatbot
- **`llms.txt`** — docs.wal.app/walrus-memory/llms.txt, if you would rather hand
  the whole thing to an agent
- **Dashboard**, to create an account and a delegate key — memory.walrus.xyz/dashboard
- **Source and issues** — github.com/MystenLabs/MemWal
- **Portable memory for Claude Code and Codex** — blog.walrus.xyz has a walkthrough
  of the MCP server, which is the fastest way to see the idea without writing code
- **Community** — discord.gg/walrusprotocol

Packages: `@mysten-incubation/memwal` on npm, `memwal` on PyPI, and
`@mysten-incubation/memwal-mcp` for the MCP server.

---

I am not affiliated with Walrus. I am building in the session like everyone else,
and the numbers above are what I measured rather than what I was told. My own
entry, with the eval script and the raw measurements, is at
github.com/UyLeQuoc/walrus-session-8-chatbots.

---

# Supporting material

## Images

| File | Size | Used as |
|---|---|---|
| `article-images/cover.png` | 1920×1080 | Article cover |
| `article-images/fig1-how-it-works.png` | 1600×720 | Figure 1, the write and read paths |
| `article-images/fig2-revoke.png` | 1600×440 | Figure 2, the measured revocation timeline |
| `article-images/fig4-recall.png` | 1536×548 | Figure 3, the real recall, from production |
| `article-images/fig3-models.png` | 1600×480 | Figure 4, the model comparison |

**The figures carry no prose, on purpose.** The first versions restated the
paragraphs around them, which is the most common way an illustrated article gets
worse: the reader meets the same sentence twice and starts skimming both. Each
figure now shows only what the text is bad at — a flow, a timeline, a table — and
everything explanatory lives in the caption or the body. If one of these ever
needs a sentence inside it to make sense, the sentence belongs in the caption
instead.

The figure numbering in the article does not match the file numbering, because
the recall screenshot earned a better position than the slot it was built for.
The files are named for when they were made; the article is ordered for the
reader. Do not renumber the files without re-checking every reference above.

Sources are the `.html` next to each `.png`. Re-render any of them with:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=6000 --window-size=1600,720 \
  --screenshot=fig1-how-it-works.png "file://$PWD/fig1-how-it-works.html"
```

Match `--window-size` to the `.fig` size in each file, or the render is cropped
or padded.

**The cover needs a network connection and `--virtual-time-budget`.** It loads
Instrument Serif and JetBrains Mono from Google Fonts, and without the time
budget Chrome screenshots the page before the fonts arrive and silently falls
back to a serif that is not the one the layout was tuned for.

### How the cover works, since it is not obvious from the source

The headline is set **twice, in the same place**. One copy is clipped to
everything above the waterline and left crisp; the other is clipped to
everything below, nudged 4px right, scaled 1.012 vertically, blurred by half a
pixel and dropped to 55% — so the submerged half of *remember* reads as the same
word seen through water. The waterline crosses the word rather than sitting under
it, which is the whole idea: held below, surfaced on ask.

Those numbers are deliberately small. The first pass used 9px, 1.035 and 40%
opacity with a 1.1px blur, which distorted the word past reading — the effect
announced itself instead of doing its job. If it is ever tuned again, the test is
whether *remember* still reads as one word at a glance.

Two things that will break it if edited carelessly. The clip values are
**absolute pixels**, because `clip-path` percentages resolve against the element
box and not the page — the first version used page-relative maths and clipped
the entire above-water copy away, leaving only the ghost. And `.head` has an
explicit `height`, which those pixel values depend on. Move the headline and all
three numbers have to move together: `top`, the `dry` bottom inset, and the `wet`
top inset.

`fig4-recall.png` is a real screenshot of production, not a mock. If it is ever
retaken, it must stay a real one.

## Rules this article follows

**Never repeat the retracted claim.** Earlier drafts of everything said the
relayer authorizes delegate keys the chain does not list. It does not. The
package id came from `GET /config` and the registry id from the documentation,
which are two different mainnet deployments, so we were reading a real account
that was not ours. Repeating it in a post is worse than repeating it in a repo,
because nobody reads the correction. Where the mistake appears, it is ours, in
the first person, with the real bug named after it.

**Say "about half a minute", never "instantly".** Revocation is measured at about
32 seconds, still accepted at 15.

**Say plainly that you are entered and not affiliated.** It is what makes the
post allowed rather than removed, and omitting it is the fastest way to look like
what it is not.

## Pre-flight

1. **Spot-check the documentation links.** The deep paths come from the docs
   navigation in the reference clone of MystenLabs/MemWal, not from clicking each
   one. `examples/chatbot` and `llms.txt` are confirmed; the rest are derived.
   A dead link in the one section that exists to be useful is the worst place for
   one.
2. **Confirm the session facts have not moved** — the Oct 9 deadline, the $2,500
   split and the five tracks all come from `docs/BRIEF.md`.
3. **The repo must be public** before the last paragraph is true.
4. **The live app must be up** if anyone clicks through after figure 3.
5. **Re-read figure 3's caption against the screenshot.** It is the only image
   whose meaning depends entirely on its caption, and an English-reading audience
   will otherwise think the bot answered in the wrong language.
