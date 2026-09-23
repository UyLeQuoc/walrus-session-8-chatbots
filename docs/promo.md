# Promo and social drafts

Everything here is ready to paste. Nothing here has been posted; publishing is
the human's call. Check the two pre-flight items at the bottom first.

## Two different things, do not confuse them

The session announcement and the promo prize are separate, and satisfying one
does not satisfy the other.

| | Where | What it gets you |
|---|---|---|
| **Merch draw** | A link or screenshot in the Walrus Discord `🤖┃session-8-chatbots` | First 20 entrants, 10 winners |
| **Promo prize** | A post in a community **outside** the Walrus and Sui ecosystem | 5 winners, $100 WAL each |

The Discord post does **not** count for the promo prize: that channel is a
Walrus channel. Neither does X, r/sui or r/walrus. A subreddit, a developer
forum, a non-Walrus Discord, a newsletter, dev.to or Hacker News all count. Do
both; they are two entries, not one.

## X post (required for the submission: tag @WalrusProtocol, use #WalrusMemory, reply under the session announcement)

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

Four communities, in order of fit. Pick one; posting the same text in four
places in one afternoon reads as a campaign and gets removed as one.

## A. Show HN

Hacker News punishes an announcement and rewards a finding. The finding here is
that the interesting problems in "give a chatbot memory" are not the retrieval,
and one of them is that I was confidently wrong in public. Lead with that.

**Title** (80 char limit, this is 68):

```
Show HN: A chatbot where the user owns the memory, not the bot
```

**URL:** https://github.com/UyLeQuoc/walrus-session-8-chatbots

**Text:**

> hippo remembers you across a web chat, Telegram, Discord, Slack and a CLI.
> The memories are encrypted blobs on Walrus, in an account owned by the user's
> own wallet. The bot holds a delegate key that the user can remove on chain,
> and after that it cannot read anything.
>
> You can try it without a wallet or a signup: the web chat puts you in a guest
> account, and connecting a wallet later moves you to your own without losing
> what it already knows.
>
> Four things I did not expect, all measured on mainnet rather than reasoned
> about:
>
> 1. Writes take about 24 seconds end to end. Nothing in a chat turn can block
> on that, so remembering has to be fire-and-forget with a visible pending
> state, which changes the whole design of the turn loop.
>
> 2. Recall intermittently returns an empty result set while its own response
> reports that it found and discarded matches. A memory bot that does this
> looks like it has amnesia, and the failure is invisible from the outside
> because nothing errors.
>
> 3. Cheap models are fine at recall and bad at the thing recall is for. I ran
> the project's own eval against four models twice each. DeepSeek and Qwen both
> recalled 4/4 facts and both dropped *style adaptation* — a memory from an
> earlier session saying "answers in Vietnamese" stopped changing how they
> wrote. Quoting a fact back is easy; letting a fact change your behaviour is
> the part that degrades first, and it is the part that makes memory feel like
> memory.
>
> 4. I spent a week certain that the relayer was honouring a delegate key the
> chain did not list, wrote it up as a security finding, and was wrong. There
> are two separate deployments live on mainnet. I had taken the package id from
> the live config endpoint and the registry id from the docs, so I had been
> reading a real account that was not mine. Retracting it is in the repo next
> to the report, because a wrong finding that quietly disappears is worse than
> one that stays.
>
> The one thing I could not make work: an owner cannot decrypt their own
> memory. The hosted relayer seals blobs against a key server that the SDK does
> not list, so I can hand you the ciphertext from a public aggregator but not
> the plaintext. "Your memory is yours" is true about the account and not yet
> true about the bytes, and saying so seemed better than not mentioning it.
>
> Repo, a scripted eval that proves cross-session and cross-channel recall, and
> the measurements: [links]

**First comment, posted by you right after submitting** (HN convention, and it
is where the honest limits go):

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
>
> Happy to go into any of it.

## B. r/AI_Agents

Memory is that subreddit's standing topic, and it is outside both ecosystems.
Reddit removes anything that opens like a press release, so this one opens with
the finding and mentions the project second. No link in the body of the post —
put it in a comment if people ask, which is also the local norm.

**Title:**

```
I tested whether cheap models are good enough for agent memory. They recall fine and lose the thing recall is for.
```

**Text:**

