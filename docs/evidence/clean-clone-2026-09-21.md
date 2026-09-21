# Clean-clone check — 2026-09-21

Judging criterion three is "could someone clone the repository and run it?", so
this was done the way a reviewer would: a fresh clone into an empty directory, a
fresh database, and only the commands the README lists.

```
git clone <repo> hippo-clean && cd hippo-clean
cp .env.example .env         # filled with real credentials
createdb hippo_clean         # pointed DATABASE_URL at it
pnpm install                 # 4.8s
pnpm db:push                 # ✓ Changes applied
pnpm typecheck               # 5 successful, 5 total
pnpm test                    # 3 passed
pnpm build                   # 1 successful
pnpm smoke                   # reached mainnet, printed the account and agents
```

Checked at the same time:

- `memwal/` is absent from the clone, as intended. It is a reference copy of
  MystenLabs/MemWal and is gitignored; `CLAUDE.md` has the one command to restore it.
- `.env` is absent from the clone. Only `.env.example` ships.
- 348 tracked files.

`pnpm smoke` output from the clean clone:

```
relayer   : https://relayer.memory.walrus.xyz (ok, 0.1.0)
account   : 0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5
agent id  : f07169b63a377f86902696bf295997e3b2183043edd6024b4fc86907dfb85fa2
owner     : 0xf8a4da3a751fba566508deb5166196ec5530602a924b3b0c132963e98188fb04
```

`pnpm demo` and `pnpm hippo` additionally need `OPENROUTER_API_KEY`; `pnpm smoke`
and the schema commands need only the Walrus Memory credentials.
