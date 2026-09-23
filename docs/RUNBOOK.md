# Runbook for the real-use week (M6)

Everything here is ready to execute the day a Telegram token arrives. Written now
so the baseline day is not spent improvising, because the baseline is the half of
the before/after that cannot be recreated later.

## Raise the model budget first

**The OpenRouter key is capped at $1, not metered, so it stops dead rather than
costing more.** Measured 2026-09-23 with `pnpm capacity` against production:

| | |
|---|---|
| spent so far | $0.0393 |
| limit | $1.0000 |
| remaining | $0.9607 |
| cost per turn, upper bound | $0.0026 |
| turns left at that rate | about 366 |

| week | turns | cost | |
|---|---|---|---|
| 3 people x 10/day x 7 days | 210 | $0.55 | fits |
| 5 people x 15/day x 7 days | 525 | $1.38 | **does not fit** |
| 8 people x 20/day x 7 days | 1,120 | $2.94 | **does not fit** |

So the session minimum just fits and the target week does not. The per-turn
figure is an upper bound, because `pnpm demo` and the spikes spend credit
without writing a `turn_log` row, so the true cost is lower. Planning against
the pessimistic number is the point.

`[HUMAN]` Raise the key's limit to at least $5 at openrouter.ai before inviting
anyone. Running out mid-week does not announce itself: hippo will say it has run
out of model credit and that waiting will not help, which is honest and still
the end of M6.

Re-run `pnpm capacity` on the daily checklist. Neon and the relayer are not the
risk: the database is 8 MB against a 500 MB free tier and stores no memory text,
and the relayer's 60 writes a minute is far above anything five people can
produce by typing.

## Before inviting anyone

- [ ] `pnpm capacity` shows the target week fits. If not, raise the key limit.
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

- [ ] `pnpm evidence > docs/evidence/day-N.txt` and commit. A daily series is
      worth more than one final number, and it shows growth in the article.
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
