/**
 * Render smoke tests.
 *
 * These pages had never been opened in a browser: typecheck and a successful
 * build say nothing about whether a component throws on first paint, which is
 * exactly what a judge clicking the live URL would hit. Each test mounts a page
 * with the network stubbed and asserts something a user would actually see.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../components/layout.tsx";
import { ChatPage } from "./chat.tsx";
import { MePage } from "./me.tsx";

/**
 * The chat transport is real network; what we care about is what each state
 * paints. `chatMessages` lets a test put the page into "there is a conversation"
 * without a server.
 */
let chatMessages: unknown[] = [];
vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: chatMessages,
    sendMessage: vi.fn(),
    status: "ready",
    error: undefined,
  }),
}));

/**
 * What matters is that a failure is reported once and not left on the page.
 * Rendering sonner's own internals under jsdom tests sonner, not hippo.
 */
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m) },
  Toaster: () => null,
}));

/** dapp-kit reaches for wallet APIs that jsdom has no notion of. */
vi.mock("@mysten/dapp-kit", () => ({
  ConnectModal: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
  useCurrentAccount: () => null,
  useSignAndExecuteTransaction: () => ({ mutateAsync: vi.fn() }),
  useSignPersonalMessage: () => ({ mutateAsync: vi.fn() }),
  useSignTransaction: () => ({ mutateAsync: vi.fn() }),
  useSuiClient: () => ({}),
}));

/**
 * Routes are matched on the path, not as a substring of the whole URL.
 *
 * Substring matching looks harmless and is a trap: "/api/me/search?q=x"
 * contains "/api/me", so a test that forgot to stub the search route got the
 * profile object back with `ok: true` and passed while exercising nothing. A
 * key matches only if it is the whole path, or a prefix ending in "/".
 */
function stubFetch(routes: Record<string, unknown>) {
  const keys = Object.keys(routes).sort((a, b) => b.length - a.length);
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).split("?")[0] ?? "";
    const match = keys.find((k) => path === k || (k.endsWith("/") && path.startsWith(k)));
    return {
      ok: match !== undefined,
      status: match === undefined ? 404 : 200,
      json: async () => (match === undefined ? {} : routes[match]),
    } as Response;
  });
}

beforeEach(() => {
  chatMessages = [];
  toastError.mockClear();
  vi.stubGlobal("fetch", stubFetch({}));
  // jsdom has neither of these, and both the toaster and the theme toggle read
  // them on mount. Without them the component throws before it paints.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("chat page", () => {
  it("explains why the project exists, not just how to type", () => {
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const seen = container.textContent ?? "";
    // The claim that makes hippo different, and the two halves of it.
    expect(seen).toMatch(/memory you own/i);
    expect(seen).toMatch(/Take ownership/i);
    expect(seen).toMatch(/Take it away/i);
    expect(screen.getByRole("button", { name: /send/i })).toBeDefined();
  });

  it("links hippo's own account on chain once the config arrives", async () => {
    const account = `0x${"ab".repeat(32)}`;
    vi.stubGlobal("fetch", stubFetch({ "/api/config": { operatorAccountId: account } }));
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    // Asserting the href, because a claim about on-chain ownership that does
    // not actually link the object is the thing this section exists to avoid.
    await waitFor(() => {
      const link = screen.getByRole("link", { name: new RegExp(account.slice(0, 10), "i") });
      expect(link.getAttribute("href")).toContain(account);
    });
  });

  it("drops the landing section once there is a conversation", () => {
    // Keyed off messages.length. Leaving it above a real conversation would
    // push every reply below the fold, which is worse than not having it.
    chatMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "I use pnpm" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Noted." }], metadata: {} },
    ];
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const seen = container.textContent ?? "";
    expect(seen).toMatch(/Noted\./);
    expect(seen).not.toMatch(/memory you own/i);
  });
});

describe("me page", () => {
  it("points an anonymous visitor at the chat instead of showing an empty table", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({ "/api/me": { mode: "anonymous" }, "/api/me/memories": { memories: [] } }),
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
        "/api/me/memories": {
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
        "/api/me/memories": { memories: [] },
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

describe("me page, on chain", () => {
  const account = `0x${"cd".repeat(32)}`;
  const hippoKey = "f0".repeat(32);

  const routes = (mode: "guest" | "owned") => ({
    "/api/me": { mode, signedIn: false, memoryEnabled: true, namespace: "hippo" },
    "/api/me/memories": { memories: [] },
    "/api/me/account": {
      account: {
        accountId: account,
        explorerUrl: `https://suiscan.xyz/mainnet/object/${account}`,
        owner: `0x${"11".repeat(32)}`,
        ownerUrl: `https://suiscan.xyz/mainnet/account/0x${"11".repeat(32)}`,
        active: true,
        yours: mode === "owned",
        delegates: [
          { label: "hippo (web:uy)", publicKeyHex: hippoKey, suiAddress: "0x1", isHippo: true },
          { label: "MCP Client", publicKeyHex: "ab".repeat(32), suiAddress: "0x2", isHippo: false },
        ],
      },
    },
  });

  it("shows the delegate list the contract enforces, and marks hippo's key", async () => {
    vi.stubGlobal("fetch", stubFetch(routes("owned")));
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/Keys that can read/i));
    const seen = container.textContent ?? "";
    expect(seen).toMatch(/hippo \(web:uy\)/);
    expect(seen).toMatch(/MCP Client/);
    // The object must be reachable, or the claim is unverifiable.
    const link = screen.getByRole("link", { name: new RegExp(account.slice(0, 12), "i") });
    expect(link.getAttribute("href")).toContain(account);
  });

  it("offers revoke when the account is yours", async () => {
    vi.stubGlobal("fetch", stubFetch(routes("owned")));
    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /revoke/i })).toBeDefined());
  });

  it("offers ownership instead when the memory is still hippo's", async () => {
    vi.stubGlobal("fetch", stubFetch(routes("guest")));
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /own this memory/i })).toBeDefined(),
    );
    expect(container.textContent ?? "").toMatch(/hippo's own account/i);
  });

  it("keeps the explorer link when the object cannot be read", async () => {
    // A node hiccup must not make the page claim there is no account.
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/me": { mode: "owned", signedIn: false, memoryEnabled: true, namespace: "hippo" },
        "/api/me/memories": { memories: [] },
        "/api/me/account": {
          account: {
            accountId: account,
            explorerUrl: `https://suiscan.xyz/mainnet/object/${account}`,
            unreadable: true,
          },
        },
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/could not be read/i));
    expect(screen.getByRole("link", { name: new RegExp(account.slice(0, 12), "i") })).toBeDefined();
  });
});

