import { describe, expect, it } from "vitest";
import { enokiConfig } from "./enoki.ts";

describe("enokiConfig", () => {
  it("reads a public Enoki key and a Google client id", () => {
    expect(
      enokiConfig({
        VITE_ENOKI_API_KEY: "enoki_public_abc",
        VITE_GOOGLE_CLIENT_ID: "123-x.apps.googleusercontent.com",
      }),
    ).toEqual({ apiKey: "enoki_public_abc", clientId: "123-x.apps.googleusercontent.com" });
  });

  it("offers no Google sign-in when either value is missing or is the wrong kind", () => {
    expect(enokiConfig({})).toBeNull();
    expect(enokiConfig({ VITE_ENOKI_API_KEY: "enoki_public_abc" })).toBeNull();
    expect(
      enokiConfig({
        VITE_ENOKI_API_KEY: "enoki_private_abc",
        VITE_GOOGLE_CLIENT_ID: "123-x.apps.googleusercontent.com",
      }),
    ).toBeNull();
  });
});
