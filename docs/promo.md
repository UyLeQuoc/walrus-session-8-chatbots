# Promo and social drafts

Everything here is ready to paste. Nothing here has been posted; publishing is
the human's call. Check the pre-flight list at the bottom first.

## What the promo prize actually asks for

> Post about **the session** in a community outside the Walrus and Sui
> ecosystem. A relevant subreddit, developer forum, Discord server, newsletter,
> dev.to, Hacker News, or similar all count. Posts on X, r/sui, r/walrus, or any
> Walrus or Sui channel do not count.

The subject is **Walrus Session 8**, not hippo. A post that is purely "here is
my chatbot" is a product launch that happens to mention a hackathon, and it is
the wrong shape for this prize. The right shape is: *this session is open, here
is what building in it is actually like, here is what I measured.* hippo appears
as the evidence that the author did the work, not as the headline.

That framing is also the only one that survives contact with a subreddit.
"Come join this hackathon" is spam; "I spent two weeks in this and here is what
broke" is a post.

### Two different things, do not confuse them

| | Where | What it gets you |
|---|---|---|
| **Merch draw** | A link or screenshot in the Walrus Discord `🤖┃session-8-chatbots` | First 20 entrants, 10 winners |
| **Promo prize** | A post about the session in a community **outside** Walrus and Sui | 5 winners, $100 WAL each |

The Discord post does **not** count for the promo prize: that channel is a
Walrus channel. Neither does X, r/sui or r/walrus. Do both; they are two
entries, not one.

## Session facts, so every draft says the same numbers

- **Walrus Session 8 — "Chatbots That Remember"**, https://thewalrussessions.wal.app/chatbots
- Runs Sep 18 → **Oct 9, 2026 14:00 UTC**. Results Oct 16.
- **$2,500** total, in WAL or stablecoin, across five tracks:
  Best Chatbot $500/$250/$150 · Beyond the Big Two 2 × $150 (primary LLM not
  OpenAI or Anthropic, stacks with Best Chatbot) · Best Article 3 × $100 ·
  Bug Bounty 5 × $100 · Promo 5 × $100.
- To win the build tracks: a chatbot real people can reach on any channel,
  memory stored on Walrus **mainnet**, at least 10 memories written, at least 3
  distinct users with 10 each, public repo, and a 500–800 word article.
- **You can enter without building anything.** Bug bounty and promo have their
  own forms. A good issue with a repro is $100, and the software is early
  enough that finding one is not hard.
- **No token required.** The Walrus Foundation's managed relayer pays the
  storage fees from its own wallet. You need a Sui wallet to own the account,
  not a balance.
- SDKs: TypeScript `@mysten-incubation/memwal`, Python `memwal`, and an MCP
  server.

## X post (required for the submission itself, not for this prize)

> Most chatbots forget you. The ones that don't usually own your memory.
>
> I built hippo for Walrus Session 8: it remembers you across web, Telegram and
> a terminal, and the memory lives in a Walrus Memory account you own on Sui.
> Revoke its key on chain and it forgets, about half a minute later. I measured
> it.
>
> Measuring what actually works, and what broke:
> [article link]
>
> @WalrusProtocol #WalrusMemory

---

# Promo prize drafts

Four communities. Pick one or two; the same text in four places in one
afternoon reads as a campaign and gets removed as one.

## A. r/AI_Agents — best fit

Agent memory is that subreddit's standing topic, it is outside both ecosystems,
and a "here is an open thing in our exact subject area, and here is what it is
like inside" post is welcome there in a way a launch is not. Lead with the
finding, put the session in the second paragraph, put the deadline at the end.

**Title:**

```
There's an open hackathon on agent memory ($2.5k, 2 weeks left). I'm two weeks in — here's what I actually learned about persistent memory.
```

**Text:**

