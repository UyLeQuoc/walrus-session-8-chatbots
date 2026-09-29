import { describe, expect, it } from "vitest";
import { cardsFromMessages, keepPolling, STATUS_POLL_LIMIT_MS, writeLabel } from "./remembered.ts";

describe("remembered cards", () => {
  const now = 1_000_000;

  it("polls a pending write for two minutes, then says it is still writing", () => {
    const pending = {
      status: "pending" as const,
      saved: true,
      startedAt: now,
      now,
      hidden: false,
    };
    expect(keepPolling(pending)).toBe(true);
    expect(writeLabel(pending)).toBe("writing");
    const late = { ...pending, now: now + STATUS_POLL_LIMIT_MS };
    expect(keepPolling(late)).toBe(false);
    expect(writeLabel(late)).toBe("still writing");
    expect(keepPolling({ ...pending, status: "stored" })).toBe(false);
    expect(writeLabel({ ...pending, status: "stored" })).toBe("on Walrus");
    expect(writeLabel({ ...pending, saved: false })).toBe("already knew");
  });

  it("reads the fact from the tool part and does not invent a second fact", () => {
    const cards = cardsFromMessages(
      [
        {
          id: "a1",
          parts: [
            {
              type: "tool-remember",
              state: "output-available",
              input: { type: "profile", text: "I use pnpm" },
              output: { saved: true, indexId: "11111111-1111-4111-8111-111111111111" },
            },
          ],
        },
      ],
      now,
      () => now,
    );
    expect(cards).toEqual([
      {
        key: "11111111-1111-4111-8111-111111111111",
        type: "profile",
        text: "I use pnpm",
        saved: true,
        status: "pending",
        startedAt: now,
        hidden: false,
        indexId: "11111111-1111-4111-8111-111111111111",
      },
    ]);
  });
});
