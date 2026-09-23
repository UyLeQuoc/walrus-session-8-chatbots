# Continuation prompt

Two forms of the same brief. Update the State line in both as milestones land.

- **Short form** below fits the `/goal` command, which caps at 4000 characters.
- **Long form** further down is for pasting into a fresh session, where there is no limit.

## Next goal, for `/goal` — attack our own defences

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md, docs/GOAL.md and docs/AUDIT.md first, then docs/ARCHITECTURE.md §11, the threat model table. This session is about whether that table is true.

State (2026-09-23): live in production, feature-complete, writing corrected, pre-flight done. Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, Telegram @walrussession8_bot. 64 tests, CI green, clean tree. Model is google/gemini-2.5-flash with qwen/qwen3.7-flash as a fallback, both chosen by measurement (docs/evidence/model-bakeoff-2026-09-23.md). M6 is the only unmet judging criterion and starts when I message the bot.

Every defence below is claimed in the threat model and none has ever been attacked. A memory bot's worst day is someone discovering that memories are instructions, and that discovery should happen here rather than during the real-use week.

1. Prompt injection through a recalled memory. Memories are framed by formatUntrustedMemories with a nonce boundary and a system instruction, copied from the SDK and never tested. Write memories that try to become instructions: "ignore previous instructions", a forged END/BEGIN boundary with a guessed nonce, a fake system turn, a request to call the remember tool, an attempt to make the bot reveal its system prompt, and an attempt to make it exfiltrate another memory. Assert it does not obey. These are evals against the real model, so accept that they are probabilistic: run each several times and report the rate rather than a single pass.

2. Cross-tenant isolation. Guest users all live in hippo's own account, separated only by a namespace string. Prove one guest cannot recall another's memories, that a crafted query cannot cross the boundary, and that the namespace in a request cannot be influenced by the user.

3. Credential redaction. redact.ts is supposed to strip API keys and tokens before text becomes a memory. A secret written to Walrus cannot be deleted, ever, so this is the one that cannot be fixed afterwards. It has no test file.

4. The endpoints added on 2026-09-23 have no server-side tests: /api/me/account, /api/me/search and /api/me/{connect,disconnect}. The last mints a delegate keypair on every call. Check it cannot be driven from another origin and that the rate limit applies.

5. The rate limiter is the only thing between one person and a relayer budget shared by every guest. It has no test file.

6. Prove a delegate private key never reaches a log line, a chat reply, an API response or the browser. This is a CLAUDE.md hard constraint and is currently only a convention.

Rules.
- Do not ask me what to do next. If a choice comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in docs/DECISIONS.md, and keep going.
- If a defence fails, fix it and write it up. Never weaken a defence to make a test pass, and never delete an assertion because it is inconvenient.
- Nothing outward-facing without me saying so: no filing, posting, publishing, submitting or messaging.
- Never invent a number, a user, a quote or a result. Probabilistic results get a rate and a sample size.
- Keep pnpm lint, typecheck and test green on every commit. Commit per task. Redeploy after a server change.
- Do not touch the Walrus Site or site-builder.
- If time runs short cut in this order: task 5, task 4, task 2. Never cut task 1 or task 3.