> Walrus Session 8 is running until Oct 9: build a chatbot that remembers its
> users, with the memory stored on Walrus instead of in your own database.
> $2,500 across five tracks. I'm not affiliated, I'm just building in it, and
> the useful part of this post is what two weeks inside it taught me about
> memory generally.
>
> **Cheap models recall fine and stop being changed by what they recall.** I
> wrote an eval that teaches five facts, throws the conversation away, then
> asks four questions in a fresh session. One of the five is not a fact, it is
> a style instruction from the earlier session: *answers in Vietnamese*.
> Nothing in the new session mentions Vietnamese.
>
> Two runs per model: gemini-2.5-flash recalled 4/4 then 3/4 and kept the style
> both times. qwen3.7-flash recalled 4/4 twice and lost the style once.
> deepseek-v4-flash recalled 4/4 twice and lost the style **both** times. The
> cheap ones are a third of the price and are not worse at retrieval — they are
> worse at letting retrieval change their behaviour. They pulled the style
> memory into context and answered in English anyway.
>
> If your eval only asks "did it quote the right fact", every model passes and
> you learn nothing. Put one item in there that has to change *how* the answer
> is written rather than *what* it says.
>
> **Memory writes take about 24 seconds.** Encrypt, upload, index. If you await
> that inside a turn, you have built a slow chatbot. It has to be
> fire-and-forget with a pending state, which means you need somewhere to
> record in-flight writes and a way to show failed ones.
>
> **The failure that cost me the most was a 200.** Recall intermittently
> returns an empty result set while the same response body reports it found
> matches and discarded them. Nothing errors. The bot just doesn't know you for
> one turn. I spent a day tuning prompts before I thought to log the raw
> response, so: log reported-versus-returned on every recall from day one.
>
> On the session itself, two honest notes. It is early software — I have filed
> eleven issues, including stale IDs in the docs and two separate deployments
> live on the same network. And there is a bug bounty track at $100 an issue,
> which exists precisely because of that, so the friction is at least paid.
> There is also a track for not using OpenAI or Anthropic.
>
> You can also enter without building: the bug bounty and the promo post have
> their own forms.
>
> Details: https://thewalrussessions.wal.app/chatbots — deadline Oct 9, 14:00
> UTC. Happy to answer anything about the memory side, that's the part I have
> numbers for.

## B. dev.to

Explicitly named in the rules, long-form, and the post that keeps working after
the session closes. Tags: `ai`, `hackathon`, `typescript`, `webdev`.

**Front matter:**

```yaml
---
title: "An open hackathon on chatbot memory, and five things it taught me"
published: false
tags: ai, hackathon, typescript, webdev
---
```

**Body:**

