# Demo video script, target 2 minutes

Shoot at 1280×720 so text stays readable when embedded in the article.

**0:00 — the problem, 15s.** Web chat, memory paused with `/memory off`. Say
"I only use pnpm". Reload. Ask "which package manager should I use?". It does not
know. One sentence over the top: most bots forget you the moment you close the tab.

**0:15 — memory on, 25s.** `/memory on`. Say the same thing plus "answer me in
Vietnamese, keep it short". Reload the page so nothing is carried in the
conversation. Ask again. It answers, in Vietnamese, without being asked in this
session. Point at that: a `style` memory changed how it writes.

**0:40 — where the memory actually is, 20s.** Open `/me`. Show the list of
memories with their types. Click a blob link to walruscan, then the ciphertext
link so the raw encrypted bytes are on screen. Say: anyone can download this,
only the account can read it.

**1:00 — it follows you, 20s.** In the terminal run `pnpm hippo`. Ask what it
knows. Nothing. Back in the web chat run `/link`, copy the code, `/link <code>`
in the terminal, ask again. Same memory, different client.

**1:20 — you own it, 30s.** `/connect` in the chat, open the link, connect the
wallet. Show the sponsored transaction landing with no gas. Back in the chat,
`/whoami` now shows a Walrus Memory account on Suiscan. Open the account object
and show hippo listed as a delegate.

**1:50 — you can take it back, 20s.** `/disconnect`, sign the removal. Show the
delegate gone from the account on Suiscan. Ask the question again: hippo does not
know. Then `/connect` again and it does.

**2:10 — close, 10s.** Repo on screen, five commands, `pnpm demo` scrolling past
with 4/4.

Record the revoke leg twice: once for the video, and once with `pnpm smoke` run
against the removed key immediately afterwards, so the article can report
truthfully whether the relayer honours a revoked key and for how long. See
`docs/issues/08`.
