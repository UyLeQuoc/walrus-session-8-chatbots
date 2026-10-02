# [Bug] SKILL.md's dedupe advice and "< 0.25 = duplicate" band make an agent discard corrections

### Surface

Docs

### Network

Mainnet (relayer.memory.walrus.xyz)

### Package version

`SKILL.md` at `main` `1e023585` (2026-10-02). Measured with `@mysten-incubation/memwal@0.1.7` on the hosted mainnet relayer, 2026-09-24.

### What happened?

`SKILL.md` line 345 says to "dedupe before calling `remember()`", and its distance table (line 408) labels `< 0.25` "Duplicate or very close". We followed both. Corrections were then dropped as duplicates of the facts they correct: an embedding does not see negation, and a correction usually names the value it replaces, so it lands inside the duplicate band. The user says something changed, the agent answers "already known", and nothing changes, which is the one behaviour a memory product most needs to get right. #1042 asks for built-in dedupe; this is about the advice that exists.

### Steps to reproduce

1. Store "I use VS Code with vim bindings." and "I promised to ship the billing export by October 3." in a namespace.
2. Before storing each new memory, recall it with `limit: 1` and skip it if the nearest distance is `< 0.25`, as `SKILL.md` suggests.
3. Store the corrections "I moved to Neovim; I no longer use VS Code." and "The billing export deadline moved to October 10, not October 3."

Script used: `packages/memory/scripts/spike-corrections.ts` in https://github.com/UyLeQuoc/walrus-session-8-chatbots (eleven memories, three of them corrections, deduplicated at 0.25).

### Expected

The dedupe advice says that distance does not distinguish "X" from "no longer X", and that a correction should not be deduplicated against the fact it replaces. The recall section points to `created_at` and `recall({ sort: "recent" })` (WALM-383) for newest-wins, which is how "the user changed their mind" is meant to be handled. Neither appears in `SKILL.md`; we found them in the type definitions.

### Actual

| new memory | nearest existing memory | distance |
|---|---|---|
| I moved to Neovim; I no longer use VS Code. | I use VS Code with vim bindings. | **0.243** |
| The billing export deadline moved to October 10, not October 3. | I promised to ship the billing export by October 3. | **0.221** |
| The ledger service is in Rust now. The Go version was retired in August, … | nothing under 0.25 | — |

Two of three corrections were discarded. Only the long one, where the old value is a small share of the text, survived. The same line's other option, "delete the prior entry first", cannot be followed for a current memory (no delete path exists; see the Security Delete reference), and #1060 notes that `restore()` resets `created_at`, which also weakens newest-wins after a restore.

What fixed it for us: deduplicate a correction only against earlier corrections, order recalled memories by `created_at` newest first, and recall corrections explicitly whenever a correctable fact comes back. With that, a fresh session never states the replaced value (our eval asserts it on mainnet).

### Logs or error text

```shell
SKILL.md:345  If you need uniqueness, either dedupe before calling `remember()`, or delete the prior entry first.
SKILL.md:408  | `< 0.25` | Duplicate or very close |
```

### Checks

- [X] I searched existing issues and this is not a duplicate.
- [X] This report contains no private keys, mnemonics, or other secrets.

<!-- hippo (walrus-session-8-chatbots): measured 2026-09-24; SKILL.md lines re-checked 2026-10-03 on main 1e023585. Related: #1042, #968, #976 (different). -->
