import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">
            hippo
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              chat
            </Link>
            <Link to="/me" className="hover:text-foreground">
              my memory
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
