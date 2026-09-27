# Chat upgrade — execution plan

Written 2026-09-27 from an owner request: the chat is too plain, and the next work should make it more useful while using the Sui stack (Walrus files, Seal access, wallet ownership). This file is the plan for that work. It does not replace `docs/GOAL.md`. Hackathon submission work in GOAL still stands. If asked to continue the chat upgrade, start here, then read `CODE_RULES.md` before editing.

Deadline remains **Oct 9, 2026 14:00 UTC**. Do not let this plan eat the real-user week in `docs/RUNBOOK.md`. Ship a thin vertical slice, then stop.

## Mission

Turn the web chat into a workspace where a person can talk, see what hippo remembered, attach a private document, ask about it with a citation, and use that knowledge again in a later chat. The document lives on Walrus. The right to read it is enforced with Seal and the person's wallet. hippo is a revocable reader, not the owner.

## Decisions already made

Do not reopen these. If a new choice appears, pick the option that keeps private files, wallet-paid storage, and the existing memory eval intact. Write the choice in `docs/DECISIONS.md` and continue.

- 2026-09-27 — **The first upgrade is four things, in this order:** everyday chat controls, memory visible in the chat, private file upload, then Sui polish (SuiNS, permission UI, Enoki when a key exists). The owner selected all four. Do not add image OCR, voice, a custom MCP server, or a new channel.
- 2026-09-27 — **Files are private by default.** Encrypt before upload. A blob id alone must not reveal the plaintext. Do not ship a public-file mode as a shortcut.
- 2026-09-27 — **Uploading requires a connected wallet.** Guest text chat stays as it is. A guest who wants to attach a file connects a wallet first. The connected wallet pays WAL and SUI. Say who pays before the signature. Do not spend the operator wallet on someone else's file. Walrus Memory sponsorship does not cover this flow.
- 2026-09-27 — **Wallet connected is not owned mode.** `/connect` still owns the memory account. A file can belong to a wallet before that wallet has finished owned-mode onboarding. Key documents by wallet address so they survive a guest cookie.
- 2026-09-27 — **The browser decrypts. The server does not keep plaintext.** Ciphertext goes to Walrus. Postgres holds ids, hashes, sizes, status, and expiry. For a turn, the browser decrypts and sends only the excerpt the model needs. That excerpt is not written to `messages`, `memory_index`, or logs. Durable facts still go through `remember`, with the document id as provenance, and are subject to the existing dedupe and correction rules.
- 2026-09-27 — **Revoking a file does not delete memories already extracted from it.** Walrus Memory cannot delete a blob (`docs/issues/09`). Hiding is hippo's filter. Track the source document on those memories and hide them when the file grant is revoked, and say that this is a hide, not a delete. A transcript that already quoted the file still contains that quote.
- 2026-09-27 — **Transcripts stay in Postgres.** Do not move chat history onto Walrus. A transcript write takes about 24 seconds and would pollute recall (`docs/DECISIONS.md`, 2026-09-26).

## What not to build

- A public mainnet publisher upload. Walrus has no public unauthenticated publisher on mainnet. Use `@mysten/walrus` `writeFilesFlow` from the connected wallet, with separate user gestures for register and certify so the wallet popup is not blocked.
- `withMemWal` autoSave. File facts go through `remember` or they are not memories.
- Plaintext, filenames that identify a person, or document text in Postgres. Encrypt the display name the same way conversation titles are encrypted.
- A second copy of slash-command policy in the web menu. Import the catalog from `apps/server/src/chat/command-catalog.ts`.
- OCR, images-as-memory, voice, Slack, Discord, or a hippo MCP server. Those are out of this plan.
- Client-side SEAL decrypt of existing MemWal memories as a side quest. `docs/issues/12` is a filed friction, not this feature. This feature encrypts new documents under a policy hippo controls.

## Current code the work has to respect

- `apps/web/src/features/chat/chat-page.tsx` owns transport, effects, composer, and rendering. Split new behavior into hooks. Do not grow this file.
- `Examples` is only rendered on an empty thread, and `taught` is hardcoded `false` (`chat-page.tsx` around the `Examples` call). The "Reload, then ask" path in `examples.tsx` is not reachable. A normal reload now restores the transcript, so a reload is no longer proof of Walrus recall. A new chat is.
- `ToolLine` says `remembering` or `already knew`. It does not know `pending`, `stored`, or `failed`. Those states already exist on `memory_index`.
- `useMe` loads once. A write settles about 25 seconds later, so the strip and `/me` stay stale.
- Stream metadata includes `recalled`, but `toUiMessages` in `apps/web/src/features/chat/transcript.ts` drops it. Reopening a chat loses the citations.
- `apps/web/src/components/ui/attachment.tsx`, `progress.tsx`, `sheet.tsx`, `resizable.tsx`, `tabs.tsx`, and `command.tsx` exist. Compose them. Do not restyle a primitive, and do not use `size="sm"`.
- `packages/memory/scripts/spike-decrypt.ts` can download ciphertext and can build `seal_approve`. Mainnet Seal fetch still needs an aggregator API key. As of the Seal docs checked 2026-09-27, `https://seal-aggregator-mainnet.mystenlabs.com` requires an Enoki `X-API-Key`. That key is not in `.env`. Record the ask in `docs/BLOCKERS.md` when the spike confirms it. Do not invent a key.

