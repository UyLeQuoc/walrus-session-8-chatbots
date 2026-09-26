import type { CSSProperties } from "react";
import { Outlet, useNavigate } from "react-router";
import { AppSidebar } from "@/app/app-sidebar";
import { ShellContext, useShellState } from "@/app/shell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export function AppLayout() {
  const navigate = useNavigate();
  const { title, setTitle, newChatTick, setNewChatTick } = useShellState();

  const requestNewChat = () => {
    setNewChatTick((n) => n + 1);
    navigate("/");
  };

  return (
    <ShellContext.Provider
      value={{ title, setTitle, newChatTick, requestNewChat }}
    >
      <SidebarProvider
        className="h-dvh min-h-0"
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 60)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as CSSProperties
        }
      >
        <AppSidebar onNewChat={requestNewChat} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <header className="flex h-(--header-height) shrink-0 items-center border-b">
            <div className="flex w-full items-center gap-2 px-2">
              <SidebarTrigger />
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {title}
              </p>
              <ThemeToggle />
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </ShellContext.Provider>
  );
}
