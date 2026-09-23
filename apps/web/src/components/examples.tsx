/**
 * Something to click, for somebody who has thirty seconds.
 *
 * The landing told a visitor to "say something about yourself", which is a
 * blank page with extra steps. Worse, one message proves nothing here: hippo's
 * claim is that it remembers across sessions, and you cannot see that without
 * teaching it something, throwing the conversation away, and asking again.
 *
 * So these come in two sets and the page switches between them. Before there is
 * a conversation you get things to teach it. After a reply you get the half
 * that matters: reload, then ask. The reload is the point, because a page with
 * no history cannot be answering from context.
 */
import { Button } from "@/components/ui/button";

export const TEACH: string[] = [
  "I only use pnpm, and I want short answers in Vietnamese.",
  "We settled on Drizzle instead of Prisma for this project.",
  "Postgres runs on 5433 here, because 5432 was already taken.",
];

export const ASK: string[] = [
  "What do you know about me?",
  "Which package manager should I use here?",
  "/proof",
];

/** Survives the reload the demo depends on. Per-browser, never read by hippo. */
const PENDING_KEY = "hippo.pendingAsk";

export function rememberPendingAsk(text: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, text);
  } catch {
    // Private browsing. The reload still works, the box is just empty.
  }
}

export function takePendingAsk(): string | null {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    if (v) sessionStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return null;
  }
}

export function Examples({
  taught,
  onPick,
  onReloadAndAsk,
}: {
  /** True once hippo has answered at least once. */
  taught: boolean;
  onPick: (text: string) => void;
  onReloadAndAsk: (text: string) => void;
}) {
  if (!taught) {
    return (
      <Row label="Try one">
        {TEACH.map((t) => (
          <Chip key={t} onClick={() => onPick(t)}>
            {t}
          </Chip>
        ))}
      </Row>
    );
  }

  return (
    <div className="space-y-1.5">
      <Row label="Now prove it">
        <Chip onClick={() => onReloadAndAsk(ASK[0] as string)}>Reload, then ask what it knows</Chip>
        {ASK.slice(1).map((t) => (
          <Chip key={t} onClick={() => onPick(t)}>
            {t}
          </Chip>
        ))}
      </Row>
      <p className="text-xs text-muted-foreground">
        Reloading throws the conversation away. Anything hippo still knows came back from Walrus,
        not from the page.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-auto whitespace-normal py-1 text-left text-xs font-normal"
    >
      {children}
    </Button>
  );
}
