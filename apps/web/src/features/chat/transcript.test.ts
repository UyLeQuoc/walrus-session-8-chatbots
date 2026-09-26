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
});
