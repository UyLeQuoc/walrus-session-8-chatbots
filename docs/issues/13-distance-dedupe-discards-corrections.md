# Deduplicating by distance, as SKILL.md suggests, silently discards corrections

> **Re-verified 2026-09-25** against MemWal `main` (`3182c16`). **Still
> applies.** `SKILL.md` still gives `< 0.25` as the duplicate band and still
> advises deduplicating before `remember()`. The same week MemWal raised its
> `maxDistance` guidance to 0.8 (`3a2b6bd`), matching what we measured, but the
> duplicate band and dedupe advice are unchanged.

## Summary

`SKILL.md` says `remember()` is append-only, "if you need uniqueness, dedupe
before calling `remember()`", and gives `< 0.25` as the "duplicate or very close"
distance band. Follow both and you lose corrections: an embedding cannot see
negation, and a correction usually names the value it replaces, so it lands
inside the duplicate band of the very fact it corrects.

This is a docs improvement rather than a relayer bug, but it cost us the one
behaviour a memory product most needs to get right: the user says something
changed, the agent is told "already known", and nothing changes.

## Repro

`packages/memory/scripts/spike-corrections.ts` in
https://github.com/UyLeQuoc/walrus-session-8-chatbots writes eleven memories,
three of them corrections, deduplicating at `0.25` as the docs suggest. Measured
on the mainnet relayer, 2026-09-24:

| new memory | nearest existing memory | distance |
|---|---|---|
| I moved to Neovim; I no longer use VS Code. | I use VS Code with vim bindings. | **0.243** |
| The billing export deadline moved to October 10, not October 3. | I promised to ship the billing export by October 3. | **0.221** |
| The ledger service is in Rust now. The Go version was retired in August, … | (nothing under 0.25) | — |

Two of the three corrections were discarded as duplicates. Only the long one,
where the old value is a small share of the text, survived.

## Expected

A line in the distance table, or next to the dedupe advice, saying that distance
does not distinguish "X" from "no longer X", and that a correction should not be
deduplicated against the fact it replaces.

## What already helps, and deserves to be easier to find

`RecallMemory.created_at` (RFC3339 write time) and `recall({ sort: "recent" })`
exist precisely for newest-wins (WALM-383), and the deployed mainnet relayer
returns `created_at` to the microsecond. We only found them in the type
definitions. `SKILL.md`'s recall section is where someone deciding how to handle
"the user changed their mind" will look, and neither is mentioned there.

## Our workaround

- An incoming correction is only deduplicated against earlier corrections
  (`packages/memory/src/policy.ts`, `rememberWithDedupe`).
- Recalled memories are ordered by `created_at`, newest first, and the system
  prompt says the newer of two conflicting memories is current.
- Because a topical recall often returns the stale fact without its correction,
  a second recall fetches the person's corrections whenever something
  correctable came back.

With all three, `bun run demo` teaches a fact, corrects it, and checks that no
answer in a fresh session states the old value. It passed three runs in a row
on mainnet; before, the correction was either never stored or never recalled.

## Environment

```
SDK:      @mysten-incubation/memwal 0.1.7
Relayer:  https://relayer.memory.walrus.xyz (mainnet)
Runtime:  Node 20+, TypeScript 5.9, macOS
Model:    google/gemini-2.5-flash via OpenRouter
Date:     2026-09-24
```
