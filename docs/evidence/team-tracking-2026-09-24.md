# Team writes are tracked, and team memory is on /me

Found while building the export (`docs/evidence/export-2026-09-24.md`):
`/team remember` wrote through a port with no `onWrite`, so a team fact left no
row in `memory_index`. hippo told the person "Added" and never learned whether
the write reached Walrus, and nobody had a list of what they gave a team.

## The change

- The team port records writes with the same function as a person's own port,
  under the person who added the fact, in the team's namespace.
- **Evidence stays conservative.** `pnpm evidence` leaves team namespaces out of
  every per-person number, so shared facts cannot help meet "3 people with 10
  memories each", and reports them on their own line.
- `/memory`, `/whoami`, `/memory forget` and the list on `/me` count and act on
  the person's own memory only. `forget` no longer deletes index rows for team
  facts it does not make unrecallable.
- The export includes what the person added to a team, marked `team`, and says
  that teammates' facts and anything from before this change are not in it.
- `/me` has a team section: name, member count, the shared memories with type,
  age and blob, marked "you" or "a teammate" and never by name, an invite
  button, and a leave button that asks first.

## Measured on mainnet, through a local server

```
› Started "Billing".
› Added to "Billing". Everyone in the team can recall it from now on.
waiting 70s…

/api/me/team: {"name":"Billing","members":1,"memories":[{"type":"decision","status":"stored","mine":true,"blob":true}]}
/api/me/memories (own only): profile:stored
/memory → 1 memories (profile 1).
export coverage: {"memories":2,"withText":2,"verified":2,"stillWriting":0,"neverLanded":0}
  team verified  [decision] Refunds over 500 USD need a second approver.
  own  verified  [profile] I'm Quan. I look after the billing service.
```

and `pnpm evidence` on the same database:

```
Memories stored on Walrus:       8
Team memories, not counted above: 1 in 1 teams, from 1 people
```

The team write settled to `stored` with a blob id, which is the check that did
not exist before.
