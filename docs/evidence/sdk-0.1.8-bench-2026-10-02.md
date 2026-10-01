# SDK 0.1.8 against 0.1.7 on a healthy relayer — 2026-10-02

**Decision: keep 0.1.8 on `main` (`f0b15d4`), no revert.** The bar set on
2026-09-25 was an A/B/A bench on a healthy relayer that puts 0.1.8's median
within the spread of 0.1.7's, with no more drops. On the query shape hippo runs,
two of three 0.1.8 medians sit inside 0.1.7's two (1.47 s and 2.00 s) and the
third is 0.04 s above, against a 0.53 s swing between 0.1.7's own runs. No run
dropped or failed a recall.

## Conditions

- Relayer `https://relayer.memory.walrus.xyz/health`: `status: ok`,
  `write_ready: true`, `writes: ok`, build commit `f58104334b9da4b6f70a3f28191054b29e4dd860`.
  That is not `5b27683`, the build the 2026-09-25 bench and the issue re-verification ran on.
- `ROUNDS=10 bun run --filter @hippo/core bench:recall demo-mupvw636`, the
  namespace `bun run demo` had just written on Gemini (all PASS,
  `demo-2026-10-02-gemini-predeploy.txt`). Same operator key, run back to back,
  18:49–18:56Z.
- The SDK was swapped by pointing `packages/memory/node_modules/@mysten-incubation/memwal`
  at bun's cached 0.1.7 and back, so `package.json` and `bun.lock` did not move.
  Each run printed the version it loaded. The link points at 0.1.8 again.
- "New" is hippo's session-start path: the message, then one pull on the type
  tags. "Old" is the three natural-language pulls hippo stopped using on
  2026-09-24, kept as a second load shape.

## Results

| Order | SDK | New: median | New: slowest | Old: median | Old: slowest | Failed recalls | Drops |
|---|---|---|---|---|---|---|---|
| A | 0.1.8 | 1.94 s | 4.31 s | 3.27 s | 17.97 s | 0 / 60 | 0 |
| B | 0.1.7 | 1.47 s | 2.23 s | 2.87 s | 25.37 s | 0 / 60 | 0 |
| C | 0.1.8 | 1.63 s | 1.99 s | 3.81 s | 21.78 s | 0 / 60 | 0 |
| D | 0.1.7 | 2.00 s | 2.67 s | 3.43 s | 21.30 s | 0 / 60 | 0 |
| E | 0.1.8 | 2.04 s | 2.99 s | 3.75 s | 18.67 s | 0 / 60 | 0 |

Means of the medians, new shape: 0.1.8 1.87 s, 0.1.7 1.74 s.

## Reading it

- **Hippo's path: no slower within the relayer's drift.** 0.1.8's mean is 0.13 s
  above 0.1.7's; 0.1.7 moved 0.53 s between its own two runs.
- **The old shape leans the other way.** All three 0.1.8 medians are above both
  0.1.7 medians, by 0.46 s on the means. hippo does not issue that shape, so it
  does not decide this, but it is the one result that points at 0.1.8 being
  slower, and a reader who weighs it differently can revert with
  `git revert -m 1 f0b15d4`.
- **Drops and failures: none on either version**, unlike 2026-09-25 when the
  relayer was degraded.

Raw output:

```
== A sdk="version": "0.1.8" start=18:49:42Z
10 rounds, alternating, namespace hippo-guest:demo-mupvw636
  old, message + 3 pulls: median 3.27s, slowest 17.97s, 0/40 recalls failed
  new, message + 1 pull:  median 1.94s, slowest 4.31s, 0/20 recalls failed
== end=18:51:00Z
== B sdk="version": "0.1.7" start=18:51:00Z
10 rounds, alternating, namespace hippo-guest:demo-mupvw636
  old, message + 3 pulls: median 2.87s, slowest 25.37s, 0/40 recalls failed
  new, message + 1 pull:  median 1.47s, slowest 2.23s, 0/20 recalls failed
== end=18:52:12Z
== C sdk="version": "0.1.8" start=18:52:12Z
10 rounds, alternating, namespace hippo-guest:demo-mupvw636
  old, message + 3 pulls: median 3.81s, slowest 21.78s, 0/40 recalls failed
  new, message + 1 pull:  median 1.63s, slowest 1.99s, 0/20 recalls failed
== end=18:53:25Z
== D sdk="version": "0.1.7" start=18:53:45Z
10 rounds, alternating, namespace hippo-guest:demo-mupvw636
  old, message + 3 pulls: median 3.43s, slowest 21.30s, 0/40 recalls failed
  new, message + 1 pull:  median 2.00s, slowest 2.67s, 0/20 recalls failed
== end=18:55:00Z
== E sdk="version": "0.1.8" start=18:55:00Z
10 rounds, alternating, namespace hippo-guest:demo-mupvw636
  old, message + 3 pulls: median 3.75s, slowest 18.67s, 0/40 recalls failed
  new, message + 1 pull:  median 2.04s, slowest 2.99s, 0/20 recalls failed
== end=18:56:12Z
```
