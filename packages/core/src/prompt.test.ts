import { describe, expect, it } from "vitest";
import { buildSystemPrompt, type PromptContext } from "./prompt.ts";

const base: PromptContext = {
  channel: "web",
  mode: "guest",
  memoryEnabled: true,
  userHandle: "mai",
  today: "2026-10-02",
  styleHints: [],
};

describe("buildSystemPrompt", () => {
  it("keeps hippo's identity whether memory is on or off", () => {
    for (const memoryEnabled of [true, false]) {
      const prompt = buildSystemPrompt({ ...base, memoryEnabled });
      expect(prompt).toMatch(/you are hippo, not the language model/i);
      expect(prompt).toMatch(/never introduce yourself as Gemini, DeepSeek, Qwen/i);
    }
  });

  it("says the recalled block comes from hippo, not the user, only when memory is on", () => {
    expect(buildSystemPrompt(base)).toMatch(/did not write or paste it/);
    expect(buildSystemPrompt({ ...base, memoryEnabled: false })).not.toMatch(
      /BEGIN_UNTRUSTED_WALRUS_MEMORY/,
    );
  });
});
