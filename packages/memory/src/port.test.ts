/**
 * Reading both scopes after someone takes ownership.
 *
 * Without this, `/connect` was the moment a person's memory disappeared: guest
 * memories live in hippo's account under `hippo-guest:<id>`, owned memories in
 * the user's own account under `hippo`, and nothing read both. Three documents
 * claimed dual-read was built. It was not.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryScope } from "./client.ts";

const recalls: Array<{ namespace: string; query: string }> = [];
let byNamespace: Record<string, Array<{ blob_id: string; distance: number }>> = {};
let failing: string | null = null;

vi.mock("./client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client.ts")>()),
  createClient: (scope: MemoryScope) => ({ __namespace: scope.namespace }),
}));

vi.mock("./policy.ts", () => ({
  recallRelevant: async (
    client: { __namespace: string },
    input: { query: string; limit?: number },
  ) => {
    const ns = client.__namespace;
    recalls.push({ namespace: ns, query: input.query });
    if (failing === ns) throw new Error(`relayer said no for ${ns}`);
    return (byNamespace[ns] ?? []).map((m) => ({ ...m, text: `from ${ns}`, parsed: null }));
  },
  rememberWithDedupe: async () => ({ status: "accepted", jobId: "j", blobId: null }),
}));

const { createMemoryPort } = await import("./port.ts");

const owned: MemoryScope = {
  mode: "owned",
  key: "a".repeat(64),
  accountId: `0x${"1".repeat(64)}`,
  serverUrl: "https://relayer.example",
  namespace: "hippo",
};
const guest: MemoryScope = {
  mode: "guest",
  key: "b".repeat(64),
  accountId: `0x${"2".repeat(64)}`,
  serverUrl: "https://relayer.example",
  namespace: "hippo-guest:person-1",
};

const port = () => createMemoryPort({ scope: owned, by: "uy", channel: "web", alsoRead: [guest] });

beforeEach(() => {
  recalls.length = 0;
  byNamespace = {};
  failing = null;
});

describe("recall after taking ownership", () => {
  it("returns memories from before the user owned anything", async () => {
    byNamespace = {
      hippo: [{ blob_id: "new", distance: 0.4 }],
      "hippo-guest:person-1": [{ blob_id: "old", distance: 0.2 }],
    };
    const hits = await port().recall({ query: "what do you know" });
    expect(hits.map((h) => h.blob_id)).toEqual(["old", "new"]);
  });

  it("reads the two scopes one after another, never at once", async () => {
    byNamespace = { hippo: [], "hippo-guest:person-1": [] };
    await port().recall({ query: "q" });
    // Concurrent recalls make the relayer drop matches (SPIKES §H). The order
    // matters less than the fact that there are two separate sequential calls.
    expect(recalls.map((r) => r.namespace)).toEqual(["hippo", "hippo-guest:person-1"]);
  });

  it("does not lose the owned account when the old scope fails", async () => {
    byNamespace = { hippo: [{ blob_id: "new", distance: 0.3 }] };
    failing = "hippo-guest:person-1";
    const hits = await port().recall({ query: "q" });
    expect(hits.map((h) => h.blob_id)).toEqual(["new"]);
  });

  it("does not return the same blob twice", async () => {
    byNamespace = {
      hippo: [{ blob_id: "same", distance: 0.3 }],
      "hippo-guest:person-1": [{ blob_id: "same", distance: 0.9 }],
    };
    const hits = await port().recall({ query: "q" });
    expect(hits).toHaveLength(1);
    // The better score wins, which is the one from the account they own.
    expect(hits[0]?.distance).toBe(0.3);
  });

  it("honours the caller's limit across both scopes", async () => {
    byNamespace = {
      hippo: [
        { blob_id: "a", distance: 0.1 },
        { blob_id: "b", distance: 0.5 },
      ],
      "hippo-guest:person-1": [{ blob_id: "c", distance: 0.2 }],
    };
    const hits = await port().recall({ query: "q", limit: 2 });
    expect(hits.map((h) => h.blob_id)).toEqual(["a", "c"]);
  });

  it("leaves a guest-only port reading exactly one scope", async () => {
    byNamespace = { "hippo-guest:person-1": [{ blob_id: "old", distance: 0.2 }] };
    const solo = createMemoryPort({ scope: guest, by: "uy", channel: "web" });
    await solo.recall({ query: "q" });
    expect(recalls).toHaveLength(1);
  });
});
