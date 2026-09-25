import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/** True when the viewport is narrower than the sidebar's desktop column. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return !!isMobile;
}