> I have been building an agent that keeps long-term memory across channels
> (web, Telegram, Discord, Slack, CLI — same memory behind all of them), and I
> needed to pick a model for it on a budget of under a dollar.
>
> So I wrote an eval instead of guessing. It teaches five facts in one session,
> throws the conversation away, and then in a fresh session asks four questions
> that can only be answered from memory. One of the five facts is not a fact at
> all, it is a style instruction from a previous session: *answers in
> Vietnamese*. Nothing in the new session asks for Vietnamese.
>
> Two runs per model. Results:
>
> - **gemini-2.5-flash** — 4/4 then 3/4 recall, kept the style both times.
>   ~$0.0035 a run.
> - **qwen3.7-flash** — 4/4 and 4/4 recall, lost the style in one run.
>   ~$0.001 a run.
> - **deepseek-v4-flash** — 4/4 and 4/4 recall, lost the style in **both** runs.
>   ~$0.001-0.002 a run.
> - **qwen3-235b** — returned no output at all. Cost two hundredths of a cent
>   to find that out.
>
> The cheap models are a third of the price and they are not worse at
> retrieval. They are worse at *being changed by what they retrieved*. Both of
> them pulled the "answers in Vietnamese" memory into context and then answered
> in English anyway.
>
> That distinction turned out to be the whole thing for me. Quoting a stored
> fact back at the user is the demo. Having a fact from three days ago silently
> change how the agent writes today is the product, and it is the first
> behaviour to go when you trade down.
>
> The other thing I would tell anyone building this: my memory writes take
> about 24 seconds to land. If you write memory synchronously inside a turn,
> you have built a slow chatbot. It has to be fire-and-forget with a pending
> state the user can see.
>
> Happy to share the eval script and the raw numbers if anyone wants them.

## C. dev.to

Long form, and the one that keeps working after the session ends. Tags:
`ai`, `typescript`, `webdev`, `opensource` (dev.to allows four).

**Front matter:**

```yaml
---
title: "Five things I measured while giving a chatbot a memory it doesn't own"
published: false
tags: ai, typescript, webdev, opensource
---
```

**Body:**

> Every chatbot with memory has the same quiet arrangement: the bot remembers
> you, and the bot owns the remembering. You can usually delete it. You cannot
> usually take it, inspect it, or point a different application at it.
>
> I spent two weeks building one where that is inverted. The memories live in
> an account the user owns, the bot holds a delegate key, and removing that key
> on chain ends the bot's access. This post is not about the architecture. It
> is about the five things I got wrong on the way, because those generalise and
> the architecture does not.
>
> ## 1. A memory write takes 24 seconds, and that is a design constraint
>
> Encrypt, upload, index. Measured end to end: 23.7 seconds. That number
> decides the shape of your turn loop before you write a line of it.
>
> If the model calls a `remember` tool and you await it, every turn where the
> bot learns something is a turn where the user stares at a spinner. So the
> write is fire-and-forget, the tool returns immediately, and the UI shows a
> pending state that resolves later. Which means you now need somewhere to
> record that a write is in flight, a way to show a write that failed, and the
> discipline to never count a pending write in any number you report.
>
> All of that follows from one latency measurement I could have taken on day
> one and took on day four.
>
> ## 2. The most dangerous failure is the one that returns 200
>
> My recall endpoint intermittently answers `200` with an empty result set,
> while the same response body reports that it found matches and discarded
> them. Nothing errors. Nothing retries. The bot simply does not know you any
> more, for one turn, and then does again.
>
> This is worse than an outage for a memory product, because the symptom is
> indistinguishable from the model choosing not to use what it recalled — and
> you will spend a day tuning prompts before you think to log the raw response.
> The fix on my side is to log every recall's reported-versus-returned count,
> so the gap is visible in the data instead of inferred from vibes.
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
> English anyway. They are a third of the price and they are not worse at
> retrieval — they are worse at letting retrieval change their behaviour.
>
> If your eval only asks "did it quote the right fact", every model passes and
> you learn nothing. Put one item in there that has to change *how* the answer
> is written rather than *what* it says.
>
> ## 4. I published a security finding that was my own misconfiguration
>
> For a week I was certain the service was authorising a key that the chain did
> not list. I wrote it up carefully, with a repro. It was wrong.
>
> There are two separate deployments live on mainnet, not one upgraded twice. I
> had taken one id from the live config endpoint and another from the
> documentation, which put me on a real account that was not mine — so of
> course the key I was looking for was not on it.
>
> The report is still in the repo, marked RETRACTED at the top, with what
> actually happened underneath and the real bug filed next to it. Deleting it
> would have been tidier and would have taught nobody anything, including me.
> If you take one thing from this post, take the habit of asking "what would I
> have to be misconfigured about for this to be boring" before you write the
> word *vulnerability*.
>
> ## 5. "Your data is yours" is a claim with a testable part and an untested part
>
> The account is genuinely the user's: it is a public object, they own it, they
> can remove my key and I measured what happens when they do. The removed key
> kept working for at least 15 seconds and was refused by 32. Not instant, and
> I would rather say 32 seconds than have someone test "instantly" and find me
> wrong about the one claim the whole thing rests on.
>
> But I cannot yet hand a user their own plaintext. The hosted service seals
> blobs against a key server that the client library does not list, so I can
> give you the ciphertext from a public endpoint and not the bytes behind it.
> Ownership of the account, yes. Ownership of the content, not yet.
>
> I am shipping with that written on the page rather than shipping without it
> written anywhere.
>
> ## The point
>
> Most of what I learned building a memory layer had nothing to do with
> embeddings. It was latency deciding my architecture, a success response
> hiding a failure, an eval that was too easy to be informative, and me being
> confidently wrong in public. The retrieval part was the easy part. It usually
> is.
>
> Code and the raw measurements: [repo link]

