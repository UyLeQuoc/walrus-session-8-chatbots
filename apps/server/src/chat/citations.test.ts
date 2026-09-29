import { describe, expect, it } from "vitest";
import {
  citationsOf,
  dropHidden,
  factsFromLookup,
  packTurnBody,
  unpackTurnBody,
} from "./citations.ts";

describe("turn citations", () => {
  const cite = { blobId: "blob-keep", type: "profile", distance: 0.2 };

  it("stores blob id, type, and distance, and not the memory text", () => {
    const raw = packTurnBody("Noted.", [cite]);
    expect(raw).not.toContain("I use pnpm");
    expect(unpackTurnBody(raw)).toEqual({ text: "Noted.", cites: [cite] });
  });

  it("leaves a plain answer as text", () => {
    expect(unpackTurnBody("Hello.")).toEqual({ text: "Hello.", cites: [] });
    expect(unpackTurnBody('{"ok":true}')).toEqual({ text: '{"ok":true}', cites: [] });
  });

  it("drops a hidden blob and a blob recall did not return", () => {
    const cites = [cite, { blobId: "blob-hidden", type: "profile", distance: 0.4 }];
    const visible = dropHidden(cites, new Set(["blob-hidden"]));
    expect(visible.map((item) => item.blobId)).toEqual(["blob-keep"]);
    expect(factsFromLookup(visible, new Map([["blob-keep", "I use pnpm"]]))).toEqual([
      { type: "profile", text: "I use pnpm", relevance: 0.8, blobId: "blob-keep" },
    ]);
    expect(factsFromLookup(visible, new Map())).toEqual([]);
  });

  it("builds citations from what the turn injected, without the fact text", () => {
    const injected = [
      {
        blob_id: "blob-keep",
        distance: 0.25,
        text: "I use pnpm",
        parsed: { type: "profile" },
      },
    ];
    const cites = citationsOf(injected);
    expect(cites).toEqual([{ blobId: "blob-keep", type: "profile", distance: 0.25 }]);
    expect(JSON.stringify(cites)).not.toContain("pnpm");
  });
});
