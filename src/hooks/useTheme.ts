import { useEffect, useState } from "react";
import { useTheme } from "@/lib/themeContext";
import { getThemeColors, isDarkMode } from "@/lib/themeUtils";

/**
 * Hook to check if dark mode is currently active
 * Updates whenever the theme changes
 *
 * @returns true if dark mode is active
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isDark = useIsDarkMode()
 *   return <div>{isDark ? '🌙' : '☀️'}</div>
 * }
 * ```
 */
export function useIsDarkMode(): boolean {
  const theme = useTheme();
  return theme === "dark";
}

/**
 * Hook to get all theme color tokens
 * Useful for passing theme colors to charting libraries or custom components
 *
 * @returns Object containing all semantic color variables
 *
 * @example
 * ```tsx
 * function Chart() {
 *   const colors = useThemeColors()
 *   return (
 *     <MyChart
 *       primaryColor={colors.primary}
 *       backgroundColor={colors.background}
 *     />
 *   )
 * }
 * ```
 */
export function useThemeColors(): Record<string, string> {
  const theme = useTheme();
  const [colors, setColors] = useState<Record<string, string>>(() => getThemeColors());

  useEffect(() => {
    // Update colors when theme changes
    setColors(getThemeColors());
  }, [theme]);

  return colors;
}

/**
 * Hook to get specific theme color values
 * More efficient than `useThemeColors` when you only need a few colors
 *
 * @param colorNames - Names of colors to retrieve (without '--color-' prefix)
 * @returns Object with requested color values
 *
 * @example
 * ```tsx
 * function Button() {
 *   const { primary, 'primary-foreground': primaryText } = useThemeColor('primary', 'primary-foreground')
 *   return <button style={{ background: primary, color: primaryText }} />
 * }
 * ```
 */
export function useThemeColor(...colorNames: string[]): Record<string, string> {
  const theme = useTheme();
  const [colors, setColors] = useState<Record<string, string>>(() => {
    const allColors = getThemeColors();
    return colorNames.reduce(
      (acc, name) => {
        acc[name] = allColors[name] || "";
        return acc;
      },
      {} as Record<string, string>,
    );
  });

  useEffect(() => {
    const allColors = getThemeColors();
    const selected = colorNames.reduce(
      (acc, name) => {
        acc[name] = allColors[name] || "";
        return acc;
      },
      {} as Record<string, string>,
    );
    setColors(selected);
  }, [theme, colorNames.join(",")]);

  return colors;
}
