# I gave my chatbot memory, then gave the memory back to the users

*Adding persistent memory to a chatbot with Walrus Memory, Gemini and the Vercel AI SDK, and what broke along the way.*

Most chatbots forget you when you close the tab. The ones that don't have a
quieter problem: the memory belongs to whoever built the bot.

I built hippo for Walrus Session 8 to try the other way. It talks on the web, on
Telegram and in a terminal, remembers you across all three, and keeps that memory
in a Walrus Memory account **you** own on Sui mainnet. hippo holds a delegate key.
You can take it away.

### What it stores, and when

Every memory is one line of text with a type tag: profile, decision, gotcha,
commitment, correction or style. The model stores one through a tool in the
same turn it learns it, unprompted. Before each reply hippo recalls against your
message, and injects the results as untrusted data, never as instructions.
`style` memories change how it writes. The whole integration is three calls:

```ts
import { MemWal } from "@mysten-incubation/memwal";

const memwal = MemWal.create({ key, accountId, serverUrl, namespace });

const { job_id } = await memwal.remember("[profile] [by:@mai] [2026-09-25] Only uses pnpm.", namespace);
await memwal.waitForRememberJob(job_id); // ~24s: hippo waits in the background

const { results } = await memwal.recall({ query: userMessage, namespace, limit: 6 });
```

Every web reply lists the memories it used, each linked to its encrypted blob.

### Before and after

`bun run demo` teaches hippo five things, changes one ("we moved from pnpm to
bun"), throws the conversation away, then asks questions in a fresh session:

```
PASS  Which package manager should I use here?  → "Bạn nên dùng bun."
PASS  What port is the database on?             → "…cổng 5433."
PASS  What do you know about me?                → answered in Vietnamese
PASS  0 of 5 answers stated pnpm without bun
```

Nobody asked for Vietnamese in that session; a memory from the previous one
changed how it writes. With memory off, the same questions got "Which
database?" and "We did not settle on an ORM."

`[M6]` Real use: N people over M days, X memories each, and the moment it
mattered.

### What broke

**Writes take 24 seconds, recalls about one.** So hippo answers before a write
lands, and asks as few recall questions as it can.

**Recall sometimes returns nothing while saying it found something**:
`{"results": [], "dropped_count": 5}`, HTTP 200, and the bot forgets you for a
turn. Four runs of one eval dropped 4, 9, 0 and 15 times. Retrying is the only
fix I found.

**Corrections were lost three ways.** Dedupe discarded "I no longer use VS Code"
as a duplicate of "I use VS Code", 0.24 apart, because distance cannot see "no".
The model sometimes acknowledged a change without storing it, and one prompt edit
of mine made that worse. And "what do you know about me?" recalled the old fact
but never the correction. Each needed its own fix.

**I wrote up a security bug against Walrus Memory, and it was mine.** The relayer
accepted a key my account did not list, so I concluded on-chain access control
was not what governed access. In fact two Walrus Memory deployments are live on
mainnet. I took the package id from `GET /config` and the registry id from the
docs, and so read a real account that was not mine. The same mismatch broke
every sponsored transaction as an opaque `502`. The report stays in
my repo, marked retracted. Check the Move type of every id you configure.

### What revoking actually does

On a throwaway account, a key removed on chain was still accepted 15 seconds
later and refused by 32. Revocation works, in about half a minute, not
instantly. On `/disconnect` hippo also destroys its own copy of the key.

### What ownership does not cover yet

You cannot decrypt your memory yourself. Mainnet memories are sealed by a key
server the SDK does not list, behind an aggregator that needs an API key, so
reading still goes through the relayer. And you cannot delete a memory: `forget`
removes the search index while the encrypted blob stays on Walrus until its
storage runs out. What hippo can give you is `/export`, a file listing every blob
with its text checked against the hash recorded when it was written.

These are filed with repros at github.com/MystenLabs/MemWal/issues
`[HUMAN: file them before publishing; none is filed yet]`.

### Run it

```bash
git clone https://github.com/UyLeQuoc/walrus-session-8-chatbots
cp .env.example .env && docker compose up -d
bun install && bun run db:push && bun run demo
```

Gemini 2.5 Flash through OpenRouter on the Vercel AI SDK, Walrus Memory on Sui
mainnet, and a lot of measuring.
