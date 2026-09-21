# Promo and social drafts

## X post (required: tag @WalrusProtocol, use #WalrusMemory, reply under the session announcement)

> Most chatbots forget you. The ones that don't usually own your memory.
>
> I built hippo for Walrus Session 8: it remembers you across web, Telegram and
> a terminal, and the memory lives in a Walrus Memory account you own on Sui.
> Revoke its key and it forgets.
>
> Measuring what actually works, and what broke:
> [article link]
>
> @WalrusProtocol #WalrusMemory

## Promo prize post — must be outside Walrus and Sui channels

X, r/sui, r/walrus and any Walrus or Sui owned channel do not count. Three
candidates, in order of fit:

### 1. Show HN

Title: **Show HN: A chatbot where the user owns the memory, not the bot**

> hippo remembers you across a web chat, Telegram and a CLI. The memories are
> encrypted blobs on Walrus, in an account owned by the user's own wallet; the
> bot holds a delegate key the user can revoke on chain.
>
> The parts I did not expect: writes take about 24 seconds, so nothing can block
> on them. Recall sometimes returns an empty list while reporting it found and
> discarded matches, which makes a memory bot look like it has amnesia. And my
> own delegate key turned out not to be on chain at all, which I only noticed
> because client-side decryption refused it.
>
> Repo, an eval that proves cross-session recall, and the write-up: [links]

### 2. dev.to

Cross-post the article with the tags `ai`, `typescript`, `chatbot`, `webdev`.
Lead with the distance measurements, they are the part that generalises to anyone
building retrieval.

### 3. A Vietnamese developer community

Viblo or a local dev Discord. Outside the Walrus and Sui ecosystem, and closer to
the people most likely to actually try it. Write this one in Vietnamese, leading
with the cross-channel demo rather than the ownership angle.

## What to say about the bugs

Say them plainly, in the same voice as the article. Every one is filed with a
repro, and reporting them properly is part of the session. Do not soften them and
do not dramatise them.
