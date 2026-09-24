# Slash commands in the web chat did nothing

Checked 2026-09-24 in Chrome against a local server (bot tokens blanked) and the
mainnet relayer.

## Before

Typing `/help` in the web chat showed the user's bubble and nothing else: no
reply, no toast, nothing in the console. The server had answered:

```
<-- POST /api/chat
--> POST /api/chat 200 13ms
```

The route answered every command, the size guard and the rate limit with JSON.
That suits the CLI. The web chat's `useChat` reads the response as a UI message
stream, finds no events in a JSON body, and renders nothing, without an error.
So on the web `/help`, `/memory`, `/connect`, `/export`, `/team` and the rest
were all silent, while the landing page tells a newcomer to "Type /help for the
commands, or /connect to move it to your own". A web user over the rate limit,
or sending an oversized message, also got no answer at all.

No test caught it: the page tests stub `useChat`, and the server tests never
spoke the stream protocol. It took a real browser.

## After

`apps/server/src/reply.ts` answers the web with a one-message UI stream and the
CLI with JSON, which also carries `/export`'s files. Command answers are marked
with `messageMetadata: { command: true }`, so the page no longer treats `/help`
as something taught and switches its examples to "Reload, then ask what it knows".

In Chrome, a fresh guest:

```
/help     → the full command list, rendered as hippo's reply
/memory   → "I have not written anything about you yet. Tell me something worth keeping."
/export   → "Nothing to export yet: I have not written anything about you."
```

and a guest with four stored memories:

```
/export   → "4 memories. Text recovered for 4 of them, and 4 match the fingerprint
             I recorded when I wrote them. Download it from the Export button on …/me."
```

After `/help` the examples still read "Try one", not "Now prove it".

Tests: `apps/server/src/reply.test.ts` checks both shapes and the metadata, and
`apps/web/src/pages/pages.test.tsx` checks a command's answer renders without
counting as taught.

A note for anyone repeating this in Chrome through automation: the first
keystrokes after a page reload were repeatedly lost, and the server log showed
no request. Focusing the input first, then checking the text was in it before
pressing Enter, made every attempt reliable. That was the tool, not the page.
