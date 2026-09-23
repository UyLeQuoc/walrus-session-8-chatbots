# Promo and social drafts

## X post (required: tag @WalrusProtocol, use #WalrusMemory, reply under the session announcement)

> Most chatbots forget you. The ones that don't usually own your memory.
>
> I built hippo for Walrus Session 8: it remembers you across web, Telegram and
> a terminal, and the memory lives in a Walrus Memory account you own on Sui.
> Revoke its key on chain and it forgets, about half a minute later. I measured
> it.
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
> discarded matches, which makes a memory bot look like it has amnesia. And I
> spent a week certain the relayer was honouring a delegate key the chain did
> not list, wrote it up as a security finding, and was wrong: there are two
> deployments live on mainnet and I had been reading the wrong account the whole
> time.
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

Two rules that are easy to break in a short post.

**Never repeat the retracted claim.** Earlier drafts of everything said the
relayer authorizes delegate keys the chain does not list. It does not. We had
taken the package id from `GET /config` and the registry id from the
documentation, which are two different mainnet deployments, so we were reading a
real account that was not ours. Repeating it in a post is worse than repeating
it in a repo, because nobody reads the correction. If the mistake is mentioned
at all, it is ours, in the first person, with the real bug named after it.

**Say "within about a minute", never "instantly".** Revocation is measured at
about 32 seconds, still accepted at 15. Overstating it invites somebody to test
it and find us wrong about the one claim the project is built on.
