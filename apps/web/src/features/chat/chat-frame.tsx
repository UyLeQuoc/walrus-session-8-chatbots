/**
 * Full-viewport chat shell, spaced like the shadcn dashboard-01 block:
 * an inset main pane, a padded sidebar group, and a header with the
 * trigger offset and a vertical separator.
 */
import { PanelLeft } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/chat/app-sidebar";

export function ChatFrame({
  title,
  onNewChat,
  children,
}: {
  title: string;
  onNewChat: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.dataset.chatShell = "";
    return () => {
      delete document.documentElement.dataset.chatShell;
    };
  }, []);

  return (
    <SidebarProvider
      className="h-dvh min-h-0"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar onNewChat={onNewChat} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-(--header-height) shrink-0 items-center border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarToggle />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h2 className="min-w-0 flex-1 truncate text-base font-medium">{title}</h2>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * The shared Button's icon slot is size-9, which dwarfs the menu glyphs.
 * This control uses the sidebar's own 16px icon inside a 28px hit target.
 */
function SidebarToggle() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      data-sidebar="trigger"
      aria-label="Toggle Sidebar"
      onClick={toggleSidebar}
      className="-ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <PanelLeft className="size-4" />
    </button>
  );
}