> There is an open hackathon called **Walrus Session 8 — "Chatbots That
> Remember"**, running until October 9. The brief is one sentence: build a
> chatbot that remembers the people it talks to, and store that memory on
> Walrus rather than in your own database. $2,500 across five tracks.
>
> I have been building in it for two weeks. This post is the thing I would have
> wanted to read before I started: what the session actually asks for, and the
> five things I got wrong inside it. Four of the five have nothing to do with
> this particular stack.
>
> ## What it asks for
>
> A chatbot real people can reach — website, Telegram, Discord, Slack, CLI,
> anything. Memory written to Walrus mainnet: at least ten memories, from at
> least three distinct people. A public repo that someone else can actually
> run. An article of 500–800 words. That is the whole bar.
>
> Two things surprised me about the rules. **You do not need to hold any
> token**: the Walrus Foundation runs a managed relayer that pays the storage
> fees from its own wallet, so you need a wallet to own the account, not a
> balance in it. And **you can enter without building anything** — the bug
> bounty and the promo post have separate forms. A reproducible issue is $100,
> and I will come back to why that is easier money than it sounds.
>
> ## 1. A memory write takes 24 seconds, and that is a design constraint
>
> Encrypt, upload, index. Measured end to end: 23.7 seconds. That number
> decides the shape of your turn loop before you write a line of it.
>
> If the model calls a `remember` tool and you await it, every turn where the
> bot learns something is a turn where the user watches a spinner. So the write
> is fire-and-forget, the tool returns immediately, and the UI shows a pending
> state that resolves later. Which means you need somewhere to record that a
> write is in flight, a way to surface one that failed, and the discipline to
> never count a pending write in any number you report.
>
> All of that follows from one latency measurement I could have taken on day
> one and took on day four.
>
> ## 2. The most expensive failure is the one that returns 200
>
> Recall intermittently answers `200` with an empty result set, while the same
> response body reports that it found matches and discarded them. Nothing
> errors. Nothing retries. The bot simply does not know you for one turn, and
> then does again.
>
> For a memory product this is worse than an outage, because the symptom is
> indistinguishable from the model choosing not to use what it recalled. I
> spent a day on prompts before I thought to log the raw response. Log
> reported-versus-returned counts on every recall, from the first commit.
>
> ## 3. Cheap models recall fine. They stop being *changed* by what they recall.
>
> My eval teaches five facts, discards the conversation, and asks four
> questions in a fresh session. One of the five is not a fact, it is a style
> instruction from an earlier session: *answers in Vietnamese*. The new session
> never mentions Vietnamese.
>
> | model | recall | style kept | cost per run |
> |---|---|---|---|
> | gemini-2.5-flash | 4/4, 3/4 | both runs | ~$0.0035 |
> | qwen3.7-flash | 4/4, 4/4 | one of two | ~$0.001 |
> | deepseek-v4-flash | 4/4, 4/4 | **neither** | ~$0.001–0.002 |
>
> The cheap models retrieved the style memory into context and answered in
> English anyway. A third of the price, no worse at retrieval, worse at letting
> retrieval change behaviour.
>
> The session has a track called "Beyond the Big Two" for not using OpenAI or
> Anthropic, which is what pushed me to measure this instead of assuming it.
>
> ## 4. I published a security finding that was my own misconfiguration
>
> For a week I was certain the service was authorising a key the chain did not
> list. I wrote it up carefully, with a repro. It was wrong.
>
> There are two separate deployments live on mainnet, not one upgraded twice. I
> had taken one id from the live config endpoint and another from the
> documentation, which put me on a real account that was not mine — so of
> course the key I was looking for was not on it.
>
> The report is still in my repo, marked RETRACTED at the top, with what
> actually happened underneath and the real bug filed next to it. Deleting it
> would have been tidier and would have taught nobody anything, including me.
> Ask "what would I have to be misconfigured about for this to be boring"
> before you type the word *vulnerability*.
>
> ## 5. Early software is a feature of a hackathon, not a defect
>
> I have filed eleven issues: stale contract IDs in the docs, an undocumented
> rate limit, two documented call signatures that return different results, the
> silent recall failure above. The session pays $100 per reproducible issue
> through a bug bounty track judged separately by the engineering team.
>
> That changes how it feels to hit friction. Every wasted hour has a form to
> put it in. If you have ever wanted to be paid for the thing you already do in
> a GitHub issue at 1am, that track is the easiest entry in the whole session
> and it does not require you to build a bot at all.
>
> ## If you want in
>
> https://thewalrussessions.wal.app/chatbots — deadline October 9, 14:00 UTC,
> results October 16. TypeScript and Python SDKs, and an MCP server if you
> would rather point an existing agent at it.
>
> My own entry, with the eval and the raw measurements, is here: [repo link]

## C. A non-Walrus developer Discord

An AI/LLM or general dev server where events get announced. Short, because
nobody reads a wall of text in a Discord channel. Check the server's rules for
a `#promo` or `#events` channel and use it; posting this in general chat is how
you get muted.

