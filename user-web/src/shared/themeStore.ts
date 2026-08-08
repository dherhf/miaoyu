import { create } from 'zustand'

type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function applyDark(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

const initialMode = getInitialMode()
const initialIsDark = initialMode === 'system' ? getSystemDark() : initialMode === 'dark'
applyDark(initialIsDark)

// 跟随系统变化时实时更新
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const mode = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
    if (mode === 'system') {
      applyDark(e.matches)
      useThemeStore.setState({ isDark: e.matches })
    }
  })
}

interface ThemeState {
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  cycleMode: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  isDark: initialIsDark,
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    const isDark = mode === 'system' ? getSystemDark() : mode === 'dark'
    applyDark(isDark)
    set({ mode, isDark })
  },
  cycleMode: () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(get().mode) + 1) % order.length]
    get().setMode(next)
  },
}))
