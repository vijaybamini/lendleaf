import { useEffect } from "react";

/**
 * Tracks the visually visible viewport height (excludes the on-screen keyboard)
 * and exposes it as the CSS custom property `--vvh` on <html>. Falls back to
 * `100dvh` wherever `var(--vvh, 100dvh)` is used when the API is unavailable.
 */
export function useVisibleViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--vvh");
    };
  }, []);
}
