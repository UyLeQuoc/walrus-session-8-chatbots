# Submission answers

Every field the Airtable form and DeepSurge ask for, filled where the answer is
already known. `[M6]` marks a number that comes from `pnpm evidence` after the
real-use week. `[HUMAN]` marks something only the account owner can supply.

Form: https://airtable.com/appoDAKpC74UOqoDa/shro5iVzzjoWfZlPK
DeepSurge: https://www.deepsurge.xyz/hackathons/c0141a4a-21be-4009-bc63-7c168608c849

---

**Project name.** hippo

**Session.** Session 8: Chatbot

**Primary contact / email / country / Telegram / Discord handle.** `[HUMAN]`

**DeepSurge link.** `[HUMAN]` after registering

**What does your chatbot do and who is it for?**

> hippo is an assistant that remembers the people it talks to, across a web chat,
> Telegram and a terminal, and lets them own that memory. It is for developers
> and anyone who is tired of re-explaining their setup, their preferences and
> their decisions to a bot every session. It starts in guest mode so the first
> message costs nothing, then `/connect` moves the memory into a Walrus Memory
> account owned by the user's own wallet, with hippo holding a delegate key the
> user can revoke on chain at any time. `/export` hands the memory back as a
> file, each line checked against the hash hippo recorded when it wrote it.

**What does your chatbot store in memory and how does it use it?**

> Six kinds of fact, each stored as one line of text with a type, an author and a
> date: profile, decision, gotcha, commitment, correction and style. The model
> writes them through a tool in the same turn it learns them, after a
> near-duplicate check so restating something does not create a second entry.
> Before each reply hippo recalls against the user's message, plus fixed queries
> for profile, style and open commitments at the start of a session, and injects
> what comes back as untrusted data rather than as instructions. `style`
> memories change the system prompt, so the bot's language and length adapt to
> the individual, which is the clearest case of memory changing behaviour rather
> than being quoted back. When the user changes their mind, the correction is
> stored even though it resembles the old fact, recalled beside it, and believed:
> memories reach the model newest first by the relayer's write time, and the eval
> fails if any answer states the superseded value.

**Chatbot use case.** Personal and developer assistant, with portable, user-owned memory.

**Where is it deployed and how can judges access it?** Web: https://hippo-web-ten-nu.vercel.app. Telegram: `@walrussession8_bot`. API health: https://hippo-server-production.up.railway.app/api/health/deep. The web app is also published as a Walrus Site; `[HUMAN]` a SuiNS name still needs pointing at the site object for `wal.app` to serve it. Judges can also clone and run it: five commands in the README, and `pnpm demo` proves cross-session recall on mainnet without any setup beyond credentials.

**Which LLM did you build with?** Google Gemini 2.5 Flash, accessed through OpenRouter, driven by the Vercel AI SDK. Chosen deliberately so the submission qualifies for the Beyond the Big Two track, and kept after measuring the alternatives rather than on faith: `deepseek/deepseek-v4-flash` and `qwen/qwen3.7-flash` cost a third as much and recall just as well, but drop the style adaptation that makes memory visibly change behaviour (`docs/evidence/model-bakeoff-2026-09-23.md`). Fallback: `qwen/qwen3.7-flash`, which takes over on the non-streaming channels if the primary fails outright.

**Model name and version.** `google/gemini-2.5-flash` (OpenRouter), `ai` v7, Node 20.

**How many agents have written blobs on mainnet?** `[M6]` — `pnpm evidence` prints this. Each owned-mode user gets their own delegate key, so this grows with real users.

**MEMWAL_AGENT_ID.** `f07169b63a377f86902696bf295997e3b2183043edd6024b4fc86907dfb85fa2`

**Account ID (MemWalAccount object on Sui).** `0x5a257802b4881641b49ea3ad3e460a4387f9262b4f96fd68cd4be3928e5a07aa`

**Explorer link to the MemWalAccount holding the memories.**
https://suiscan.xyz/mainnet/object/0x5a257802b4881641b49ea3ad3e460a4387f9262b4f96fd68cd4be3928e5a07aa

> Note for anyone checking this against an earlier draft: it used to name
> `0x4926f26b…`. That is this owner's account in the **superseded** mainnet
> deployment, which is a real object and the wrong one. The id above is the
> account in the deployment `GET /config` serves, and the one the relayer
> actually writes to. `pnpm diagnose` verifies the pair and fails if the chain
> and the relayer disagree. See `docs/issues/11`.

**Confirm the agent has written blobs on mainnet.** Yes. Example blob written during development: `sSON47uP-NTVEGXMuhx_tSCVaQTpSGls2lsYPor5U5k` — https://walruscan.com/mainnet/blob/sSON47uP-NTVEGXMuhx_tSCVaQTpSGls2lsYPor5U5k

**Which tool did you use to connect with Walrus Memory?** The TypeScript SDK, `@mysten-incubation/memwal`, against the managed mainnet relayer. The official MCP plugin is the planned demonstration that the same memory is readable from Claude Code; `[HUMAN]` it needs a spare wallet and has not been run yet, so do not claim it until it has.

