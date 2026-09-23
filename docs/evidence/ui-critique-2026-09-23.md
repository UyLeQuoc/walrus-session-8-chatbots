# What is wrong with these pages

Written from screenshots of production, before changing anything, so the fixes
can be checked against it afterwards.

## /me

**Five memories that look identical.** Four rows read
`profile · 2026-09-22 · web · storage ends in 209 days`, character for
character. A page called "My memory" where you cannot tell one memory from
another is the worst failure here. The text is not in Postgres by design, so the
list can only show metadata, which means **search is the real way to read them
and it is presented as a secondary box below the list**. That is backwards.

**Three different treatments for the same kind of thing.** The summary is a bare
bordered `dl`. "On chain" is a Card with a title and description. "What hippo
wrote", "Read the same memory in Claude Code" and "Commands" are bare `h2`s with
no container at all. Same level in the hierarchy, three different shells.

**The least important value is the most prominent.** `Namespace` renders the
longest string on the page, in mono, and a reader can do nothing with it.
Meanwhile "Stored on Walrus: 5 of 5" is the most load-bearing number and is
phrased so tersely it means nothing: five of five what.

**Nothing is copyable.** The four Claude Code steps are the one thing on the
page a reader is meant to run, and they must be selected by hand.

**Truncated hashes cannot be read.** `0x5a257802b4881641…` appears three times
and there is no way to see the rest short of following the link.

**The commands section is a paragraph.** Six commands, inline, in running prose.
Nothing to scan.

## The chat landing

Better, since it was rebuilt twice. Two things remain: the header is three
undifferentiated text links, and the disclosure box is a hand-rolled bordered
div where a real alert component would carry the right semantics.

## Not yet checked

Narrow viewports. The window resized but the capture kept reporting the old
size, so mobile is unverified rather than verified good.
