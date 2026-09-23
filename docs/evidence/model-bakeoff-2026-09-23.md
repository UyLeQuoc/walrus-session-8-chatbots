# Is a cheaper model worth it?

Measured 2026-09-23 with `scripts/model-bakeoff.sh`, which runs `pnpm demo`
against a model and reads the OpenRouter key's spend before and after. Cost is
therefore what the model actually did, including retries, not a figure derived
from a price table.

`pnpm demo` is nine model turns: five teaching, four questions, plus a style
check and a cross-channel check.

## Results

| model | run 1 | run 2 | cost per run | 525 turns |
|---|---|---|---|---|
| `google/gemini-2.5-flash` | pass, 4/4, style kept | 3/4 recall, style kept | $0.0033–0.0037 | $0.19–0.22 |
| `qwen/qwen3.7-flash` | pass, 4/4, style kept | 4/4, **style lost** | $0.0009–0.0010 | $0.05–0.06 |
| `deepseek/deepseek-v4-flash` | 4/4, **style lost** | **style lost** | $0.0009–0.0019 | $0.05–0.11 |
| `qwen/qwen3-235b-a22b-2507` | crashed | — | — | — |

List prices per million tokens, for reference: gemini-2.5-flash $0.30 in and
**$2.50 out**; deepseek-v4-flash $0.089 and $0.177; qwen3.7-flash $0.030 and
$0.130. Output is where the difference lives.

## What the failures were

They are not the same kind of failure, and that is the whole finding.

**gemini** lost one recall in run 2 and kept style in both. A missed recall is
the relayer dropping matches, which is `docs/issues/01` and happens to every
model.

**qwen3.7-flash** recalled 4/4 in both runs and lost style adaptation in one. It
answered in English when a `style` memory said to answer in Vietnamese.

**deepseek-v4-flash** recalled 4/4 and lost style in both runs. Consistent, not
unlucky.

Style adaptation is the behaviour the article calls its favourite: nobody asked
for Vietnamese in that session, a memory from a previous one changed how the bot
writes. It is the clearest evidence that memory changes behaviour rather than
being quoted back, and it is the thing the cheap models drop first.

`qwen/qwen3-235b-a22b-2507` returned no output at all
(`AI_NoOutputGeneratedError`) and cost two hundredths of a cent to find out.

## Decision: keep `google/gemini-2.5-flash`

Not because the cheaper models are bad at memory. They recalled fine. They are
worse at the one thing that makes the demo interesting, and the saving is
$0.16 over a week against a balance of $0.96.

**The premise was wrong anyway.** `docs/RUNBOOK.md` said a week of five people
would cost $1.38 and would not fit. That came from dividing all spend to date by
the production `turn_log` rows alone, while most of that spend was demo runs and
spikes that write no turn row. The measured figure is about $0.0004 a turn, so a
heavy week is around $0.22. There is roughly five times the headroom I claimed
there was.

Two runs each is a small sample and is deliberately reported as such. It is also
twice what was nearly enough to put a wrong conclusion in the article once
before, in `docs/SPIKES.md` §H.

## The fallback model was never wired

Found while measuring. `createModel` built a `fallback` from
`LLM_FALLBACK_MODEL` and **nothing in the codebase ever read it**, production
never set it at all, and the value set locally,
`qwen/qwen3-235b-a22b`, is a model that returns no output. So
`docs/submission.md`'s claim that a fallback was configured was true of the
config file and false of the behaviour, three times over.

Now wired for the non-streaming channels, which is where the real-use week
happens. Proved by pointing the primary at a model that does not exist:

```
$ LLM_MODEL=does-not/exist LLM_FALLBACK_MODEL=qwen/qwen3.7-flash pnpm demo
[model] primary failed, trying the fallback NoOutputGeneratedError
  PASS  Which package manager should I use here?
  PASS  Which ORM did we settle on?
  PASS  What port is the database on?
```

The web chat deliberately does not fall back: it streams, and by the time a
stream fails its first bytes may already be on the page, so it reports the
failure instead.
