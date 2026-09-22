/**
 * Render smoke tests.
 *
 * These pages had never been opened in a browser: typecheck and a successful
 * build say nothing about whether a component throws on first paint, which is
 * exactly what a judge clicking the live URL would hit. Each test mounts a page
 * with the network stubbed and asserts something a user would actually see.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPage } from "./chat.tsx";
import { MePage } from "./me.tsx";

/** dapp-kit reaches for wallet APIs that jsdom has no notion of. */
vi.mock("@mysten/dapp-kit", () => ({
  ConnectModal: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
  useCurrentAccount: () => null,
  useSignPersonalMessage: () => ({ mutateAsync: vi.fn() }),
  useSignTransaction: () => ({ mutateAsync: vi.fn() }),
  useSuiClient: () => ({}),
}));

function stubFetch(routes: Record<string, unknown>) {
  // Longest key first, so `/api/me/memories` is not swallowed by `/api/me`.
  const keys = Object.keys(routes).sort((a, b) => b.length - a.length);
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = keys.find((k) => url.includes(k));
    return {
      ok: match !== undefined,
      status: match === undefined ? 404 : 200,
      json: async () => (match === undefined ? {} : routes[match]),
    } as Response;
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", stubFetch({}));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("chat page", () => {
  it("tells a first-time visitor what to do", () => {
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const seen = container.textContent ?? "";
    expect(seen).toMatch(/remembers across sessions/i);
    // The three-step invitation is the whole first impression.
    expect(seen).toMatch(/Reload this page/i);
    expect(screen.getByRole("button", { name: /send/i })).toBeDefined();
  });
});

describe("me page", () => {
  it("points an anonymous visitor at the chat instead of showing an empty table", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({ "/api/me": { mode: "anonymous" }, "/memories": { memories: [] } }),
    );
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/start remembering you/i));
  });

  it("shows a guest their memories, with storage expiry and a blob link", async () => {
    const soon = new Date(Date.now() + 200 * 86_400_000).toISOString();
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/me": {
          mode: "guest",
          signedIn: false,
          memoryEnabled: true,
          namespace: "hippo-guest:abc",
          surveyUrl: null,
        },
        "/memories": {
          memories: [
            {
              id: "1",
              type: "profile",
              status: "stored",
              channel: "web",
              createdAt: new Date().toISOString(),
              blobId: "blob123",
              expiresAt: soon,
              ciphertextUrl: "https://aggregator.example/v1/blobs/blob123",
              explorerUrl: "https://walruscan.com/mainnet/blob/blob123",
            },
          ],
        },
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/profile/));
    const seen = container.textContent ?? "";
    expect(seen).toMatch(/storage ends in 200 days/i);
    expect(screen.getByRole("link", { name: "blob" })).toBeDefined();
    // Guests are told the memory is not theirs yet, which is the whole pitch.
    expect(seen).toMatch(/under its own account/i);
  });

  it("offers wallet sign-in when the browser is not signed in", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, namespace: "ns" },
        "/memories": { memories: [] },
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/Already own your memory/i));
  });
});

describe("connect page", () => {
  it("explains that gas is sponsored before asking for a wallet", async () => {
    const { ConnectPage } = await import("./connect.tsx");
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/connect/": {
          kind: "connect",
          publicKey: "ab".repeat(32),
          label: "hippo (web:uy)",
          accountId: null,
        },
        "/api/config": {
          network: "mainnet",
          relayerUrl: "https://r",
          packageId: "0x1",
          registryId: "0x2",
        },
      }),
    );
    const { container } = render(
      <MemoryRouter initialEntries={["/connect/tok"]}>
        <Routes>
          <Route path="/connect/:token" element={<ConnectPage kind="connect" />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/Gas is sponsored/i));
    expect(screen.getByRole("button", { name: /connect your sui wallet/i })).toBeDefined();
  });
});
