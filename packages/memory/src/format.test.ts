import { describe, expect, it } from "vitest";
import { buildMemoryText, parseMemoryText } from "./format.ts";
import { redactCredentials } from "./redact.ts";

describe("memory text format", () => {
  it("round-trips", () => {
    const line = buildMemoryText({
      type: "gotcha",
      by: "@uy",
      channel: "#backend",
      date: new Date("2026-09-25"),
      text: "AI SDK v6 needs  specificationVersion v3",
    });
    expect(line).toBe(
      "[gotcha] [by:@uy] [#backend] [2026-09-25] AI SDK v6 needs specificationVersion v3",
    );
    const parsed = parseMemoryText(line);
    expect(parsed).toEqual({
      type: "gotcha",
      tags: { by: "uy", channel: "backend" },
      date: "2026-09-25",
      text: "AI SDK v6 needs specificationVersion v3",
    });
  });
  it("rejects unknown types", () => {
    expect(parseMemoryText("[banana] [2026-01-01] x")).toBeNull();
  });
});

describe("redact", () => {
  it("strips keys but keeps the fact", () => {
    const r = redactCredentials(
      "my key is sk-or-abcdefghijklmnopqrstuvwxyz123456 and I prefer pnpm",
    );
    expect(r.text).toContain("I prefer pnpm");
    expect(r.text).not.toContain("sk-or-abc");
    expect(r.removed.length).toBeGreaterThan(0);
  });
});
