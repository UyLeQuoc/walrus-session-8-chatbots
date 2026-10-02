import { gatherContext } from "@hippo/core";
import type { MemoryPort } from "@hippo/memory";
import { describe, expect, it, vi } from "vitest";
import { memoryOffTurn } from "./compare.ts";

describe("memoryOffTurn", () => {
  it("answers the same messages without recalling, remembering or a session pull", async () => {
    const recall = vi.fn(async () => []);
    const port = {
      scope: { mode: "guest", namespace: "t", key: "", accountId: "", serverUrl: "" },
      recall,
      remember: vi.fn(),
      flush: async () => {},
    } as unknown as MemoryPort;
    const messages = [{ role: "user" as const, content: "which package manager?" }];
    const turn = memoryOffTurn({
      model: {} as never,
      port,
      messages,
      channel: "web",
      userHandle: "mai",
    });
    expect(turn.memoryEnabled).toBe(false);
    expect(turn.sessionStart).toBeUndefined();
    expect(turn.document).toBeUndefined();
    expect(turn.messages).toBe(messages);
    expect(await gatherContext(turn)).toEqual({ injected: [], styleHints: [] });
    expect(recall).not.toHaveBeenCalled();
  });
});