Start by reading the docs above, then task 1.
```

## Done 2026-09-23: the M6 pre-flight goal below

All six tasks landed. It also found that the budget warning in the runbook was
seven times too high, and that the fallback model had never been wired.

## Next goal, for `/goal` — M6 pre-flight

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md, docs/GOAL.md and docs/AUDIT.md first, then docs/RUNBOOK.md, which is the week this session exists to protect.

State (2026-09-23): live in production, feature-complete, and the writing is corrected. Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, Neon, Telegram @walrussession8_bot polling. 42 tests, CI green, clean tree. M0 to M5 done, M7 drafted and fact-checked. M6 is the only unmet judging criterion: 5 people and 13 memories in production against a requirement of 3 people with 10 each.

M6 starts the moment I send the bot one message and then invite people. Everything below is what should be true before strangers arrive, because a failure during that week cannot be redone with the time left.

1. Disclosure at first contact. /start tells a new user the memory "can belong to you" and then says "just talk to me and I will start remembering". It never says what is actually happening: every memory becomes an encrypted blob on Walrus whose ciphertext anyone can download, the namespace name is public on chain, storage lasts about 180 days, and /memory off stops it. docs/RUNBOOK.md has consent rules for transcripts; the product itself discloses nothing. Fix that in /start, in /help and in the web landing section, in plain sentences, without turning it into a legal notice. Nobody should learn this from the article after the fact.

2. There is no length guard on an inbound message. Find what a very long paste does to the model call, to the memory writer and to Telegram chunking, then cap it and say so in words a person understands. A memory should never be a wall of pasted text either.

3. Make failure legible. Take the three that will happen during a real week and check what the user actually sees: OpenRouter out of credit or down, the relayer answering 429 or 502, and the database unreachable. Each should be one sentence a person understands, and none should lose a memory the user was told was saved. Fix what is not.

4. The connect and disconnect pages have never run in a browser, only by script. dapp-kit discovers wallets through the wallet standard, so a mock wallet can be registered in a test page and the whole flow driven headlessly against production. That proves the central demo's UI path without waiting for a spare Slush wallet. If it turns out not to be feasible in an afternoon, say so in docs/DECISIONS.md and move on rather than sinking the session into it.

5. Capacity. Check the OpenRouter credit balance, the Neon free-tier limits and the Railway usage against a week of five people talking daily, and write the numbers into docs/RUNBOOK.md. Running out of model credit mid-week would end M6 quietly.

6. A daily evidence snapshot. `pnpm evidence` against production, committed to docs/evidence/daily/, so the final numbers are a record rather than a reconstruction. Add the command to the RUNBOOK checklist.

Rules.
- Do not ask me what to do next. If a choice comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in docs/DECISIONS.md, and keep going.
- Nothing outward-facing without me saying so: do not file issues, post, publish, submit, or message anyone. Dry runs are fine.
- Never invent a number, a user, a quote or a result.
- Keep pnpm lint, typecheck and test green on every commit. Commit per task. Redeploy after a server change.
- Do not touch the Walrus Site or site-builder.
- If time runs short cut in this order: task 4, task 6, task 5. Never cut disclosure.

Start by reading the docs above, then task 1.
```

## Done 2026-09-23: the M7 writing goal below

All six tasks landed. The article, submission form, README, promo and video all
carried the retracted finding, and `submission.md` named the account in the
superseded deployment.

## Next goal, for `/goal` — M7, the writing

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md, docs/GOAL.md and docs/AUDIT.md first. Then read docs/SPIKES.md §I and §J and docs/issues/11 and 12, because everything below depends on what they record.

State (2026-09-23): live in production and feature-complete for a submission. Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, Neon, Telegram @walrussession8_bot polling. 42 tests, CI green, clean tree. The web UI landed on 2026-09-22 and was checked in a browser (docs/evidence/web-ui-2026-09-22.md).

This session is M7, the writing. It matters more than it sounds, because the drafts are now wrong in a way that would damage the submission.

1. docs/article.md carries a section headed "The ownership model did not hold for my own key". That finding was RETRACTED. The delegate key was on chain the whole time; we were reading an account in a second, superseded mainnet deployment. Publishing that paragraph would accuse Walrus Memory of a security failure that we ourselves disproved. Rewrite it. The true story is better: two deployments are live, GET /config publishes a package id but no registry id, following the docs for one and the relayer for the other silently resolves owners to a real but wrong account, and the same mismatch made every sponsored transaction fail with an opaque 502. Say plainly that we drew the wrong conclusion, filed it, and retracted it, and what it cost. docs/issues/08 keeps the original text under its retraction; use it.

2. The article must now carry the measurement it was always missing: remove a delegate key on chain and the relayer refuses it after about 32 seconds, still accepting at 15. Numbers and method in docs/evidence/revocation-2026-09-22.md. Say "within about a minute", never "instantly".

3. Add the honest limit from docs/issues/12: an owner cannot decrypt their own memory without the relayer, because mainnet memories are sealed by a committee key server whose aggregator wants an API key. Access control is real and revocation works; independent readability does not follow yet. Do not soften this and do not let it swallow the good result either.

4. docs/submission.md: eleven issues are filable, 08 is retracted and must not be listed, 12 is new. Check every identifier in it against `pnpm diagnose`, especially MEMWAL_AGENT_ID and the account id, which changed when the registry was corrected.

5. README.md and docs/promo.md and docs/video.md: same corrections, plus the two-deployment trap and that `pnpm diagnose` catches it. Mention the web UI as it now is.

