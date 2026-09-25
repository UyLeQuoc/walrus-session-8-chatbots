import { Link, Outlet } from "react-router";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="site-header border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="lockup" wordSize={18} />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              a chatbot that remembers you, and the memory is yours
            </span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              chat
            </Link>
            <Link to="/me" className="hover:text-foreground">
              my memory
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="site-main mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
