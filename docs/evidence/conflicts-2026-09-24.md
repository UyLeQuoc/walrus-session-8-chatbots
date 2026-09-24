# When the user changes their mind

Measured 2026-09-24 against the mainnet relayer with `google/gemini-2.5-flash`.
Started as `docs/SCOPE-RESEARCH.md` §1, "nothing resolves a contradiction", and
turned out to be four separate failures, two of them worse than the one being
fixed.

## Before

`pnpm demo` got a sixth teaching line, *"Change of plan: we moved this project
from pnpm to bun this week, so use bun now."*, and every answer in the fresh
session was checked for the stale value. The first stricter run failed:

```
FAIL  asked directly: answered without bun; in context: pnpm memory yes, bun correction no
FAIL  2 of 5 answers stated pnpm without bun
      "Which package manager should I use here?" — the correction was never recalled
      "What do you know about me?" — the correction was never recalled
```

An earlier run had passed the direct question while answering *"Bạn chỉ sử
dụng pnpm"* ("you only use pnpm") to "what do you know about me?". The eval
only checked the direct question, so it passed. It now checks every answer.

## Four ways the correction was lost

**1. Dedupe discarded it.** `rememberWithDedupe` skips anything under cosine
distance 0.25, the "duplicate" band from `SKILL.md`. Distance cannot see
negation, and corrections name the value they replace
(`packages/memory/scripts/spike-corrections.ts`):

| correction | fact it replaces | distance |
|---|---|---|
| I moved to Neovim; I no longer use VS Code. | I use VS Code with vim bindings. | 0.243 |
| The billing export deadline moved to October 10, not October 3. | I promised to ship the billing export by October 3. | 0.221 |

Two of three corrections were thrown away and the model was told "already in
memory". After exempting corrections from cross-type dedupe: 11 of 11 memories
stored, 3 of 3 corrections kept.

**2. The model did not call `remember`.** In one full run the correction turn
made zero tool calls; the reply acknowledged the change in words only. Replayed
with a fake port (`pnpm measure:corrections`, nothing written to Walrus):

| prompt | old fact in recalled memory | stored as `correction` |
|---|---|---|
| original | yes | 12/12, one typed `profile` instead |
| + a "when memories disagree" rule (ours) | yes | 16/20 |
| + an explicit CHANGES rule (current) | yes | 12/12 |
| current, all three cases, 6 trials each | both | 42/42 |

The regression was ours: a rule about resolving conflicts when *answering* read
as permission to skip storing. It only appeared when the old fact was already in
recalled memory, which is the normal case in real use. A change typed `profile`
counts as a miss, because dedupe would still treat it as a repeat.

The fallback model, `qwen/qwen3.7-flash`: one run of 28 turns stored every
change as a correction; an earlier run exited with at least one miss that was
not captured.

**3. The correction was never recalled.** A topical query finds the fact about
the topic, not the correction to it. Asked "what do you know about me?", the
session-start profile pull returned "I only use pnpm" and not "we moved to
bun". Every correction's text starts with the literal tag `[correction]`, and
that tag used as a query ranked all three corrections first:

```
d=0.524  CORRECTION  The billing export deadline moved to October 10 …
d=0.566  CORRECTION  I moved to Neovim; I no longer use VS Code.
d=0.638  CORRECTION  The ledger service is in Rust now …
d=0.677              My team corrected the API naming last sprint …
d=0.719              Answer in English, short, with code first.
```

The gap (0.638 against 0.677, for a distractor that merely says "corrected") is
too thin to cut on, so the parsed type decides membership and distance only
picks candidates. The pull runs once per turn, only when something correctable
was recalled.

**4. The stale fact outranked the correction.** For the direct question the
pnpm memory sat at 0.51 and the bun correction at 0.75, so ordering by distance
put the stale fact first. Injected memories are now ordered by `created_at`,
newest first, and the system prompt says the newer of two conflicting memories
is current. The deployed relayer returns `created_at` to the microsecond, so
this works for a correction made seconds later; our own `[YYYY-MM-DD]` tag
could not.

## After

Three consecutive runs of `pnpm demo` on mainnet, all passing. From the first:

```
CONFLICT — pnpm was taught, then corrected to bun. Did the correction win?
  PASS  asked directly: answered bun; in context: pnpm memory yes, bun correction yes
  PASS  0 of 5 answers stated pnpm without bun
4/4 recalled correctly across sessions.
newest fact wins:     PASS
style adaptation:     PASS
cross-channel recall: PASS
```

and "what do you know about me?" now answers *"Bạn sử dụng bun làm trình quản
lý gói"*, "you use bun".

## What this does not do

It does not delete or hide the stale memory; nothing on Walrus can be
overwritten, and `issues/09` covers deletion. Both memories are recalled and the
model is told which one is current. A person with many corrections gets at most
six through the corrections pull, the ones nearest the tag rather than the ones
nearest the question. At hackathon scale that is every correction anyone has
made; it would need revisiting past that.

Three runs and 42 turns are small samples, and they are reported as such.
