# Memory made visible in the chat — 2026-09-22

Judging criterion one asks whether memory is doing real work. From the text
alone, memory working and the model guessing look identical: the bot simply
sounds like it knows you. So every assistant reply now carries the memories it
was built from, and the page shows them under the answer.

The server attaches them as message metadata on the stream's `start` event:

```json
"messageMetadata": {
  "recalled": [
    {"type":"profile","text":"my dog is called Mochi","relevance":0.46,
     "blobId":"sSON47uP-NTVEGXMuhx_tSCVaQTpSGls2lsYPor5U5k"},
    {"type":"profile","text":"my editor is Neovim","relevance":0.39,
     "blobId":"SC96pfU-H5EZy-CyYn3Cf30KgFoXXKYDty0-e0F7M7o"}
  ]
}
```

In the page that renders as a single line under the reply, `recalled 2
memories`, which expands to the memories themselves with a link to each
encrypted blob on Walrus. So a claim about remembering is checkable in the
moment, not only afterwards through `/proof`.

The conversation above was a fresh session with no history, and the facts were
taught earlier, so "Mochi" and "Neovim" could only have come from Walrus.