## Operating rules

- `CODE_RULES.md` outranks this file on how to write code.
- A route parses and authorizes. Domain functions do the work. A page renders. A hook owns a flow.
- Parse every body with zod. No `any`. No new comments except a measured Walrus or Seal quirk the next reader would otherwise repeat.
- Memory text never becomes a column. Document text neither.
- Do not log a key, a session token, a filename, or document text.
- Schema changes to production go through `bun run --filter @hippo/db plan-push` and wait for the owner. Do not add `drizzle-kit push` to the Railway start command.
- `bun run typecheck && bun run lint && bun run test` is green before a task is done.
- Mainnet only. Gemini via OpenRouter only. No OpenAI or Anthropic model.
- Commit at the end of a task only when the owner has asked for commits. This plan does not authorize a commit by itself.

## Phase 0 — Spike the file path before writing the feature

Do this in parallel with Phase 1. Do not start Phase 3 until it has a written result in `docs/SPIKES.md`.

1. Confirm whether `MemWalAccount.seal_approve` can gate a document identity hippo did not create, or whether documents need their own published package with `seal_approve`. Read `memwal/` first. Do not guess.
2. Encrypt a tiny payload with `@mysten/seal` against the mainnet committee key server `0x686098f1439237fff9f36b99c7329683c22979d2005c2465cb891acb012a7595`, aggregator `https://seal-aggregator-mainnet.mystenlabs.com`. Expect an API key. If it fails closed, stop and append the exact Enoki ask to `docs/BLOCKERS.md`.
3. From a connected wallet with WAL and SUI, run `writeFilesFlow` for one small ciphertext: encode, register, upload, certify. Record both digests, the blob id, and who paid. If the wallet cannot pay, the UI must say so and must not ask for a signature.
4. Decrypt that blob in the browser with a `SessionKey` the wallet signs. Confirm hippo's server never saw the plaintext.

Exit: `docs/SPIKES.md` has the four results, and Phase 3 either has a working policy or is blocked in `docs/BLOCKERS.md` with the exact missing input. A blocked spike does not block Phase 1 or Phase 2.

## Phase 1 — Chat controls

Goal: the existing chat is usable before any new Walrus surface exists.

1. Extract the chat transport, stop, and retry rules out of `chat-page.tsx` into `apps/web/src/features/chat/use-chat-thread.ts`. The page paints. The hook returns messages, status, and callbacks.
2. Stop. **Done 2026-09-27.** While a turn is streaming, the send control becomes Stop and aborts the stream. Aborting does not insert a second user row. The request signal stops further recalls and is passed into `streamText`.
3. Retry the last answer. One retry path, shared with edit. A retry must not call `remember` again for a fact this turn already stored. Prove that with a test against the tool result, not against a screenshot.
4. Edit the last user message and resend. Older messages stay. The replaced answer is the one the transcript keeps.
5. Copy the answer. Fenced code gets a copy control and a language label. Use the markdown renderer that already exists. Do not add a second markdown stack.
6. Command menu. **Done 2026-09-27.** Typing `/` opens a popover above the composer. Each row is a muted icon, the command, and the catalog description. Choosing one sends it immediately. Names come from `@hippo/core/commands`, not a second list.
7. Search chats in the sidebar. Filter the list `useConversations` already loads. Do not send titles to a new endpoint. Titles are decrypted for the owner already.
8. Follow-up suggestions are optional and only after the controls above. Three suggestions, generated with the same model, never stored as memories unless the person sends one.

Verification: `apps/web/src/app/pages.test.tsx` covers stop, retry, edit, and the command menu with the network stubbed. A unit test covers the retry-does-not-rewrite-memory rule. `bun run typecheck && bun run lint && bun run test` passes.

## Phase 2 — Memory in the chat

Goal: a person can see, correct, and hide a memory without leaving the thread, and a reopened chat still shows what the answer used.