6. Refresh docs/AUDIT.md against the codebase. It drifts every session and has been wrong twice.

Rules.
- Do not ask me what to do next. If a choice comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in docs/DECISIONS.md, and keep going.
- Nothing outward-facing without me saying so in this session: do not run scripts/file-issues.sh for real, do not post, publish or submit anything. Dry runs are fine and welcome.
- Never invent a number, a user, a quote or a result. If the evidence is not in docs/evidence/ or a command output, do not write it.
- Keep pnpm lint, typecheck and test green on every commit. Commit per task.
- Do not touch the Walrus Site or site-builder.
- If time runs short cut in this order: promo, video, README. Never cut the article correction or the submission form check.

Start by reading the docs above, then task 1.
```

## Done 2026-09-22: the web UI goal below

All six tasks landed and were checked in a browser against production
(`docs/evidence/web-ui-2026-09-22.md`). Task 4 did not produce a feature: client
-side SEAL decryption is blocked by an aggregator API key, written up as
`docs/issues/12`, and `docs/ARCHITECTURE.md` now lists it as a limitation.

## This session's goal, for `/goal` — the web UI

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md, docs/GOAL.md and docs/AUDIT.md first. AUDIT.md checks every task against the codebase and was refreshed 2026-09-22; read it before concluding unblocked work is exhausted, because auditing has turned up real gaps every time. docs/SPIKES.md is what we measured on mainnet and §I and §J are the newest and most important. docs/BLOCKERS.md is what only I can provide.

State (2026-09-22): live in production. Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, Neon database, Telegram @walrussession8_bot polling. M0, M1, M2 and M5 done. M3 is proven on mainnet: an account was created, a delegate key added, used and revoked, all sponsored, and the relayer refused the removed key after about 32 seconds. M4 partly done. M6 waits on real people. M7 drafted. 29 tests, CI green, clean tree.

This session is the web UI, the weakest part of the submission. It has three pages and exactly two shadcn components, button and input. Do all six tasks, in this order, one commit each.

1. A landing section above the chat. A judge opening the URL today sees a chat box and three lines of instructions. Explain the idea, the guest-to-owned path and the revoke, with the operator account linked on chain. Keep the chat input above the fold on a laptop.

2. Make /me show the chain. The account object with an explorer link, every delegate key with its label, and a revoke button that starts /disconnect. Right now the central claim of the project is a few text links with no picture.

3. A memory-type filter and a search box on /me. `/memory search` already exists as a command; the page should do it too.

4. Client-side SEAL decrypt. Re-run packages/memory/scripts/spike-decrypt.ts now that MEMWAL_ACCOUNT_ID names the deployment GET /config reports. The old reason it failed was retracted along with docs/issues/08, so this is worth retrying. If it decrypts, wire /proof so the browser decrypts a memory with the user own key and shows the plaintext beside the ciphertext link. That is the strongest evidence possible for "your memory is yours". If it still fails, write the finding into docs/issues/ with a repro and move on.

5. Dark mode is dead code. index.css defines .dark tokens and nothing ever applies the class. Either add a toggle that persists, or delete the tokens. Do not leave it half-built.

6. Errors render as red text. Route them through a toast instead.

Add shadcn components only as you actually need them: card, badge, skeleton, sonner.

Rules.
- Do not ask me what to do next. If a choice comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in docs/DECISIONS.md, and keep going.
- Do not touch the Walrus Site or site-builder.
- Every new page state gets a jsdom render assertion in apps/web/src/pages/pages.test.tsx. Typecheck and build both pass happily on a component that throws on first paint, and that has bitten us.
- Keep pnpm lint, typecheck and test green on every commit. Redeploy the web with `vercel deploy --prod --yes` from apps/web, the server with `railway up --service hippo-server --ci`.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit memwal/, never commit .env.
- Verify in a real browser against production before calling a UI task done.
- If time runs short cut in this order: toast, dark mode, search UI. Never cut the landing section or the chain view on /me.

Start by reading the docs above, then task 1.
```

