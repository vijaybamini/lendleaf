import React, { createContext, useContext, useEffect, useState } from 'react'

/**
 * Theme type - controls light/dark appearance
 */
export type Theme = 'light' | 'dark'

/**
 * Theme context shape - read-only, follows system preferences
 */
interface ThemeContextType {
  theme: Theme
}

/**
 * Create the theme context with undefined default
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Hook to access the current theme
 * @returns Current theme ('light' or 'dark')
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): Theme {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context.theme
}

/**
 * Hook to get the theme context (for advanced use)
 */
function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * Theme Provider Component
 *
 * Automatically detects and follows the system's dark mode preference.
 * - Reads initial preference from `window.matchMedia('(prefers-color-scheme: dark)')`
 * - Listens for changes to system theme and updates in real-time
 * - Sets `[data-theme="dark"]` attribute on `<html>` element
 * - Initializes theme synchronously before render to avoid flash/flicker
 *
 * Usage:
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
/**
 * Initialize theme synchronously before React render
 * This prevents FOUC (Flash of Unstyled Content)
 */
function initializeThemeSync(): Theme {
  if (typeof window === 'undefined') return 'light'

  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = prefersDark ? 'dark' : 'light'

  // Apply immediately to HTML element
  const htmlElement = document.documentElement
  if (theme === 'dark') {
    htmlElement.setAttribute('data-theme', 'dark')
    htmlElement.classList.add('dark')
  } else {
    htmlElement.removeAttribute('data-theme')
    htmlElement.classList.remove('dark')
  }

  return theme
}

// Initialize on module load (before React renders)
initializeThemeSync()

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'

    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  // Apply theme to HTML element when state changes
  useEffect(() => {
    const htmlElement = document.documentElement

    if (theme === 'dark') {
      htmlElement.setAttribute('data-theme', 'dark')
      htmlElement.classList.add('dark')
    } else {
      htmlElement.removeAttribute('data-theme')
      htmlElement.classList.remove('dark')
    }

    // Store preference in sessionStorage for consistency
    sessionStorage.setItem('theme-preference', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Define listener
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setTheme(newTheme)
    }

    // Add listener (modern API prefers addEventListener)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  )
}
