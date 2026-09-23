/**
 * Anything that is not a route.
 *
 * Without this, react-router matched nothing and rendered nothing, so a typo or
 * an expired link left the header sitting above an empty page. A judge following
 * a stale URL would have seen a site that looks broken rather than one telling
 * them where to go.
 */
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">Nothing here</h1>
      <p className="text-sm text-muted-foreground">
        That address is not a page. If you followed a <code>/connect</code> or{" "}
        <code>/disconnect</code> link, those expire after ten minutes and are single use: run the
        command again in the chat for a fresh one.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/">Go to the chat</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/me">My memory</Link>
        </Button>
      </div>
    </div>
  );
}
