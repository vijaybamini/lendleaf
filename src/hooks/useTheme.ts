import { useEffect, useState } from "react";
import { useTheme } from "@/lib/themeContext";
import { getThemeColors } from "@/lib/themeUtils";

export function useIsDarkMode(): boolean {
  return false;
}

export function useThemeColors(): Record<string, string> {
  const theme = useTheme();
  const [colors, setColors] = useState<Record<string, string>>(() => getThemeColors());

  useEffect(() => {
    // Update colors when theme changes
    setColors(getThemeColors());
  }, [theme]);

  return colors;
}

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
