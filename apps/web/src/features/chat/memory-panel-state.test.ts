import { describe, expect, it } from "vitest";
import { panelOpen, parsePanelChoice } from "./memory-panel-state.ts";

describe("memory panel choice", () => {
  it("opens on the first visit and stays closed after the person closes it", () => {
    expect(parsePanelChoice(null)).toBeNull();
    expect(panelOpen(null)).toBe(true);
    expect(panelOpen("closed")).toBe(false);
    expect(panelOpen("open")).toBe(true);
    expect(parsePanelChoice("nope")).toBeNull();
  });
});
