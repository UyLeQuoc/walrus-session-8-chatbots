import { describe, expect, it } from "vitest";
import { toUiMessages } from "./transcript.ts";

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
});
