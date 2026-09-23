# The demo a judge can do in three clicks

Verified on production, 2026-09-23, on https://hippo-web-ten-nu.vercel.app.

The problem this solves: hippo's claim is that it remembers **across sessions**,
and a single message cannot show that. Before, the page said "say something
about yourself" and left the visitor to work out the rest.

## The path

1. **Click a starter.** "I only use pnpm, and I want short answers in
   Vietnamese." hippo answers and writes what is worth keeping.
2. **Click "Reload, then ask what it knows".** The page reloads. The
   conversation is gone; the question is waiting in the box.
3. **Press Send.**

Step 3 on production, after a reload with an empty transcript:

```
What do you know about me?

Bạn tên là Uy. Bạn triển khai ứng dụng bằng Railway và chỉ dùng pnpm.
Mèo của bạn tên là Bánh Mì. Bạn muốn tôi trả lời bằng tiếng Việt.

recalled 5 memories
```

Nothing was in the page to answer from. The name, the deploy target, the package
manager, the cat and the language all came back from Walrus, and the reply is in
Vietnamese because a `style` memory said so, without being asked in that
session.

The line under the buttons says why the reload matters, so a reader does not
have to be told: "Reloading throws the conversation away. Anything hippo still
knows came back from Walrus, not from the page."

## A note on testing this with the browser tools

Clicking by element reference silently did nothing in that tab: the theme toggle
did not flip, the chips did not fire, and no network request left the page. The
same clicks by coordinate worked immediately. Twice now a UI has looked broken
when the instrument was at fault, so check a control with an obvious visible
effect before believing the page is wrong.