> Open hackathon on **chatbot memory**, in case it's anyone's thing here:
> Walrus Session 8, running to **Oct 9**. Build a chatbot that remembers its
> users, with the memory stored on Walrus instead of your own DB. $2,500 across
> five tracks.
>
> Two things that make it lower-effort than most: you don't need to hold any
> token (the foundation's relayer pays storage), and there are two tracks you
> can win **without building anything** — $100 per reproducible bug report, and
> $100 for a promo post.
>
> I'm two weeks in. Realest thing I learned: cheap models recall stored facts
> perfectly and still ignore a stored *style* instruction. DeepSeek pulled
> "this user prefers Vietnamese" into context and answered in English anyway,
> in both runs; Qwen did it in one of two. Retrieval is the easy half.
>
> https://thewalrussessions.wal.app/chatbots — happy to answer questions about
> the memory layer, that's the part I have numbers for.

## D. Viblo, or a Vietnamese developer Discord

Outside both ecosystems, and an audience that will mostly not have heard of
this at all — which makes it the post with the highest chance of being useful
to someone rather than just seen. Written in Vietnamese.

**Tiêu đề:**

```
Có cuộc thi về chatbot có trí nhớ đang mở, $2,500, còn 2 tuần — và vài thứ mình đo được sau 2 tuần build
```

**Nội dung:**

> **Walrus Session 8 — "Chatbots That Remember"** đang mở tới **9/10**. Đề bài
> một câu: làm một con chatbot nhớ được người dùng, và bộ nhớ đó lưu trên
> Walrus chứ không nằm trong database của bạn. Tổng giải **$2,500** chia 5 hạng
> mục.
>
> Mình đang build trong đó hai tuần rồi, nên viết luôn mấy thứ mình muốn biết
> trước khi bắt đầu.
>
> **Điều kiện dự thi nhẹ hơn mình tưởng.** Một con bot người thật vào chat được
> (web, Telegram, Discord, Slack, CLI — kênh nào cũng được), ghi được ít nhất
> 10 memory lên mainnet từ ít nhất 3 người, repo public, và một bài viết
> 500–800 chữ. Hết.
>
> **Không cần giữ token nào cả.** Walrus Foundation chạy relayer và trả phí lưu
> trữ bằng ví của họ. Mình cần ví Sui để sở hữu account, không cần số dư trong
> đó.
>
> **Có 2 hạng mục không cần build gì.** Bug bounty $100/issue có repro, và promo
> post $100 — hai cái này có form riêng. Phần mềm còn mới nên tìm bug không
> khó: mình đã nộp 11 cái.
>
> Ba thứ mình đo được, đáng nói kể cả khi bạn không thi:
>
> - **Ghi một memory mất ~24 giây.** Nên không `await` được trong một lượt chat,
>   phải fire-and-forget rồi hiện trạng thái pending. Con số này quyết định
>   kiến trúc trước khi viết dòng code đầu tiên.
> - **Model rẻ nhớ tốt nhưng không đổi hành vi.** Mình viết eval dạy 5 fact,
>   xoá sạch hội thoại, rồi hỏi lại ở session mới. Một trong 5 cái không phải
>   fact mà là style: *"user này thích trả lời bằng tiếng Việt"*. DeepSeek và
>   Qwen recall đúng 4/4, kéo được cả cái memory style vào context, rồi vẫn trả
>   lời tiếng Anh. Nhắc lại một fact thì dễ; để một fact từ hôm trước âm thầm
>   đổi cách viết hôm nay mới là phần mất đầu tiên khi xuống model rẻ.
> - **Lỗi đắt nhất là lỗi trả về 200.** Recall thỉnh thoảng trả mảng rỗng, mà
>   trong chính response đó lại ghi là nó đã tìm thấy và loại bỏ kết quả. Không
>   throw, không retry, bot chỉ đơn giản là quên bạn đúng một lượt. Mình mất
>   một ngày sửa prompt trước khi nghĩ tới chuyện log raw response.
>
> Link: https://thewalrussessions.wal.app/chatbots — hạn 9/10, 14:00 UTC, kết
> quả 16/10. Có SDK TypeScript, Python, và cả MCP server nếu muốn gắn vào agent
> có sẵn.
>
> Ai định thi mà vướng chỗ nào cứ hỏi, phần memory mình có số liệu thật.

---

## If you would rather post about the build than the session

Kept because the submission form also asks for an optional promo link, and
because a Show HN is worth doing on its own merits. **It is the weaker choice
for this prize**, because the subject is hippo rather than the session.

**Title** (68 chars):

```
Show HN: A chatbot where the user owns the memory, not the bot
```

**Text:**

> hippo remembers you across a web chat, Telegram, Discord, Slack and a CLI.
> The memories are encrypted blobs on Walrus, in an account owned by the user's
> own wallet. The bot holds a delegate key the user can remove on chain, and
> after that it cannot read anything. You can try it without a wallet or a
> signup: the web chat puts you in a guest account, and connecting a wallet
> later moves you to your own without losing what it already knows.
>
> Four things I did not expect, all measured on mainnet rather than reasoned
> about:
>
> 1. Writes take about 24 seconds end to end, so remembering has to be
> fire-and-forget with a visible pending state. That changes the whole design
> of the turn loop.
>
> 2. Recall intermittently returns an empty result set while its own response
> reports that it found and discarded matches. A memory bot that does this
> looks like it has amnesia, and the failure is invisible because nothing
> errors.
>
> 3. Cheap models are fine at recall and bad at the thing recall is for.
> DeepSeek and Qwen both recalled 4/4 facts and both dropped *style
> adaptation* — a memory saying "answers in Vietnamese" stopped changing how
> they wrote. Letting a fact change your behaviour is the part that degrades
> first, and it is the part that makes memory feel like memory.
>
> 4. I spent a week certain the relayer was honouring a delegate key the chain
> did not list, wrote it up as a security finding, and was wrong. There are two
> separate deployments live on mainnet, and I had taken one id from the live
> config endpoint and another from the docs, so I had been reading a real
> account that was not mine. The retraction is in the repo next to the report.
>
> The one thing I could not make work: an owner cannot decrypt their own
> memory. The hosted relayer seals blobs against a key server the SDK does not
> list, so I can hand you the ciphertext from a public aggregator but not the
> plaintext. "Your memory is yours" is true about the account and not yet true
> about the bytes.
>
> Repo, a scripted eval that proves cross-session and cross-channel recall, and
> the measurements: [links]

**First comment, posted right after submitting** (HN convention, and where the
honest limits go):

> Author here. Two things worth stating up front.
>
> This was built for a hackathon, so the sample sizes are small and labelled as
> small — the model comparison is two runs per model, not twenty. I am
> reporting what I measured, not what I proved.
>
> And revocation is not instant. The removed key kept authenticating for at
> least 15 seconds after it left the chain and was refused by 32 seconds. That
> window is the sort of thing a marketing page rounds to "immediately", so:
> about half a minute, and the script that measured it is in the repo.

---

## Rules for all of the above

Say the bugs plainly, in the same voice as the article. Every one is filed with
a repro, and reporting them properly is part of the session. Do not soften them
and do not dramatise them.

**Never repeat the retracted claim.** Earlier drafts of everything said the
relayer authorizes delegate keys the chain does not list. It does not. We had
taken the package id from `GET /config` and the registry id from the
documentation, which are two different mainnet deployments, so we were reading a
real account that was not ours. Repeating it in a post is worse than repeating
it in a repo, because nobody reads the correction. If the mistake is mentioned
at all, it is ours, in the first person, with the real bug named after it.

**Say "within about a minute", never "instantly".** Revocation is measured at
about 32 seconds, still accepted at 15. Overstating it invites somebody to test
it and find us wrong about the one claim the project is built on.

**Do not claim to be affiliated with Walrus, and do not hide that you are
entered.** Saying "I'm building in it, not affiliated" up front is what makes
the post allowed in most subreddits. Omitting it is what gets it removed.

## Pre-flight, before any of these go out

1. **Check the session link resolves** and the deadline has not moved.
   Every draft states Oct 9, 14:00 UTC and the $2,500 split from `docs/BRIEF.md`.
2. **The repo has to be public.** Several drafts link to it.
3. **The live app has to be up** if the post links it — that is the first thing
   anyone does after reading. Check the hour you post, not the day before.
4. **Read the target community's self-promotion rule before posting.** Several
   subreddits require a flair or confine this to a weekly thread, and the
   Discord draft belongs in `#events` or `#promo`, not general chat.