1. Right-hand panel on desktop, sheet below `768px`. Two tabs later (Memory, Files). Phase 2 ships the Memory tab only. Collapsed by default after the first visit if the person closed it. Remember that in `localStorage`, same pattern as theme.
2. "Just remembered" card when a `remember` tool result arrives. Show type, fact text, and status. Status comes from a light `GET /api/me/memories/:id/status` that reads `memory_index` only. Do not call the relayer expiry lookup on a poll. Poll while `pending`, at most every 3 seconds, at most 2 minutes, then show "still writing" and stop.
3. Actions on that card: view on `/me`, correct, hide. Correct sends a `correction` through the existing remember path and links it to the blob it replaces. Hide calls the existing visibility route. Copy must say the blob remains on Walrus.
4. Select text in a user or assistant bubble and choose Remember. The hook opens an edit of that selection, the person confirms, then `remember` runs. Never remember a selection silently.
5. Persist citations. Store blob id, type, and distance on the assistant message. Not the memory text. On reopen, resolve text through recall or the existing search path, and omit any blob the person has hidden or lost access to. `toUiMessages` must keep this metadata.
6. A memory toggle next to the composer, wired to the existing on/off command. The composer shows the state. It does not invent a second flag.

Verification: a render test shows a pending card become stored without a relayer call. A test shows a hidden blob is absent after reopen. A mainnet check is not required for the card. Do not weaken `bun run demo`.

## Phase 3 — Private files

Start only after Phase 0 has a passing decrypt. If Phase 0 is blocked, stop at Phase 2 and say so in `docs/BLOCKERS.md`.

1. Domain module `apps/server/src/documents/`. Routes in `apps/server/src/routes/documents.ts` parse, authorize, and call it. The web feature lives in `apps/web/src/features/documents/`.
2. Tables, names to keep: `documents` and `message_attachments`. `documents` holds person id, wallet address, blob id, ciphertext sha256, encrypted filename, media type, byte size, status, walrus object id, expiry, created time, revoked time. No plaintext column. `message_attachments` links a message to a document id.
3. Composer attach control, drag and drop, and paste. Use `attachment.tsx` at its default size. States: idle, needs wallet, uploading, processing, stored, error. Each state has a sentence that says what failed and what to do.
4. Wallet gate. If no wallet is connected, the attach control opens the existing wallet connect and does not upload. If the wallet has no SUI or no WAL, say which one is missing and do not request a signature.
5. Upload flow, four user-visible steps matching `writeFilesFlow`: encode, register, upload, certify. Register and certify are separate clicks. The server records the blob id only after certify. A failed certify leaves a visible failed row, not a silent orphan.
6. Library in the panel and in the sidebar. A file can be attached to a later chat with `@` plus its name. The browser decrypts it again. The server receives an excerpt for that turn only.
7. v1 types: PDF with a text layer, Markdown, and plain text. Cap at 10 MB and 100 pages. If a PDF has no text layer, say so. Do not OCR it in this phase.
8. Asking. The excerpt is untrusted context, nonce-delimited, same family as `formatUntrustedMemories`. The answer cites document id and page or heading. The citation is metadata on the assistant message, not a paste of the file into Postgres.
9. Remember from a file is explicit. The person confirms the fact. The memory row records the source document id. Revoke hides those memories and says they were hidden, not deleted.

Verification: a test with a fake Seal and Walrus client proves ciphertext is what would be uploaded and plaintext is absent from the request log and from the database row. A second test proves a revoked document's extracted memories are hidden. A browser test covers the no-wallet and no-balance refusals. Do not put a real key in a test.

## Phase 4 — Sui polish

Only after Phase 3 is usable.

1. SuiNS reverse lookup on the file owner, using the existing `@mysten/suins` direction in `docs/ARCHITECTURE.md`. Show the hex address when no name resolves.
2. File details: owner, hippo's read grant, blob object, certify digest, expiry, revoke. Revoke must be a wallet transaction, then hippo drops its ability to receive excerpts from that browser. Do not claim the ciphertext left Walrus.
3. Enoki Google sign-in only if `VITE_ENOKI_API_KEY` and `VITE_GOOGLE_CLIENT_ID` exist. If they do not, append the ask to `docs/BLOCKERS.md` and skip. Do not block the wallet path. Remember the zkLogin caveat in `docs/ARCHITECTURE.md` §1: a Google user will not share that address with the Walrus dashboard or Claude Code.

## Cut order

If the deadline is close, cut in this order: Enoki, SuiNS, follow-up suggestions, in-panel correction history, persistent chunk index. Do not cut private-by-default, the wallet gate, citations, or the retry-does-not-duplicate-memory rule.

## Done when

A stranger can, on the web app:

1. Send, stop, retry, and edit without a duplicate memory.
2. See a fact move from "writing" to "on Walrus", hide it, and reopen the chat with the citation still honest.
3. Connect a wallet, attach a text file, pay for storage, ask a question, and see a page citation.
4. Open a new chat, pick the same file, and ask again without the old transcript.
5. Revoke the file and watch hippo stop using it, including facts it had saved from that file.

`bun run demo` still passes. The article does not claim this feature until those five are true.

## Later

Not specified on purpose. Do these after the chat upgrade above, and do not invent the design before then.

1. The user enters their own API key. Store it with Seal.
2. The user picks their own model.
3. Use Jev AI in hippo.