describe("me page, finding a memory", () => {
  const rows = (type: string, id: string) => ({
    id,
    type,
    status: "stored" as const,
    channel: "web",
    createdAt: new Date().toISOString(),
    blobId: `blob${id}`,
    expiresAt: null,
    ciphertextUrl: `https://aggregator.example/v1/blobs/blob${id}`,
    explorerUrl: `https://walruscan.com/mainnet/blob/blob${id}`,
  });

  const base = {
    "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, namespace: "hippo-guest:a" },
    "/api/me/memories": { memories: [rows("profile", "1"), rows("style", "2")] },
  };

  it("filters the list by type without asking the server", async () => {
    vi.stubGlobal("fetch", stubFetch(base));
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "style" })).toBeDefined());
    const rowCount = () => container.querySelectorAll("ul li").length;
    expect(rowCount()).toBe(2);

    await userEvent.click(screen.getByRole("button", { name: "style" }));
    expect(screen.getByRole("button", { name: "style" }).getAttribute("aria-pressed")).toBe("true");
    // The row is gone, not just the chip highlighted. Local filter, no request.
    expect(rowCount()).toBe(1);
    expect(container.textContent ?? "").toMatch(/style/);
  });

  it("reads the words back from Walrus when you search", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({
        ...base,
        "/api/me/search": {
          results: [
            {
              text: "Uy deploys with Railway.",
              type: "profile",
              relevance: 0.72,
              blobId: "blobX",
              explorerUrl: "https://walruscan.com/mainnet/blob/blobX",
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
    await waitFor(() => expect(screen.getByLabelText(/search your memory/i)).toBeDefined());
    await userEvent.type(screen.getByLabelText(/search your memory/i), "how do I deploy");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));

    // The text is the whole point: it cannot come from Postgres, only Walrus.
    await waitFor(() => expect(container.textContent ?? "").toMatch(/Uy deploys with Railway\./));
    expect(container.textContent ?? "").toMatch(/relevance 0\.72/);
  });

  it("surfaces a failed search as a toast instead of a stale red line", async () => {
    // A real failure shape: the relayer answers 502 with a message, which is
    // what the user should be told rather than "something went wrong".
    const inner = stubFetch(base);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/me/search")) {
          return {
            ok: false,
            status: 502,
            json: async () => ({ error: "Search failed: Walrus Memory is unreachable." }),
          } as Response;
        }
        return inner(input);
      }),
    );
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<MePage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText(/search your memory/i)).toBeDefined());
    await userEvent.type(screen.getByLabelText(/search your memory/i), "anything");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/Search failed/i)),
    );
  });

  it("says so when a search finds nothing rather than showing an empty box", async () => {
    vi.stubGlobal("fetch", stubFetch({ ...base, "/api/me/search": { results: [] } }));
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText(/search your memory/i)).toBeDefined());
    await userEvent.type(screen.getByLabelText(/search your memory/i), "sailing");
    await userEvent.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => expect(container.textContent ?? "").toMatch(/Nothing close to that/i));
  });
});

describe("theme", () => {
  /**
   * This jsdom has no localStorage, which is also why `lib/api.ts` guards every
   * access. The toggle must work with it and without it, so the tests supply a
   * minimal one rather than pretending the guard is unnecessary.
   */
  function fakeStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    };
  }

  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    vi.stubGlobal("localStorage", fakeStorage());
    // jsdom has no matchMedia; without it the toggle cannot read the system.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  const mount = () =>
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>hello</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  it("applies the dark class and remembers the choice", async () => {
    mount();
    // The palette existed in index.css and nothing ever switched it on.
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: /switch to dark/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("hippo.theme")).toBe("dark");
  });

  it("honours a stored choice over the system preference", () => {
    localStorage.setItem("hippo.theme", "dark");
    mount();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByRole("button", { name: /switch to light/i })).toBeDefined();
  });

  it("follows the system when nothing is stored", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    mount();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("connect page", () => {
  it("says who pays for gas before asking for a wallet", async () => {
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
    // Sponsorship is preferred but not guaranteed, so the page has to promise
    // the user they will be told before their own wallet is charged.
    await waitFor(() => expect(container.textContent ?? "").toMatch(/sponsors the gas/i));
    expect(container.textContent ?? "").toMatch(/your wallet pays instead/i);
    expect(screen.getByRole("button", { name: /connect your sui wallet/i })).toBeDefined();
  });
});
