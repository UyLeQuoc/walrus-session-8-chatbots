# Team memory, verified on production

Run against https://hippo-server-production.up.railway.app on 2026-09-24 with
two separate guest identities, A and B, who share nothing but a team.

## It works

```
A: /team new Platform
   → Started "Platform". Share this code … TBCJ26

A: /team remember We deploy on Fridays only after the 2pm freeze.
   → Added to "Platform". Everyone in the team can recall it from now on.

B: /team join TBCJ26
   → Joined "Platform". Your own memory stays yours and is not shared.

B: When can we deploy?
   recalled [decision]: We deploy on Fridays only after the 2pm freeze.
   → You can deploy on Fridays after 2 PM.
```

B was never told this. It came from the team's namespace in hippo's account.

## Personal memory does not leak, which is the part that matters

```
B: My home address is 14 Keppel Road and my cat is called Mochi.
   → Got it. I've stored your home address …

A: What is my teammate's address and pet name?
   → I have not been told your teammate's address or pet name.
```

A and B were in the same team at the time. Ordinary conversation is written to
the speaker's own namespace and never to the team's; only `/team remember` puts
anything shared. Getting this the other way round, where joining a team quietly
starts broadcasting whatever you say, is the obvious design and would have been
a privacy incident waiting for its first user.

## Leaving stops reads, and says what it cannot undo

```
B: /team leave
   → Left "Platform". I will not read or write its memory for you any more.
     What you already put in stays: a memory on Walrus cannot be deleted, so
     the team keeps it. Only add things to a team you are willing to leave
     behind.

B: When can we deploy?
   → I cannot answer that. I do not have access to your deployment schedule.
```

That second paragraph is not decoration. A memory cannot be deleted
(`docs/issues/09`), so a clean exit is not on offer and the command says so at
the moment somebody is deciding.

## What is deliberately not solved

The team does not own its memory. It lives in hippo's account under
`hippo-team:<id>`, exactly as a guest's does. Shared memory the members owned
would need an account somebody holds the keys to, and deciding who that is
between colleagues is a product question, not an implementation one. `/team` and
`/privacy` say this rather than letting the word "team" imply otherwise.

One team per person, twelve members, invite codes of six characters that last
ten minutes and work once.
