# The article's integration snippet, run as written

`docs/article-final.md` shows a newcomer the three SDK calls hippo makes. They
were run exactly as printed, against the mainnet relayer, in a scratch guest
namespace, on 2026-09-25 with `@mysten-incubation/memwal` 0.1.7:

```ts
const memwal = MemWal.create({ key, accountId, serverUrl, namespace });

const { job_id } = await memwal.remember("[profile] [by:@mai] [2026-09-25] Only uses pnpm.", namespace);
await memwal.waitForRememberJob(job_id);

const { results } = await memwal.recall({ query: userMessage, namespace, limit: 6 });
```

```
namespace hippo-guest:article-snippet-muftekge
job ffce00d7-b6c2-4882-b8fd-0266a895812f, stored and recalled after 37.7s
  distance 0.650  [profile] [by:@mai] [2026-09-25] Only uses pnpm.
```

These are the calls in `packages/memory/src/client.ts` (`MemWal.create`) and
`packages/memory/src/policy.ts` (`remember`, `waitForRememberJob`, `recall`).
hippo runs the wait in the background rather than awaiting it in a turn.
