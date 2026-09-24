import { describe, expect, it } from "vitest";
import { buildMemoryText, parseMemoryText } from "./format.ts";
import { redactCredentials } from "./redact.ts";

describe("memory text format", () => {
  it("drops our own tags when the model copies them into the fact", () => {
    // Seen on mainnet 2026-09-24: a recalled prefix pasted back into remember.
    const line = buildMemoryText({
      type: "style",
      by: "mai",
      channel: "demo",
      date: new Date("2026-09-24"),
      text: "[by:@mai] [#demo] [2026-09-24] Please keep your answers short.",
    });
    expect(line).toBe("[style] [by:@mai] [#demo] [2026-09-24] Please keep your answers short.");
  });

  it("keeps a bracket that is not one of ours", () => {
    const line = buildMemoryText({
      type: "gotcha",
      by: "uy",
      date: new Date("2026-09-24"),
      text: "[WIP] branches never deploy to staging",
    });
    expect(line).toBe("[gotcha] [by:@uy] [2026-09-24] [WIP] branches never deploy to staging");
  });

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
