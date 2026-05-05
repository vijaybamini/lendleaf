/**
 * Example Theme-Aware Component
 *
 * This component demonstrates best practices for using the theme system:
 * - Using semantic CSS variables
 * - Responsive to theme changes
 * - Works with both light and dark modes
 */

import { useIsDarkMode, useThemeColor } from '@/hooks/useTheme'

/**
 * Card component with proper theme support
 */
export function ThemedCard() {
  return (
    <div className="p-6 rounded-lg bg-card border border-border shadow-paper">
      <h2 className="text-xl font-serif font-bold text-foreground mb-3">
        Theme-Aware Card
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        This card automatically adapts to light and dark modes using semantic CSS variables.
      </p>
      <ThemedButton />
    </div>
  )
}

/**
 * Button component that responds to theme
 */
function ThemedButton() {
  return (
    <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      Click me
    </button>
  )
}

/**
 * Component that conditionally renders based on theme
 */
export function ThemeIndicator() {
  const isDark = useIsDarkMode()

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-muted-foreground">
      <span className="text-lg">
        {isDark ? '🌙' : '☀️'}
      </span>
      <span className="text-sm font-medium">
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
    </div>
  )
}

/**
 * Component using custom hook to get specific colors
 * Useful for third-party components that need color values
 */
export function CustomColorExample() {
  const { primary, background } = useThemeColor('primary', 'background')

  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <h3 className="font-serif font-bold text-foreground mb-3">
        Custom Color Usage
      </h3>
      <div className="flex gap-3">
        <div
          className="w-12 h-12 rounded border border-border"
          style={{ backgroundColor: primary }}
          title="Primary color"
        />
        <div
          className="w-12 h-12 rounded border border-border"
          style={{ backgroundColor: background }}
          title="Background color"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        <code>Primary:</code> <code>{primary}</code>
      </p>
      <p className="text-xs text-muted-foreground">
        <code>Background:</code> <code>{background}</code>
      </p>
    </div>
  )
}

/**
 * Complete example showing all theme patterns
 */
export function ThemeExamplePage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">
            Theme System Example
          </h1>
          <p className="text-muted-foreground">
            This page demonstrates the automatic dark/light theme system.
            Change your system theme to see it update instantly.
          </p>
        </div>

        {/* Theme indicator */}
        <ThemeIndicator />

        {/* Example cards */}
        <div className="grid gap-4">
          <ThemedCard />
          <ThemedCard />
        </div>

        {/* Color showcase */}
        <CustomColorExample />

        {/* Information */}
        <div className="p-4 bg-muted rounded-lg border border-border">
          <h3 className="font-serif font-bold text-foreground mb-2">
            How it works:
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>No manual theme toggle required</li>
            <li>Follows your system&apos;s dark/light preference</li>
            <li>Updates dynamically when system preference changes</li>
            <li>CSS variables handle all styling (no hardcoded colors)</li>
            <li>WCAG compliant colors with high contrast</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
