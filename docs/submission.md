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
> user can revoke on chain at any time.

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
> than being quoted back.

**Chatbot use case.** Personal and developer assistant, with portable, user-owned memory.

**Where is it deployed and how can judges access it?** `[HUMAN]` live URL and Telegram handle, once deployed. Judges can also clone and run it: five commands in the README, and `pnpm demo` proves cross-session recall on mainnet without any setup beyond credentials.

**Which LLM did you build with?** Google Gemini 2.5 Flash, accessed through OpenRouter, driven by the Vercel AI SDK. Chosen deliberately so the submission qualifies for the Beyond the Big Two track. Fallback configured: Qwen3 235B, also via OpenRouter.

**Model name and version.** `google/gemini-2.5-flash` (OpenRouter), `ai` v7, Node 20.

**How many agents have written blobs on mainnet?** `[M6]` — `pnpm evidence` prints this. Each owned-mode user gets their own delegate key, so this grows with real users.

**MEMWAL_AGENT_ID.** `f07169b63a377f86902696bf295997e3b2183043edd6024b4fc86907dfb85fa2`

**Account ID (MemWalAccount object on Sui).** `0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5`

**Explorer link to the MemWalAccount holding the memories.**
https://suiscan.xyz/mainnet/object/0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5

**Confirm the agent has written blobs on mainnet.** Yes. Example blob written during development: `sSON47uP-NTVEGXMuhx_tSCVaQTpSGls2lsYPor5U5k` — https://walruscan.com/mainnet/blob/sSON47uP-NTVEGXMuhx_tSCVaQTpSGls2lsYPor5U5k

**Which tool did you use to connect with Walrus Memory?** The TypeScript SDK, `@mysten-incubation/memwal`, against the managed mainnet relayer. The official MCP plugin is used separately to demonstrate that the same memory is readable from Claude Code.

**Feedback: GitHub tickets.** Drafted with repros in `docs/issues/`; file before submitting and paste the links here.

| # | Title |
|---|---|
| 1 | `recall()` returns an empty list while reporting it dropped the matches |
| 2 | `remember` jobs die from the relayer's own Sui RPC throttling |
| 3 | The two documented `recall()` call forms are not equivalent |
| 4 | Published mainnet contract IDs are stale |
| 5 | A wrong `x-account-id` is silently repaired on mainnet and fatal on testnet |
| 6 | Write rate limit is 60/min, not the documented 30/min, weights unpublished |
| 7 | `GET /api/whoami` 404s; `GET /v1/owners/:owner/agents` is flaky and miscounts |
| 8 | The relayer authorizes a delegate key that is not in the on-chain `delegate_keys` |
| 9 | No way to permanently delete a memory, even as the owner |
| 10 | `restore()` reports `total: 0` and `truncated: false` for a namespace that has memories |

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
> namespaces whose memories recall returns right now. The owner address does own
> the blobs, 197 of them, so this looks like the owner-wide candidate fetch being
> capped below the account's blob count, which your own notes flag as an
> unreported case (WALM-451). A recovery tool that silently sees nothing is worse
> than one that errors.

**One improvement idea.**

> Make the on-chain delegate list the single source of truth for authorization,
> and make the tooling prove it. Our own delegate key is not in the account's
> on-chain `delegate_keys`, yet the relayer accepts it and decrypts with it,
> while SEAL's `seal_approve` correctly refuses it. Two enforcement points gave
> two different answers for one credential. A `memwal doctor` command that
> printed what the chain says, what the relayer says and where they disagree
> would have saved us a day, and would let any user audit who can actually read
> their memories.

**X account / SUI address for rewards.** `[HUMAN]`

**GitHub.** https://github.com/UyLeQuoc/walrus-session-8-chatbots

**Link to article.** `[HUMAN]` after publishing `docs/article.md` on Medium and Inkray

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
