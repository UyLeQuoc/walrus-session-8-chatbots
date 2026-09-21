# Cross-channel memory — verified 2026-09-21

One person, two channels, one memory. No wallet required for the link.

```
[web] "Remember: my editor is Neovim and my dog is called Mochi."
      → 2 memories written  (blobs sSON47uP-NTV…, SC96pfU-H5EZ…)

[cli] "What is my dog called?"           (before linking)
      → "I don't know your dog's name."

[web] /link
      → "Your link code is DSCBJ9."

[cli] /link DSCBJ9
      → "Linked. This channel and the one that gave you the code now share the same memory."

[cli] "What is my dog called and which editor do I use?"
      → "Your dog is called Mochi and you use Neovim."

[cli] /memory
      → 2 memories (profile 2).
         • [profile] 2026-09-21 · blob sSON47uP-N…
         • [profile] 2026-09-21 · blob SC96pfU-H5…
```

The facts were written from the web chat and recalled from the CLI, from a
conversation that had never heard them. The memory is in Walrus, not in either
client.

Wallet sign-in performs the same merge through a stronger proof, so a person who
runs `/connect` on Telegram and signs in on the web is also one person.
