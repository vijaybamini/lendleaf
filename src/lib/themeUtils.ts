/**
 * Theme Utilities
 * Helper functions for theme-related operations
 */

/**
 * Get the current system theme preference
 * @returns 'light' or 'dark' based on system preference
 */
export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

/**
 * Get a CSS variable value from the root element
 * @param variableName - Name of the CSS variable (with or without --)
 * @returns The computed value of the CSS variable
 *
 * @example
 * ```tsx
 * const primaryColor = getCSSVariable('--color-primary')
 * console.log(primaryColor) // "oklch(0.42 0.09 145)"
 * ```
 */
export function getCSSVariable(variableName: string): string {
  if (typeof window === "undefined") return "";

  const name = variableName.startsWith("--") ? variableName : `--${variableName}`;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Set a CSS variable value on the root element
 * @param variableName - Name of the CSS variable (with or without --)
 * @param value - The value to set
 *
 * @example
 * ```tsx
 * setCSSVariable('--color-primary', 'oklch(0.5 0.1 150)')
 * ```
 */
export function setCSSVariable(variableName: string, value: string): void {
  if (typeof window === "undefined") return;

  const name = variableName.startsWith("--") ? variableName : `--${variableName}`;
  document.documentElement.style.setProperty(name, value);
}

/**
 * Watch for changes to system theme preference
 * @param callback - Function called when theme preference changes
 * @returns Cleanup function to stop watching
 *
 * @example
 * ```tsx
 * const unwatch = watchSystemTheme((theme) => {
 *   console.log('Theme changed to:', theme)
 * })
 *
 * // Later...
 * unwatch()
 * ```
 */
export function watchSystemTheme(callback: (theme: "light" | "dark") => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };

  mediaQuery.addEventListener("change", handleChange);

  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}

/**
 * Check if dark mode is currently active
 * @returns true if dark mode is active, false otherwise
 */
export function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;

  const htmlElement = document.documentElement;
  return (
    (htmlElement.hasAttribute("data-theme") && htmlElement.getAttribute("data-theme") === "dark") ||
    htmlElement.classList.contains("dark")
  );
}

/**
 * Get all semantic color tokens as an object
 * Useful for passing theme colors to third-party libraries
 *
 * @returns Object containing all semantic color variables
 *
 * @example
 * ```tsx
 * const colors = getThemeColors()
 * console.log(colors.primary) // "oklch(0.42 0.09 145)"
 * ```
 */
export function getThemeColors(): Record<string, string> {
  const colorNames = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "border",
    "input",
    "ring",
  ] as const;

  const colors: Record<string, string> = {};

  for (const name of colorNames) {
    colors[name] = getCSSVariable(`--color-${name}`);
  }

  return colors;
}

/**
 * Check if a color variable would have sufficient contrast
 * Simple approximation - for critical accessibility needs, use proper contrast checkers
 *
 * @param foreground - CSS color value
 * @param background - CSS color value
 * @returns Simple contrast score (very approximate)
 */
export function checkColorContrast(foreground: string, background: string): number {
  // This is a simplified check - for real WCAG compliance, use proper tools
  if (typeof window === "undefined") return 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  ctx.fillStyle = foreground;
  ctx.fillRect(0, 0, 1, 1);
  const fgData = ctx.getImageData(0, 0, 1, 1).data;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1, 1);
  const bgData = ctx.getImageData(0, 0, 1, 1).data;

  // Very simplified luminance calculation
  const fgLum = (fgData[0] * 299 + fgData[1] * 587 + fgData[2] * 114) / 1000;
  const bgLum = (bgData[0] * 299 + bgData[1] * 587 + bgData[2] * 114) / 1000;

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}