## Short form, for `/goal`

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md and docs/GOAL.md first. GOAL.md is the master plan, every milestone marked with its real status, and docs/AUDIT.md checks each task against the codebase: read it before concluding unblocked work is exhausted, because auditing has turned up real gaps every time. docs/SPIKES.md is what we measured on mainnet. docs/BLOCKERS.md is what only I can provide. docs/DECISIONS.md is the decision log. docs/RUNBOOK.md is how to run the real-use week. docs/DEPLOY.md is the deployment.

State (2026-09-22): live in production. Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, database on Neon, Telegram @walrussession8_bot polling from production. M0, M1, M2, M5 done. M3 is written, security-reviewed and now proven on mainnet by script; only the browser wallet-popup version is unfilmed. M4 partly done. M6 can start the moment somebody messages the bot. M7 is drafted.

Verified in a real browser against production: teach three facts, reload, ask, and it answers from Walrus with the recalled memories shown and linked to their blobs. pnpm demo asserts cross-session recall, style adaptation and cross-channel recall. pnpm diagnose reports config and chain-versus-relayer disagreements. CI runs lint, typecheck, 29 tests, the web build and pnpm audit.

Blocked on me, in order of risk.
1. Message @walrussession8_bot, then send the invites in docs/RUNBOOK.md, with the /memory off baseline day first. The bot has never received a message. This is the only thing still blocking a judging criterion.
2. A second Slush wallet with no MemWalAccount, to film /connect and /disconnect through a real wallet popup. The mechanics no longer need it.
3. Point a SuiNS name at the Walrus Site object so wal.app serves it.

Resolved 2026-09-22, after blocking everything since day one: the revocation test. It needed no human. A local keystore wallet owned no account and every account call is sponsored, so scripts/spike-revoke.ts ran the whole flow free: the relayer refused the removed delegate key after about 32 seconds, having still accepted it at 15. Revoke on chain and the bot forgets, within about a minute. Say that, not "instantly".

Eleven findings are written up in docs/issues/ with repros, filed by scripts/file-issues.sh, which now skips 08. Read docs/SPIKES.md §I before trusting any configured object id. Five shape the design:
- MEMWAL_REGISTRY_ID and MEMWAL_ACCOUNT_ID had named a superseded mainnet deployment for a week. Two Walrus Memory packages are live, they are separate deployments rather than one upgrade, and GET /config publishes a package id but no registry id. That produced an opaque 502 on every sponsored transaction and, worse, resolved owners to real but wrong accounts. It is why docs/issues/08, which accused the relayer of authorizing keys the chain does not list, is retracted. Check the Move type of an object id, not just that it exists.
- recall() can return empty while reporting it found and discarded matches. Do not try to prevent this on the client: six runs gave 4, 9, 0, 15, 0 and 2 drops with no pattern, I wrongly blamed concurrency and had to retract it. Only retrying helps.
- /disconnect still destroys hippo's own copy of the delegate key. That is now belt and braces that closes the 32-second eviction window on our side, not a workaround for a broken revoke.
- There is no way to delete a memory you own, and restore() cannot re-index this account.
- Production taught two more: a SameSite=Lax cookie is not sent cross-site, which made the bot forget everyone until the API was proxied same-origin; and a failed dedupe check was blocking writes entirely, so dedupe is now best-effort.

