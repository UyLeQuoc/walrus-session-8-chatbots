/**
 * The public mark in `apps/web/public`. Light pages use the black wordmark and
 * dark pages the white one. Both sit in the tree and the theme class picks
 * which one is shown, so the swap does not wait on a React render.
 *
 * The file is a wide silhouette, so the box follows the artwork instead of
 * squeezing it into a square.
 */
import { cn } from "@/lib/utils";

export function Logo({ className, size = 22 }: { className?: string; size?: number }) {
  const height = size;
  const width = Math.round(size * 1.74);
  const frame = cn("w-auto object-contain", className);
  return (
    <span className="inline-flex items-center" style={{ height }}>
      <img
        src="/logo-black.svg"
        alt="hippo"
        width={width}
        height={height}
        style={{ height }}
        className={cn(frame, "dark:hidden")}
      />
      <img
        src="/logo-white.svg"
        alt="hippo"
        width={width}
        height={height}
        style={{ height }}
        className={cn(frame, "hidden dark:block")}
      />
    </span>
  );
}
