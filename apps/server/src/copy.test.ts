/**
 * These assert promises, not wording.
 *
 * Every claim below is one a person could act on, or be harmed by not knowing.
 * The disclosure exists because somebody is about to invite friends to talk to
 * this, and none of them should learn from an article afterwards that what they
 * said is on a public network for seven months.
 */
import { describe, expect, it } from "vitest";
import { HELP, PRIVACY, welcome } from "./copy.ts";

describe("first contact", () => {
  it("tells a new user their words go to a public network, before they speak", () => {
    const start = welcome();
    expect(start).toMatch(/public/i);
    expect(start).toMatch(/encrypted/i);
    // The opt-out has to be in the first message, not one command deeper.
    expect(start).toMatch(/\/memory off/);
  });

  it("does not bury the disclosure under the pitch", () => {
    const start = welcome();
    const disclosure = start.search(/written to Walrus/i);
    expect(disclosure).toBeGreaterThan(-1);
    // Last line is the invitation to talk; the warning must come before it.
    expect(disclosure).toBeLessThan(start.lastIndexOf("just talk to me"));
  });

  it("keeps the survey optional and last", () => {
    expect(welcome()).not.toMatch(/helps a lot/);
    const withSurvey = welcome("https://example.com/s");
    expect(withSurvey).toMatch(/https:\/\/example\.com\/s/);
    expect(withSurvey.indexOf("https://example.com/s")).toBeGreaterThan(
      withSurvey.indexOf("just talk to me"),
    );
  });
});

describe("/privacy", () => {
  it("states the four things a person cannot find out for themselves", () => {
    // Where it goes, who can fetch it, how long it lasts, and what is public.
    expect(PRIVACY).toMatch(/Walrus/);
    expect(PRIVACY).toMatch(/anyone can download/i);
    expect(PRIVACY).toMatch(/seven months/i);
    expect(PRIVACY).toMatch(/visible on Sui/i);
  });

  it("admits the part that reflects badly on us", () => {
    // Forgetting is not deleting. Leaving this out would be the easy choice and
    // would make the ownership claim dishonest; see docs/issues/09.
    expect(PRIVACY).toMatch(/stay on Walrus until they expire/i);
    expect(PRIVACY).toMatch(/including me/i);
  });

  it("offers a way out in the same breath", () => {
    expect(PRIVACY).toMatch(/\/memory off/);
  });
});

describe("/help", () => {
  it("lists /privacy, so the disclosure is reachable later", () => {
    expect(HELP).toMatch(/\/privacy/);
  });

  it("lists every command a user can act on", () => {
    for (const cmd of [
      "/memory",
      "/privacy",
      "/link",
      "/whoami",
      "/proof",
      "/connect",
      "/disconnect",
    ]) {
      expect(HELP).toContain(cmd);
    }
  });
});