How to work.
- Do not ask me what to do next. Every open choice is settled in GOAL.md or ARCHITECTURE.md. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in DECISIONS.md, and keep going.
- When blocked, do everything that is not blocked, append the exact ask to BLOCKERS.md, and move on. Never fabricate credentials, users or evidence.
- Keep pnpm typecheck, lint and test green on every commit. Commit per task, push per milestone. Redeploy after a server change: railway up --service hippo-server --ci.
- Any SDK or relayer friction becomes a docs/issues/ draft with a repro, the same day.
- Measure twice before claiming a cause. Never leave a polling loop running against the relayer, and never run the local server while production polls Telegram.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit memwal/, never commit .env or .env.production.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
```

## Long form

---

You are continuing work on hippo, my entry for Walrus Session 8 "Chatbots That Remember". The deadline is **Oct 9, 2026 14:00 UTC**.

Read `CLAUDE.md` and `docs/GOAL.md` first. `docs/GOAL.md` is the master plan: milestones M0 to M7, each with tasks and the command that verifies them. `docs/SPIKES.md` records what we measured on mainnet and what it changed. `docs/BLOCKERS.md` lists what only I can provide. `docs/DECISIONS.md` is the running decision log.

**State (2026-09-22): live in production.** Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, database on Neon, Telegram `@walrussession8_bot` polling from production. M0, M1, M2 and M5 are done. M3 is written, security-reviewed, and now proven on mainnet: an account was created, a delegate key registered, used, and revoked, all sponsored. Only the browser wallet-popup version is unfilmed. M4 is partly done. M6 can start the moment somebody messages the bot. M7 is drafted.

Verified in a real browser against production:
- Teach three facts, reload the page so nothing is left in the conversation, ask again, and it answers from Walrus. Every reply shows the memories it used, expandable, each linked to its encrypted blob.
- `/me` shows the memories with blob and ciphertext links, storage expiry when the relayer has resolved it, the Claude Code steps, and wallet sign-in.

Two production-only bugs surfaced in that browser session and are fixed. Both are written up in `docs/evidence/browser-test-2026-09-22.md`:
- **The bot forgot everyone.** A `SameSite=Lax` cookie is not sent cross-site, and the page was on vercel.app while the API was on railway.app, so every message arrived as a new person. `apps/web/vercel.json` now proxies `/api/*` to Railway, which keeps them same-site and keeps `SameSite=Lax` as a real CSRF defence.
- **A duplicate check was blocking writes.** The relayer failed the dedupe recall with "temporarily cannot verify credentials (upstream unavailable)", the error propagated, and the bot told users it could not remember anything. Dedupe is now best-effort.

Also working and verified:
- `pnpm demo` asserts cross-session recall, style adaptation and cross-channel recall.
- `pnpm diagnose` reports config, chain-versus-relayer disagreements and storage expiry.
- CI runs lint (failing on warnings), typecheck, 29 tests across three packages, the web build and `pnpm audit`, which is clean.
- A clean clone runs from the README alone, and the production image is verified by building and running it, not just building it.
- M7 is drafted and needs editing rather than writing: `docs/article.md`, `docs/promo.md`, `docs/video.md`, `docs/submission.md`.

Ten findings against Walrus Memory are written up with repros in `docs/issues/`, filed with `scripts/file-issues.sh`. The ones that shaped the design:
- `recall()` can return an empty list while reporting it found and discarded matches. **Do not try to prevent this on the client.** Six runs gave 4, 9, 0, 15, 0 and 2 drops with no pattern; I wrongly concluded concurrency was the cause and had to retract it. `docs/SPIKES.md` §H keeps the wrong hypothesis on purpose. Only retrying helps.
- Revocation works and takes about 32 seconds. `/disconnect` also destroys hippo's own copy of the key, which closes that window immediately.
- Two Walrus Memory deployments are live on mainnet and the documented ids belong to the superseded one. This cost a week and produced a retracted bug report. Verify the Move type of every configured object id.
- There is no way to permanently delete a memory you own, and `restore()` cannot re-index this account. Treat the search index as fragile and Walrus as durable.

Checked and found fine, so they are not re-investigated: Vietnamese and cross-language recall (8/8, byte-identical round trip) and storage lifetime (about 210 days, nothing expires before judging).

**Blocked on me.** Read `docs/BLOCKERS.md`; it is current. In order of risk:
1. One message to `@walrussession8_bot`, then the invites in `docs/RUNBOOK.md`, with the `/memory off` baseline day first. The only thing still blocking a judging criterion.
2. A second Slush wallet with no MemWalAccount, to film the wallet flow.
3. A SuiNS name pointed at the Walrus Site object.

**How to work.**
- Do not ask me what to do next. Every open choice is already settled in `docs/GOAL.md` or `docs/ARCHITECTURE.md`. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in `docs/DECISIONS.md`, and keep going.
- When you are blocked, do everything that is not blocked, append the exact ask to `docs/BLOCKERS.md`, and move to the next milestone's unblocked work. Never fabricate credentials, users or evidence.
- Verify every task with the command listed under its milestone. Keep `pnpm typecheck`, `pnpm lint` and `pnpm test` green on every commit. Commit per task, push per milestone.
- Any SDK or relayer friction becomes a draft in `docs/issues/` with a repro, the same day. Eight are written and ready to file.
- Measure twice before claiming a cause, and never leave a polling loop running against the relayer. One encouraging run in the direction I expected nearly went into the article as a finding; a clean re-run refuted it.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit `memwal/`, never commit `.env`.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
