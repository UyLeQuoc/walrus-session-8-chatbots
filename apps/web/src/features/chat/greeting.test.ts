import { describe, expect, it } from "vitest";
import { GREETINGS, greetingFor } from "./greeting";

function atHour(hour: number): Date {
  return new Date(2026, 0, 15, hour, 30, 0);
}

describe("greeting for the reader's local hour", () => {
  it("uses the morning, afternoon, evening, and night lines", () => {
    expect(GREETINGS.morning).toContain(greetingFor(atHour(9)));
    expect(GREETINGS.afternoon).toContain(greetingFor(atHour(14)));
    expect(GREETINGS.evening).toContain(greetingFor(atHour(19)));
    expect(GREETINGS.night).toContain(greetingFor(atHour(23)));
  });

  it("reads the local hour, not UTC", () => {
    const local = new Date(2026, 5, 1, 9, 0, 0);
    expect(local.getHours()).toBe(9);
    expect(GREETINGS.morning).toContain(greetingFor(local));
  });

  it("keeps the same line for the same day", () => {
    const morning = new Date(2026, 3, 4, 8, 0, 0);
    const later = new Date(2026, 3, 4, 11, 45, 0);
    expect(greetingFor(morning)).toBe(greetingFor(later));
  });
});
