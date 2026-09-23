# M6 pre-flight, checked against production

Everything below was verified against https://hippo-server-production.up.railway.app
and https://hippo-web-ten-nu.vercel.app on 2026-09-23, after deploying.

## Disclosure

`/privacy` answers on production with the full text. The first lines:

```
What happens to what you tell me:

• I decide what is worth keeping and write it to Walrus, a public storage
  network. Each memory is encrypted. Anyone can download the encrypted bytes;
  only the account that owns them can read them.
• Storage is paid per period. A memory written today lasts about seven months,
  then the bytes expire.
```

The web landing carries the same disclosure in a "Before you start" box above
the input, seen in the browser. `/start` carries two sentences of it with
`/memory off` named in the same breath, and `/privacy` is registered with
Telegram so it appears in the command menu.

## Size guard

A 5,000 character message against `/api/chat` on production:

```
That message is 5,000 characters and I cap it at 4,000, which is about a
thousand words. Send the part you want me to read, or split it across a couple
of messages. I would rather say this than answer as if I had read all of it.
```

Refused, not truncated, and the model was never called.

## Capacity

`pnpm capacity` against production:

| | |
|---|---|
| OpenRouter limit | $1.0000 |
| remaining | $0.9607 |
| cost per turn, upper bound | $0.0026 |
| 3 people x 10/day x 7 days | $0.55, fits |
| 5 people x 15/day x 7 days | $1.38, **does not fit** |

Database 8 MB against a 500 MB free tier. Relayer healthy. **The key limit needs
raising before anyone is invited**; it is the first item in `docs/RUNBOOK.md`.

## Not verified here

Failure messages under real outages. The classifier is unit tested against the
error shapes, but nobody has taken OpenRouter down to watch it. The generic
branch is what runs when it cannot tell, which is the safe default.
