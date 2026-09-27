import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GREETINGS, greetingFor } from "./greeting";
import { GREETING_TICK_MS, useGreeting } from "./use-greeting";

describe("greeting follows the reader's clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 11, 59, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the morning line and moves to afternoon after noon", () => {
    const { result } = renderHook(() => useGreeting());
    expect(result.current).toBe(greetingFor(new Date()));
    expect(GREETINGS.morning).toContain(result.current);

    act(() => {
      vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
      vi.advanceTimersByTime(GREETING_TICK_MS);
    });

    expect(result.current).toBe(greetingFor(new Date()));
    expect(GREETINGS.afternoon).toContain(result.current);
  });
});
