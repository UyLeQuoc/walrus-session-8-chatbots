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
import { ConnectPage } from "./connect.tsx";
import { MePage } from "./me.tsx";
import { NotFoundPage } from "./not-found.tsx";

/**
 * The chat transport is real network; what we care about is what each state
 * paints. `chatMessages` lets a test put the page into "there is a conversation"
 * without a server.
 */
let chatMessages: unknown[] = [];
let chatStatus = "ready";
const chatSend = vi.fn();
vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: chatMessages,
    sendMessage: chatSend,
    status: chatStatus,
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

/**
 * dapp-kit reaches for wallet APIs that jsdom has no notion of.
 *
 * `wallet` stands in for a connected one. Registering a real wallet-standard
 * wallet would additionally exercise dapp-kit's discovery, which is not our
 * code; what has never run is the connect page's own orchestration, and that is
 * what these stand-ins let us drive.
 */
let wallet: { address: string } | null = null;
const signAndExecute = vi.fn(async () => ({ digest: "0xdigest" }));
const suiClientStub: { core: Record<string, unknown>; getBalance?: unknown } = { core: {} };

vi.mock("@mysten/dapp-kit", () => ({
  ConnectModal: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
  useCurrentAccount: () => wallet,
  useSignAndExecuteTransaction: () => ({ mutateAsync: signAndExecute }),
  useSignPersonalMessage: () => ({ mutateAsync: vi.fn(async () => ({ signature: "sig" })) }),
  useSignTransaction: () => ({ mutateAsync: vi.fn(async () => ({ signature: "sig" })) }),
  useSuiClient: () => suiClientStub,
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
  chatStatus = "ready";
  chatSend.mockClear();
  wallet = null;
  signAndExecute.mockClear();
  suiClientStub.core = {};
  suiClientStub.getBalance = undefined;
  // jsdom here has neither storage; the examples must survive without one.
  const session = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => void session.set(k, v),
    removeItem: (k: string) => void session.delete(k),
  });
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
  // The landing headline animates on view. Never firing is the right default
  // here: it leaves the text in its scrambled state, which is exactly the case
  // where the assertions below must still find the real words.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
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

  it("discloses that memories go to a public network before inviting a message", () => {
    // The same promise the /start message makes on Telegram. A visitor should
    // not have to run a command to find out what happens to what they type.
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const seen = container.textContent ?? "";
    expect(seen).toMatch(/public storage network/i);
    expect(seen).toMatch(/anyone can download/i);
    expect(seen).toMatch(/seven months/i);
    expect(seen).toMatch(/\/memory off/);
    // Forgetting is not deleting, and that has to be said here too.
    expect(seen).toMatch(/cannot delete the bytes early/i);
  });

  it("shows real numbers once they arrive, and links the account", async () => {
    const account = `0x${"ef".repeat(32)}`;
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/stats": { memories: 149, people: 5, accountId: account, network: "mainnet" },
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/149/));
    const seen = container.textContent ?? "";
    expect(seen).toMatch(/memories/);
    expect(seen).toMatch(/5\s*people/);
    // The claim has to be checkable, and it has to say what it counted.
    expect(seen).toMatch(/actually landed on Walrus/i);
    expect(
      screen
        .getByRole("link", { name: new RegExp(account.slice(0, 10), "i") })
        .getAttribute("href"),
    ).toContain(account);
  });

  it("says nothing rather than guessing when the numbers cannot be read", async () => {
    // No /api/stats route, so the stub answers 404. A front page that invents
    // its own evidence is worse than one that shows none.
    vi.stubGlobal("fetch", stubFetch({}));
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/memory you own/i));
    expect(container.textContent ?? "").not.toMatch(/actually landed on Walrus/i);
  });

  it("names the three steps in the order they happen", () => {
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const seen = container.textContent ?? "";
    const order = ["Talk to it", "Take ownership", "Take it away"].map((t) => seen.indexOf(t));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("keeps the headline readable while it is still scrambled", () => {
    // The effect resolves the headline out of noise on first view. The vendored
    // component put the scrambled characters in the screen-reader span, so
    // anyone not watching the animation got gibberish. IntersectionObserver
    // never fires in this environment, so this asserts the worst case: the
    // animation has not run and the real words must still be there.
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const heading = container.querySelector("h1");
    expect(heading?.textContent ?? "").toContain("A chatbot that remembers you, on memory you own");
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

  it("offers something to teach it before there is a conversation", async () => {
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    // One message proves nothing here, so the first set is things to teach it.
    const chip = screen.getByRole("button", { name: /only use pnpm/i });
    expect(screen.queryByRole("button", { name: /Reload, then ask/i })).toBeNull();

    await userEvent.click(chip);
    expect(chatSend).toHaveBeenCalledWith({
      text: "I only use pnpm, and I want short answers in Vietnamese.",
    });
  });

  it("switches to proving it once hippo has answered", () => {
    chatMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "I use pnpm" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Noted." }], metadata: {} },
    ];
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /Reload, then ask/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /only use pnpm/i })).toBeNull();
    // The reload is the whole demonstration, so the page says why.
    expect(container.textContent ?? "").toMatch(/came back from Walrus, not from the page/i);
  });

  it("shows a command's answer without treating it as something taught", () => {
    // Commands used to come back as JSON the chat could not render: /help on
    // the web showed nothing at all. They now stream, marked as commands.
    chatMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "/help" }] },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "/memory            what I remember about you" }],
        metadata: { command: true },
      },
    ];
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    const reply = screen.getByText(/what I remember about you/);
    // Monospace, so the command table's columns line up.
    expect(reply.className).toContain("font-mono");
    expect(screen.queryByRole("button", { name: /Reload, then ask/i })).toBeNull();
  });

  it("bubbles what you said and leaves hippo's answer in the page", () => {
    chatMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "I use pnpm" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Noted." }], metadata: {} },
    ];
    const { container } = render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    // Both sides used to be bubbles, which cramped every long answer and made
    // the two voices compete. Only the user's turn carries one now.
    const bubbles = container.querySelectorAll(".bg-muted.ml-auto, .ml-auto.bg-muted");
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0]?.textContent).toBe("I use pnpm");
    expect(container.textContent ?? "").toMatch(/Noted\./);
  });

  it("shows hippo thinking before the first word arrives", () => {
    chatMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "hello" }] },
      { id: "2", role: "assistant", parts: [], metadata: {} },
    ];
    chatStatus = "submitted";
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status", { name: /thinking/i })).toBeDefined();
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
    // Said once, not on every row: five identical "expires in 209d" was five
    // repetitions of one fact.
    expect(seen).toMatch(/Storage runs out in about 200 days/i);
    expect(seen).not.toMatch(/expires in 200d/i);
    // The blob id is what makes one row different from the next; without it
    // every profile memory written on the same day rendered identically.
    expect(seen).toMatch(/blob123/);
    expect(screen.getAllByRole("button", { name: /copy/i }).length).toBeGreaterThan(0);
    // The explorer link is now the blob id itself rather than the word "blob",
    // so the link names the thing it points at.
    expect(screen.getByRole("link", { name: /blob123/ }).getAttribute("href")).toContain("blob123");
    // Guests are told the memory is not theirs yet, which is the whole pitch.
    expect(seen).toMatch(/under its own account/i);
  });

  it("offers the memory as a file once something has reached Walrus, and says what it holds", async () => {
    const routes = stubFetch({
      "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, surveyUrl: null },
      "/api/me/memories": {
        memories: [
          {
            id: "1",
            type: "profile",
            status: "stored",
            channel: "web",
            createdAt: new Date().toISOString(),
            blobId: "blob123",
            expiresAt: null,
            ciphertextUrl: "https://aggregator.example/v1/blobs/blob123",
            explorerUrl: "https://walruscan.com/mainnet/blob/blob123",
          },
        ],
      },
    });
    const exportFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ coverage: { memories: 1, withText: 1, verified: 1 } }),
      headers: new Headers({
        "content-type": "application/json",
        "content-disposition": 'attachment; filename="hippo-memory-2026-09-24.json"',
      }),
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("/api/me/export") ? exportFetch() : routes(input),
      ),
    );
    // jsdom can neither make object URLs nor follow a download.
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    const full = await screen.findByRole("button", { name: /full record/i });
    // The limit is on the page before anyone downloads, not only inside the file.
    expect(document.body.textContent).toMatch(/cannot do yet: let you decrypt/i);
    full.click();
    await screen.findByText(/verified for/i);
    expect(exportFetch).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("offers no export before anything has reached Walrus", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, surveyUrl: null },
        "/api/me/memories": { memories: [] },
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.textContent ?? "").toMatch(/My memory/));
    expect(screen.queryByRole("button", { name: /full record/i })).toBeNull();
  });

  it("shows the team and what it holds without naming anyone, and leaves only on a second click", async () => {
    const base = stubFetch({
      "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, surveyUrl: null },
      "/api/me/memories": { memories: [] },
      "/api/me/team": {
        team: {
          name: "Platform",
          memberCount: 3,
          memories: [
            {
              id: "t1",
              type: "decision",
              status: "stored",
              createdAt: new Date().toISOString(),
              blobId: "teamblob1",
              explorerUrl: "https://walruscan.com/mainnet/blob/teamblob1",
              mine: true,
            },
            {
              id: "t2",
              type: "gotcha",
              status: "failed",
              createdAt: new Date().toISOString(),
              blobId: null,
              explorerUrl: null,
              mine: false,
            },
          ],
        },
      },
    });
    const posted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        if (init?.method === "POST") {
          posted.push(path);
          const body = path.endsWith("/invite")
            ? { code: "K7QX2M", expiresInMinutes: 10 }
            : { left: "Platform" };
          return { ok: true, status: 200, json: async () => body } as Response;
        }
        return base(input);
      }),
    );
    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await screen.findByText("Team: Platform");
    const seen = document.body.textContent ?? "";
    expect(seen).toMatch(/3 members/);
    expect(seen).toMatch(/2 shared, 1 added by you/);
    expect(seen).toMatch(/a teammate/);
    // A failed team write is visible now; it used to vanish after "Added".
    expect(seen).toMatch(/never reached Walrus/);
    expect(seen).toMatch(/no member owns it yet/);

    screen.getByRole("button", { name: "Invite" }).click();
    await screen.findByText("K7QX2M");

    screen.getByRole("button", { name: "Leave the team" }).click();
    await screen.findByText(/What you added stays with the team/);
    expect(posted.some((p) => p.endsWith("/leave"))).toBe(false);
    screen.getByRole("button", { name: "Leave" }).click();
    await waitFor(() => expect(posted.some((p) => p.endsWith("/api/me/team/leave"))).toBe(true));
  });

  it("explains how to start a team when there is none", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, surveyUrl: null },
        "/api/me/memories": { memories: [] },
        "/api/me/team": { team: null },
      }),
    );
    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await screen.findByText("Team memory");
    expect(document.body.textContent).toMatch(/\/team new <name>/);
  });

  it("hides one memory from its row, and shows a hidden one as hidden rather than gone", async () => {
    const row = (id: string, blobId: string, hidden: boolean) => ({
      id,
      type: "profile",
      status: "stored",
      channel: "web",
      createdAt: new Date().toISOString(),
      blobId,
      expiresAt: null,
      ciphertextUrl: `https://aggregator.example/v1/blobs/${blobId}`,
      explorerUrl: `https://walruscan.com/mainnet/blob/${blobId}`,
      hidden,
    });
    const base = stubFetch({
      "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, surveyUrl: null },
      "/api/me/memories": { memories: [row("1", "keepblob1", false), row("2", "gonebl0b2", true)] },
    });
    const posted: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("/api/me/memories/visibility")) {
          posted.push(JSON.parse(String(init?.body)));
          return { ok: true, status: 200, json: async () => ({}) } as Response;
        }
        return base(input);
      }),
    );
    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );
    await screen.findByText("use again");
    expect(screen.getByText("hidden")).toBeTruthy();
    screen.getByRole("button", { name: "hide" }).click();
    await waitFor(() => expect(posted).toEqual([{ blobId: "keepblob1", hidden: true }]));
  });

  it("warns on a memory that is nearly gone, where the row is the right place", async () => {
    const soon = new Date(Date.now() + 9 * 86_400_000).toISOString();
    vi.stubGlobal(
      "fetch",
      stubFetch({
        "/api/me": { mode: "guest", signedIn: false, memoryEnabled: true, namespace: "ns" },
        "/api/me/memories": {
          memories: [
            {
              id: "1",
              type: "profile",
              status: "stored",
              channel: "web",
              createdAt: new Date().toISOString(),
              blobId: "blobSoon",
              expiresAt: soon,
              ciphertextUrl: "https://aggregator.example/v1/blobs/blobSoon",
              explorerUrl: "https://walruscan.com/mainnet/blob/blobSoon",
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
    await waitFor(() => expect(container.textContent ?? "").toMatch(/expires in 9d/i));
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

describe("an address that is not a page", () => {
  it("says so and offers a way back, rather than rendering nothing", () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(container.textContent ?? "").toMatch(/Nothing here/i);
    // Expired connect links are the likeliest way somebody lands here.
    expect(container.textContent ?? "").toMatch(/expire after ten minutes/i);
    expect(screen.getByRole("link", { name: /go to the chat/i })).toBeDefined();
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

describe("connect flow, driven end to end with a stand-in wallet", () => {
  const OWNER = `0x${"11".repeat(32)}`;
  const ACCOUNT = `0x${"22".repeat(32)}`;
  const REGISTRY = `0x${"33".repeat(32)}`;
  const TABLE = `0x${"44".repeat(32)}`;

  /** A registry whose table resolves to ACCOUNT only after `appearsAfter` looks. */
  function chainWith({ appearsAfter }: { appearsAfter: number }) {
    let looks = 0;
    return {
      getObject: async () => ({ object: { json: { accounts: { id: TABLE } } } }),
      getDynamicField: async () => {
        looks += 1;
        if (looks <= appearsAfter) return null;
        return {
          dynamicField: {
            value: { bcs: btoa(String.fromCharCode(...new Uint8Array(32).fill(0x22))) },
          },
        };
      },
    };
  }

  const token = {
    kind: "connect" as const,
    publicKey: "ab".repeat(32),
    label: "hippo (web:uy)",
    accountId: null,
  };
  const config = {
    network: "mainnet",
    relayerUrl: "https://relayer.example",
    packageId: `0x${"55".repeat(32)}`,
    registryId: REGISTRY,
  };

  function stub(routes: Record<string, unknown>, onDone?: (body: unknown) => Response) {
    const inner = stubFetch({ "/api/connect/": token, "/api/config": config, ...routes });
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/done")) {
        return onDone
          ? onDone(init?.body)
          : ({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
      }
      // No sponsor service in a test, so every sponsorship attempt fails and the
      // user-paid fallback runs. That fallback is the path that has never
      // executed anywhere, which makes it the one worth driving.
      if (url.includes("/sponsor")) {
        return {
          ok: false,
          status: 502,
          text: async () => '{"error":"no sponsor here"}',
        } as unknown as Response;
      }
      return inner(input);
    });
  }

  function renderConnect(kind: "connect" | "disconnect" = "connect") {
    return render(
      <MemoryRouter initialEntries={[`/${kind}/tok`]}>
        <Routes>
          <Route path={`/${kind}/:token`} element={<ConnectPage kind={kind} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("creates the account, registers the key, and confirms, when the wallet pays", async () => {
    wallet = { address: OWNER };
    suiClientStub.core = chainWith({ appearsAfter: 1 });
    suiClientStub.getBalance = async () => ({ balance: { balance: "100000000" } });
    const done: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      stub({}, (body) => {
        done.push(body);
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
      }),
    );

    const { container } = renderConnect();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /grant access/i })).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: /grant access/i }));

    await waitFor(() => expect(container.textContent ?? "").toMatch(/Your memory is yours/i), {
      timeout: 15_000,
    });
    // create_account then add_delegate_key, both signed by the wallet.
    expect(signAndExecute).toHaveBeenCalledTimes(2);
    // The server is told which account, and never told the wallet address,
    // because it reads the owner off chain instead.
    expect(String(done[0])).toContain(ACCOUNT);
    // Gas came from the user, so the page has to say so.
    expect(container.textContent ?? "").toMatch(/your wallet paid/i);
  }, 20_000);

  it("skips creation when the wallet already owns an account", async () => {
    wallet = { address: OWNER };
    suiClientStub.core = chainWith({ appearsAfter: 0 });
    suiClientStub.getBalance = async () => ({ balance: { balance: "100000000" } });
    vi.stubGlobal("fetch", stub({}));

    renderConnect();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /grant access/i })).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: /grant access/i }));
    await waitFor(() => expect(signAndExecute).toHaveBeenCalled(), { timeout: 15_000 });
    // One transaction, not two: the contract allows one account per address.
    expect(signAndExecute).toHaveBeenCalledTimes(1);
  }, 20_000);

  it("refuses to spend a wallet that cannot pay, and says why", async () => {
    wallet = { address: OWNER };
    suiClientStub.core = chainWith({ appearsAfter: 0 });
    suiClientStub.getBalance = async () => ({ balance: { balance: "0" } });
    vi.stubGlobal("fetch", stub({}));

    const { container } = renderConnect();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /grant access/i })).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: /grant access/i }));

    await waitFor(() => expect(container.textContent ?? "").toMatch(/holds no SUI/i), {
      timeout: 15_000,
    });
    // Never ask a wallet to sign something that will fail on chain.
    expect(signAndExecute).not.toHaveBeenCalled();
  }, 20_000);

  it("keeps retrying confirmation while the node catches up", async () => {
    wallet = { address: OWNER };
    suiClientStub.core = chainWith({ appearsAfter: 0 });
    suiClientStub.getBalance = async () => ({ balance: { balance: "100000000" } });
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      stub({}, () => {
        attempts += 1;
        // The server reads the account off chain and will not see the new key at
        // once, so it answers 409 until it does. Giving up here would leave a
        // user who paid gas in guest mode.
        return attempts < 2
          ? ({ ok: false, status: 409, json: async () => ({ error: "not yet" }) } as Response)
          : ({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
      }),
    );

    const { container } = renderConnect();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /grant access/i })).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: /grant access/i }));
    await waitFor(() => expect(container.textContent ?? "").toMatch(/Your memory is yours/i), {
      timeout: 15_000,
    });
    expect(attempts).toBeGreaterThan(1);
  }, 20_000);

  it("revokes, and will not try when the wallet owns nothing to revoke", async () => {
    wallet = { address: OWNER };
    suiClientStub.getBalance = async () => ({ balance: { balance: "100000000" } });

    suiClientStub.core = chainWith({ appearsAfter: 99 });
    vi.stubGlobal("fetch", stub({}));
    const { container, unmount } = renderConnect("disconnect");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /revoke access/i })).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: /revoke access/i }));
    await waitFor(() =>
      expect(container.textContent ?? "").toMatch(/does not own a Walrus Memory account/i),
    );
    expect(signAndExecute).not.toHaveBeenCalled();
    unmount();

    suiClientStub.core = chainWith({ appearsAfter: 0 });
    vi.stubGlobal("fetch", stub({}));
    const second = renderConnect("disconnect");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /revoke access/i })).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: /revoke access/i }));
    await waitFor(() => expect(second.container.textContent ?? "").toMatch(/Access revoked/i), {
      timeout: 15_000,
    });
    expect(signAndExecute).toHaveBeenCalledTimes(1);
  }, 25_000);
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
