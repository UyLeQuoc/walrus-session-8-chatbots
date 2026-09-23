# Runbook for the real-use week (M6)

Everything here is ready to execute the day a Telegram token arrives. Written now
so the baseline day is not spent improvising, because the baseline is the half of
the before/after that cannot be recreated later.

## The model budget fits, and here is the number

**The OpenRouter key is capped at $1 rather than metered, so it stops dead
rather than costing more.** That is worth knowing, and it is not a problem.

Measured 2026-09-23 with `scripts/model-bakeoff.sh`, which runs `pnpm demo` and
reads the key's spend before and after:

| | |
|---|---|
| spent so far | $0.0393 |
| remaining | $0.9607 |
| cost per turn, measured | $0.0004 |

| week | turns | cost | |
|---|---|---|---|
| 3 people x 10/day x 7 days | 210 | $0.09 | fits |
| 5 people x 15/day x 7 days | 525 | $0.22 | fits |
| 8 people x 20/day x 7 days | 1,120 | $0.46 | fits |

An earlier version of this page said the five-person week cost $1.38 and did not
fit, and told you to raise the limit before inviting anyone. That was wrong by
about seven times. It divided every dollar ever spent by the production
`turn_log` rows alone, while most of those dollars went on demo runs and mainnet
spikes that write no turn row. Corrected, there is roughly five times the
headroom, and no action is needed before the week starts.

Switching to a cheaper model was measured rather than assumed and is not worth
it: `deepseek/deepseek-v4-flash` and `qwen/qwen3.7-flash` cost a third as much,
recall just as well, and drop the style adaptation that makes the demo
interesting. Table in `docs/evidence/model-bakeoff-2026-09-23.md`.

`pnpm capacity` re-checks the balance against the same arithmetic. Neon and the
relayer are not the risk: the database is 8 MB against a 500 MB free tier and
stores no memory text, and the relayer's 60 writes a minute is far above
anything five people can produce by typing.

## Before inviting anyone

- [ ] `pnpm capacity` shows the target week fits. It should; if it does not, raise the key's limit at openrouter.ai.
- [ ] `pnpm evidence` prints `NOT YET MET`, so the starting point is on record.
- [ ] `pnpm demo` passes, so the bot is known good on the day.
- [ ] `pnpm diagnose` is clean. It catches a wrong account id, a stale package id, and a delegate the chain does not list.
- [ ] Deployed, not local. Telegram polls from wherever the process runs, so a laptop works for a day and not for a week.
- [ ] `mkdir -p docs/evidence/baseline`.
- [ ] Decide who: 3 minimum, 5 target, developers preferred so the Claude Code
      demo has an audience who cares.

## The invite

Send this, adapted. It asks for the baseline day explicitly, because a user who
starts with memory on gives us no before.

> Mình đang làm một con bot cho hackathon Walrus. Nó nhớ bạn giữa các lần nói
> chuyện, và điểm khác biệt là bộ nhớ đó thuộc về bạn, không thuộc về bot.
>
> Giúp mình hai việc nhé:
>
> **Ngày đầu**: gõ `/memory off` rồi nói chuyện bình thường. Cứ kể về stack bạn
> đang dùng, bạn thích gì, đang mắc ở đâu. Nó sẽ quên hết. Đó là chủ ý.
>
> **Từ ngày thứ hai**: gõ `/memory on` rồi dùng như thường trong khoảng một
> tuần. Khi nào nó nhớ đúng thứ bạn cần mà bạn không phải nhắc lại, chụp cho
> mình cái đó.
>
> `/help` có đủ lệnh. `/memory` cho bạn xem nó nhớ gì về bạn, `/memory forget`
> xoá sạch, `/connect` chuyển bộ nhớ sang ví của bạn để bạn toàn quyền thu hồi.
>
> Mình sẽ viết bài về kết quả và có thể dùng ảnh chụp hội thoại. Bạn muốn ẩn tên
> hay ẩn phần nào thì nói, mình bỏ. Bạn cũng có thể bảo mình xoá hết bất cứ lúc
> nào.

English version for anyone who prefers it: same structure, same two asks, same
consent line.

## Consent, stated once and honoured

- Ask before using a transcript. Redact names and handles in
  `docs/evidence/baseline/` and anywhere a screenshot appears.
- Do not put anyone's personal details in the article, only the shape of the
  interaction.
- If someone asks to be removed, `/memory forget` their namespace and delete
  their evidence files. Say plainly that the encrypted blobs stay on Walrus until
  their epochs expire, because that is true and they should know it
  (`docs/issues/09`).

## Daily, about ten minutes

- [ ] `pnpm evidence:daily` and commit the file it writes. A daily series is
      worth more than one final number, and it shows growth in the article.
      Use this rather than `pnpm evidence`, which reads the local database and
      would quietly record your own test chatter as the result. It snapshots
      capacity in the same file, so a budget running low is visible the day it
      starts rather than the day it ends.
- [ ] Skim the server log for `[memory] recall … dropped` and `write failed`.
      Every new failure shape becomes a `docs/issues/` draft the same day.
- [ ] Collect any "it remembered" moment while it is fresh. Ask users to forward
      screenshots rather than hunting for them at the end.
- [ ] Watch for a user with 10 or more stored memories; `pnpm evidence` marks the
      requirement met at three such users.

## What has to exist by the end

The submission checklist in `docs/PLAN.md` is the authority. The parts only this
week can produce:

- 3+ people with 10+ stored memories each, in `docs/evidence/final.md`.
- Baseline transcripts next to memory-on transcripts for the same people.
- At least one user in owned mode with their own MemWalAccount, plus the recorded
  revoke sequence.
- The Claude Code recall screenshot, which needs a Slush-wallet user rather than
  a Google one (see the zkLogin caveat in `docs/ARCHITECTURE.md` §1).

## When something looks broken

One URL answers "is it us or them?":

```
https://hippo-server-production.up.railway.app/api/health/deep
```

`status: "ok"` with both checks passing means hippo, the database and the Walrus
Memory relayer are all reachable, and the problem is elsewhere. `status:
"degraded"` names which dependency is failing and why, and `startedAt` tells you
whether a deploy actually took.

## If a user hits trouble

| Symptom | Cause and answer |
|---|---|
| "It forgot something I told it" | Most likely the dropped-recall bug (`docs/issues/01`). Ask them to ask again; the retry usually wins. Log it, this is article material. |
| "It said it saved but /memory doesn't show it" | The write takes about 25 s and lands in the background. If it never appears, look for a failed job in `memory_index`. |
| "/connect didn't work" | Check `docs/BLOCKERS.md` first: the flow has never run against a real wallet. Expect to debug it live the first time. |
| Bot silent | Check `/api/health/deep` first, then Railway logs. The adapters share one process, so one crash takes every channel down. |
| "It answers but forgets everything" | This was a real production bug: a `SameSite=Lax` cookie is not sent cross-site, so every message arrived as a new person. Fixed by proxying the API same-origin. If it returns, check that the page is calling `/api/*` on its own origin rather than the Railway domain. |
