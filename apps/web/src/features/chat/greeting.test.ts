import { describe, expect, it } from "vitest";
import { GREETINGS, greetingFor } from "./greeting";

/** A local date at the given hour. `getHours` is what the chat reads. */
function atHour(hour: number): Date {
  return new Date(2026, 0, 15, hour, 30, 0);
}

describe("greeting for the reader's local hour", () => {
  it("uses the morning, afternoon, evening, and night lines", () => {
    expect(greetingFor(atHour(9))).toBe(GREETINGS.morning);
    expect(greetingFor(atHour(14))).toBe(GREETINGS.afternoon);
    expect(greetingFor(atHour(19))).toBe(GREETINGS.evening);
    expect(greetingFor(atHour(23))).toBe(GREETINGS.night);
  });

  it("reads the local hour, not UTC", () => {
    const local = new Date(2026, 5, 1, 9, 0, 0);
    expect(local.getHours()).toBe(9);
    expect(greetingFor(local)).toBe(GREETINGS.morning);
  });
});
