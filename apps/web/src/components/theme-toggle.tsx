/**
 * Dark mode was already paid for and never switched on: index.css defines a
 * full `.dark` palette and nothing ever added the class, so every visitor got
 * the light theme whatever their system said.
 *
 * Default is the system preference, and an explicit choice is remembered.
 * localStorage can throw in a private window, so every access is guarded and
 * the page renders correctly when it fails.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "hippo.theme";
type Choice = "light" | "dark" | null;

function stored(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => stored() === "dark" || (!stored() && systemPrefersDark()));

  useEffect(() => {
    apply(dark);
  }, [dark]);

  // Follow the system while the reader has not expressed a preference.
  useEffect(() => {
    if (stored() !== null || typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? "dark" : "light");
      } catch {
        // Choice will not survive a reload. The page still looks right now.
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="hover:text-foreground"
    >
      {dark ? "light" : "dark"}
    </button>
  );
}
