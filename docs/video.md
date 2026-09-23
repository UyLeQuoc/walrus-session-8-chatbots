# Demo video script, target 2 minutes

Shoot at 1280×720 so text stays readable when embedded in the article.

**0:00 — the problem, 15s.** Web chat, memory paused with `/memory off`. Say
"I only use pnpm". Reload. Ask "which package manager should I use?". It does not
know. One sentence over the top: most bots forget you the moment you close the tab.

**0:15 — memory on, 25s.** `/memory on`. Say the same thing plus "answer me in
Vietnamese, keep it short". Reload the page so nothing is carried in the
conversation. Ask again. It answers, in Vietnamese, without being asked in this
session. Point at that: a `style` memory changed how it writes.

**0:40 — where the memory actually is, 20s.** Open `/me`. The "On chain" panel
is the shot: the account object, its owner, and the list of keys that can read
this memory, all read from Sui rather than from our database. Then the memory
list below it. Click a blob link to walruscan, then the ciphertext link so the
raw encrypted bytes are on screen. Say: anyone can download this, only the
account can read it.

Do not claim on camera that you can decrypt it yourself. You cannot, today:
mainnet ciphertext is sealed by a committee key server whose aggregator wants an
API key (`docs/issues/12`). The honest line is that the chain decides who may
read, which is the part that was measured.

**1:00 — it follows you, 20s.** In the terminal run `pnpm hippo`. Ask what it
knows. Nothing. Back in the web chat run `/link`, copy the code, `/link <code>`
in the terminal, ask again. Same memory, different client.

**1:20 — you own it, 30s.** `/connect` in the chat, open the link, connect the
wallet. Show the sponsored transaction landing with no gas. Back in the chat,
`/whoami` now shows a Walrus Memory account on Suiscan. Open the account object
and show hippo listed as a delegate.

**1:50 — you can take it back, 30s.** Use the "Revoke hippo's access" button on
`/me`, sign the removal. Show the delegate gone from the account on Suiscan, and
gone from the on-chain panel after a refresh.

**Then wait, and say why.** Revocation is not instant: measured at about 32
seconds, still accepted at 15
(`docs/evidence/revocation-2026-09-22.md`). Do not cut that pause out. Say the
number over it, ask the question after it, and let hippo answer that it does not
know. A viewer who tests this themselves must find what the video showed. Then
`/connect` again and it does.

**2:10 — close, 10s.** Repo on screen, five commands, `pnpm demo` scrolling past
with 4/4.

The revoke timing no longer needs discovering on camera; it is measured and
written up in `docs/evidence/revocation-2026-09-22.md`, and
`packages/memory/scripts/spike-revoke.ts` re-runs the whole thing in a minute if
the relayer version changes before filming.
