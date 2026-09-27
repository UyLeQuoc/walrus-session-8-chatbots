import { useEffect, useState } from "react";
import { greetingFor } from "./greeting";

export const GREETING_TICK_MS = 60_000;

export function useGreeting(): string {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), GREETING_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return greetingFor(now);
}