**Feedback: GitHub tickets.** Drafted with repros in `docs/issues/`. File with `scripts/file-issues.sh`, which writes each resulting URL back into its draft, then paste the links here.

| # | Title |
|---|---|
| 1 | `recall()` returns an empty list while reporting it dropped the matches |
| 2 | `remember` jobs die from the relayer's own Sui RPC throttling |
| 3 | The two documented `recall()` call forms are not equivalent |
| 4 | Published mainnet contract IDs are stale |
| 5 | A wrong `x-account-id` is silently repaired on mainnet and fatal on testnet |
| 6 | Write rate limit is 60/min, not the documented 30/min, weights unpublished |
| 7 | `GET /api/whoami` 404s; `GET /v1/owners/:owner/agents` is flaky and miscounts |
| 9 | No way to permanently delete a memory, even as the owner |
| 10 | `restore()` reports `total: 0` and `truncated: false` for a namespace that has memories |
| 11 | `GET /config` names a package but not its registry, and the mismatch surfaces as `502 Sponsor service error` |
| 12 | Mainnet memories are sealed by a committee key server the SDK does not default to, and its aggregator needs an API key |

Draft 8 is deliberately absent. It claimed the relayer authorizes delegate keys
the chain does not list. It does not; we were reading an account in the
superseded deployment. The draft stays in our repo under a retraction because
the mistake is instructive, and `scripts/file-issues.sh` refuses to post any
draft whose heading begins with RETRACTED.

**One bug or friction point you hit.**

> `recall()` can return `{"results": [], "total": 0, "dropped_count": 5}`: it
> found five matches and discarded all five, with HTTP 200 and no error. The
> SDK's `RecallResult` type does not expose `dropped_count`, so the caller sees
> an ordinary empty result and concludes the user has no memories. For a memory
> product this is the worst possible silent failure, and during one run of our
> four-question eval it fired four times. We now retry three times before
> believing an empty result that had candidates.

**A second friction worth naming, if the form allows more than one.**

> `restore()` is the documented answer to "what happens if the relayer loses its
> index", and on our account it reports `total: 0` with `truncated: false` for
> namespaces whose memories recall returns right now. Re-measured on 2026-09-23
> against the corrected account id: the read API lists 149 memories for this
> owner while `restore()` sees zero, at limits of 10, 50 and 100. Those two
> relayer endpoints cannot both be describing this account. A recovery tool that
> silently sees nothing is worse than one that errors.

**One improvement idea.**

> Return `registryId` from `GET /config`, beside `packageId`. One line of JSON.
> Two deployments are live on mainnet and they are separate packages rather than
> one upgraded in place, so a client that takes the package from `/config`, as
> the docs instruct because the published id is stale, and the registry from the
> docs will silently mix them. That cost us a week in two disguises: every
> sponsored transaction failed as an opaque `502 sponsor_upstream_error`, and an
> owner lookup returned a real, active, delegate-bearing account that was not
> ours. The second one led us to draft a bug report accusing the relayer of
> authorizing keys the chain does not list, which we then had to retract.
>
> Two smaller things in the same spirit. Pass the upstream simulation error
> through instead of collapsing every sponsor failure into one code: ours was
> `CommandArgumentError { arg_idx: 0, kind: TypeMismatch }` and would have named
> the problem immediately. And ship something like the `pnpm diagnose` we ended
> up writing, which prints what the chain says, what the relayer says, and where
> they disagree. Every hour we lost was an hour spent not knowing that those two
> disagreed.

**X account / SUI address for rewards.** `[HUMAN]`

**GitHub.** https://github.com/UyLeQuoc/walrus-session-8-chatbots

**Link to article.** `[HUMAN]` after publishing `docs/article-final.md` (799 words; `docs/article.md` is the long source) on Medium and Inkray

**Link to article tweet.** `[HUMAN]` — draft in `docs/promo.md`

**Link to promo post.** `[HUMAN]` — Show HN and dev.to drafts in `docs/promo.md`

**Communities outside web3 worth engaging.**

> Developer-tooling communities where the pain is already felt: the Cursor and
> Claude Code user communities, r/LocalLLaMA for people running their own models
> who need memory that is not tied to a vendor, and the Vercel AI SDK community,
> since a memory middleware is the natural integration point. In Vietnam, Viblo
> and the larger local developer Discords reach a lot of builders who never see
> Sui content. I am part of the Vietnamese developer community and can introduce
> or help organise there.

**How did you find out about the session?** `[HUMAN]` — previous Walrus Sessions participant

**Have you participated before?** Yes, Session 2 (Tools Builder), first place with WalForm.

**Have you used Walrus Memory before?** Yes, Session 5 (Prompt Jam).

**Session feedback.** `[HUMAN]` optional, worth writing: the credential naming confusion in `docs/issues/05` cost real time and would hit every new builder.
