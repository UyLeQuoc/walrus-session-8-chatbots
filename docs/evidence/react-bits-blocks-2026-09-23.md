# Which React Bits Pro blocks fit hippo

Surveyed against the licence rather than guessed at. The short answer is that
the App UI blocks are mockups of other products, and hippo's pages are wired to
live data, so almost none of them are reuse.

## What the catalogue actually contains

Measured by fetching each item from the registry and reading its source.

| item | lines | takes props | hardcoded data arrays | height contract |
|---|---|---|---|---|
| `ai-chat-1` | 590 | no | 3 | `min-h-[640px]` |
| `ai-chat-4` | 699 | no | 3 | `min-h-[640px]` |
| `prompt-input-1` | 887 | no | 6 | `min-h-[560px]` |
| `prompt-input-3` | 201 | no | 2 | `min-h-[480px]` |
| `empty-state-1` | 159 | no | 7 | `min-h-[640px]` |
| `empty-state-3` | 109 | no | 7 | `min-h-[560px]` |
| `card-1` | 170 | no | 6 | `min-h-[560px]` |
| `card-5` | 178 | no | 6 | `min-h-[560px]` |

Against the components in the other registry, which carry **zero** hardcoded
data arrays and exist to be passed props. That is the difference in one number.

## Why that rules them out here

`empty-state-3` is the smallest and the closest in purpose to hippo's landing.
It opens with hardcoded support-desk content:

```
const TODAY = [{ label: "Resolved", value: "14" }, …]
const NEXT  = [{ title: "3 tickets waiting on the customer", … }]
```

and ships its own `cx` helper duplicating our `cn`, its own `--rb-*` radius and
accent tokens, and hardcoded `neutral-*` colours instead of the semantic ones
this app uses everywhere. Adopting it means deleting the content, the tokens,
the helper and the colours, which leaves a flex container.

`ai-chat-1` is the tempting one, since hippo is a chat. It is 590 lines of
hardcoded conversation with no props. Wiring it would mean stripping its
messages, adding `useChat`, re-adding the `tool-remember` and `tool-recall` part
rendering, re-adding the recalled-memories panel, removing its height contract
and rewriting its `text-[13px]` scale. The component it would replace is about
120 lines, is covered by tests, and has been verified in production.

## What was used, and why those two did fit

- `DecryptedText`, a **component**: takes props, no hardcoded content, and says
  something true about the project. In use on the landing headline.
- `how-it-works-5`, a **marketing block**: used for its layout idea only, a
  numbered sequence, then rewritten to this codebase's tokens as the library's
  own guidance instructs. What survived is the shape, not the styling.

## When a block would be worth it

If hippo ever grows a page that is mostly presentation with content we control,
a marketing block is a reasonable starting point, and the harmonization rules in
the skill are good. The App UI blocks would fit a dashboard built from scratch.
Neither describes a chat wired to a live model and a relayer.
