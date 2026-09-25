/**
 * The chat dashboard: a side rail and a main column that fill the viewport.
 *
 * On a wide window the rail collapses to an icon strip. On a narrow one it
 * leaves the layout entirely and comes back as a drawer, because a 280px
 * column would be the whole screen. There is no conversation list to put in
 * the rail: hippo has no such API, so "new chat" only clears this tab.
 */
import { Library, PanelLeft, SquarePen } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NARROW = "(max-width: 767px)";

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof matchMedia === "function" ? matchMedia(NARROW).matches : false,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia(NARROW);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export function ChatFrame({
  title,
  onNewChat,
  children,
}: {
  title: string;
  onNewChat: () => void;
  children: ReactNode;
}) {
  const narrow = useNarrowViewport();
  const [open, setOpen] = useState(() =>
    typeof matchMedia === "function" ? !matchMedia(NARROW).matches : true,
  );

  // Crossing the breakpoint picks the mode that fits: drawer shut, column open.
  // A later toggle sticks until the width changes again.
  useEffect(() => {
    setOpen(!narrow);
  }, [narrow]);

  useEffect(() => {
    document.documentElement.dataset.chatShell = "";
    return () => {
      delete document.documentElement.dataset.chatShell;
    };
  }, []);

  const expanded = open;

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
      {narrow && open ? (
        <button
          type="button"
          aria-label="Dismiss sidebar"
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        aria-label="Sidebar"
        hidden={narrow && !open}
        className={cn(
          "flex h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground",
          narrow ? "fixed inset-y-0 left-0 z-40 w-[280px] shadow-xl" : open ? "w-[280px]" : "w-12",
        )}
      >
        <div className={cn("flex h-12 items-center px-3", !expanded && "justify-center px-1")}>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Logo size={24} />
            {expanded ? <span className="truncate font-semibold tracking-tight">hippo</span> : null}
          </Link>
          {narrow && open ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
              className="ml-auto"
              onClick={() => setOpen(false)}
            >
              <PanelLeft className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="px-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onNewChat}
            aria-label="New chat"
            className={cn("w-full justify-start gap-2 px-2", !expanded && "justify-center px-0")}
          >
            <SquarePen className="size-4 shrink-0" />
            {expanded ? <span>New chat</span> : null}
          </Button>
        </div>
        {expanded ? (
          <p className="px-4 pt-4 text-xs text-muted-foreground">
            This conversation stays in the tab. What hippo keeps is on Walrus.
          </p>
        ) : null}
        <div className="mt-auto border-t p-2">
          <Link
            to="/me"
            aria-label="My memory"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
              !expanded && "justify-center px-0",
            )}
          >
            <Library className="size-4 shrink-0" />
            {expanded ? <span>My memory</span> : null}
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
          {/* On a narrow screen the open drawer covers this control, so the
              close button lives in the drawer instead. */}
          {narrow && open ? (
            <span className="size-9 shrink-0" />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={open ? "Close sidebar" : "Open sidebar"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <PanelLeft className="size-4" />
            </Button>
          )}
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
          <ThemeToggle />
        </header>
        {children}
      </div>
    </div>
  );
}
