import { describe, expect, it } from "vitest";
import { applyResolved, toUiMessages } from "./transcript.ts";

describe("toUiMessages", () => {
  it("keeps text and marks commands, and drops a row that is not a message", () => {
    const messages = toUiMessages([
      { id: "u1", role: "user", kind: "turn", text: "hello" },
      { id: "a1", role: "assistant", kind: "command", text: "/help" },
      { id: 1, role: "user", kind: "turn", text: "nope" },
    ]);
    expect(messages).toEqual([
      { id: "u1", role: "user", parts: [{ type: "text", text: "hello" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "/help" }],
        metadata: { command: true },
      },
    ]);
  });

  it("keeps a command table on the assistant reply and drops a link that is not openable", () => {
    const messages = toUiMessages([
      {
        id: "a1",
        role: "assistant",
        kind: "command",
        text: "Mode: owned.",
        table: {
          columns: ["Field", "Value"],
          rows: [
            { cells: ["Namespace", "hippo"], copy: "hippo" },
            { cells: ["Site", "nope"], copy: "http://example.com", href: "http://example.com" },
          ],
        },
      },
    ]);
    expect(messages[0]?.metadata?.table?.rows[0]?.copy).toBe("hippo");
    expect(messages[0]?.metadata?.table?.rows[1]?.href).toBeUndefined();
    expect(messages[0]?.metadata?.table?.rows[1]?.copy).toBe("http://example.com");
  });

  it("keeps citation ids and drops a hidden blob once resolve omits it", () => {
    const messages = toUiMessages([
      {
        id: "a1",
        role: "assistant",
        kind: "turn",
        text: "Noted.",
        cites: [
          { blobId: "blob-keep", type: "profile", distance: 0.2 },
          { blobId: "blob-hidden", type: "profile", distance: 0.4 },
        ],
      },
    ]);
    expect(messages[0]?.metadata?.cites?.map((cite) => cite.blobId)).toEqual([
      "blob-keep",
      "blob-hidden",
    ]);
    const resolved = applyResolved(messages, [
      {
        id: "a1",
        recalled: [{ type: "profile", text: "I use pnpm", relevance: 0.8, blobId: "blob-keep" }],
      },
    ]);
    expect(resolved[0]?.metadata?.cites).toBeUndefined();
    expect(resolved[0]?.metadata?.recalled?.map((item) => item.blobId)).toEqual(["blob-keep"]);
    expect(JSON.stringify(resolved)).not.toContain("blob-hidden");
  });
});