## D. Viblo, or a Vietnamese developer Discord

Outside both ecosystems, and the audience most likely to actually open the link
and type something. Written in Vietnamese, leading with the demo rather than
the ownership argument, because the demo is the part that survives being
skimmed.

**Tiêu đề:**

```
Mình build con chatbot nhớ được bạn qua web, Telegram và terminal — và bộ nhớ đó là của bạn, không phải của bot
```

**Nội dung:**

> Hầu hết chatbot quên sạch mỗi lần bạn đóng tab. Số ít nhớ được thì bộ nhớ đó
> nằm trong database của họ, không phải của bạn.
>
> Hai tuần vừa rồi mình làm **hippo** cho Walrus Session 8. Nó nhớ bạn qua web
> chat, Telegram, Discord, Slack và cả CLI — cùng một bộ nhớ đằng sau tất cả.
> Bạn dạy nó một chuyện trên web, hỏi lại trên Telegram, nó vẫn biết.
>
> Thử trong 30 giây, không cần đăng ký, không cần ví: [link]
>
> 1. Gõ "mình tên Minh, mình code Go"
> 2. Reload trang cho mất sạch đoạn chat
> 3. Hỏi "mình code gì?"
>
> Phần khác biệt: bộ nhớ được mã hoá và nằm trong một account trên Walrus mà
> **bạn** sở hữu bằng ví của mình. Bot chỉ giữ một delegate key. Bạn gỡ key đó
> trên chain là nó hết đọc được — mình đo thật, mất khoảng 32 giây chứ không
> phải ngay lập tức, và script đo nằm trong repo.
>
> Vài thứ đo được mà mình không đoán trước:
>
> - **Ghi một memory mất ~24 giây.** Nên không thể `await` trong một lượt chat,
>   phải fire-and-forget rồi hiện trạng thái pending. Con số này quyết định
>   kiến trúc trước khi mình viết dòng code đầu tiên.
> - **Model rẻ nhớ tốt nhưng không đổi hành vi.** Mình chạy eval với 4 model,
>   mỗi model 2 lần. DeepSeek và Qwen đều recall đúng 4/4, nhưng đều bỏ qua
>   một memory dạng "user này thích trả lời bằng tiếng Việt" — kéo được nó vào
>   context rồi vẫn trả lời tiếng Anh. Nhắc lại một fact thì dễ; để một fact từ
>   ba hôm trước âm thầm đổi cách viết hôm nay mới là thứ mất đầu tiên khi
>   xuống model rẻ.
> - **Mình từng viết một báo cáo bảo mật sai.** Mất một tuần tin chắc là service
>   đang chấp nhận một key mà chain không hề ghi nhận. Hoá ra trên mainnet có
>   *hai* deployment khác nhau, mình lấy id chỗ này ghép với id chỗ kia nên đọc
>   nhầm sang một account không phải của mình. Báo cáo đó vẫn nằm trong repo,
>   đánh dấu RETRACTED, kèm chuyện thật ở dưới. Xoá đi thì gọn hơn nhưng chẳng
>   ai học được gì, kể cả mình.
>
> Code và toàn bộ số liệu đo được: [repo link]
>
> Ai thử xong thấy nó quên mất cái gì thì comment giúp mình, đang cần đúng loại
> bug đó.

---

## Rules for all of the above

Say the bugs plainly, in the same voice as the article. Every one is filed with
a repro, and reporting them properly is part of the session. Do not soften them
and do not dramatise them.

Two rules that are easy to break in a short post.

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

## Pre-flight, before any of these go out

1. **The repo has to be public.** Every draft links to it. A Show HN to a 404
   is one shot spent.
2. **The live app has to be up**, and the three-click demo has to work in a
   private window — that is the first thing anyone does after reading. Check it
   the hour you post, not the day before.
