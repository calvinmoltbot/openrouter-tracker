'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  darkMode: boolean
  toggleTheme: () => void
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: 'dark',
  darkMode: true,
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeCtx)
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('or_theme')
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('or_theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeCtx.Provider value={{ theme, darkMode: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}
