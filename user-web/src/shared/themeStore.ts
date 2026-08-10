import { create } from 'zustand'

/** 主题模式：浅色、深色、跟随系统 */
type ThemeMode = 'light' | 'dark' | 'system'

/** 主题模式在 localStorage 中的存储键名 */
const STORAGE_KEY = 'theme-mode'

/**
 * 检测系统当前是否为深色模式。
 * @returns 系统是否启用了深色主题
 */
function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 从 localStorage 读取初始主题模式。
 * 无存储值时默认为"跟随系统"。
 * @returns 主题模式
 */
function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

/**
 * 应用深色/浅色模式到 document 根元素。
 * 通过切换 CSS class 'dark' 实现 Tailwind CSS 深色模式。
 * @param isDark 是否为深色模式
 */
function applyDark(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

// 初始化主题模式和深色状态
const initialMode = getInitialMode()
const initialIsDark = initialMode === 'system' ? getSystemDark() : initialMode === 'dark'
applyDark(initialIsDark)

// 监听系统主题变化：当模式为"跟随系统"时实时同步
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const mode = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
    if (mode === 'system') {
      applyDark(e.matches)
      useThemeStore.setState({ isDark: e.matches })
    }
  })
}

/** 主题状态接口 */
interface ThemeState {
  /** 当前主题模式 */
  mode: ThemeMode
  /** 当前是否为深色模式 */
  isDark: boolean
  /** 设置主题模式 */
  setMode: (mode: ThemeMode) => void
  /** 循环切换主题模式（浅色 → 深色 → 跟随系统） */
  cycleMode: () => void
}

/**
 * 主题状态 store。
 * 管理主题模式（浅色/深色/跟随系统），持久化到 localStorage。
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  isDark: initialIsDark,

  // 设置主题模式：持久化到 localStorage 并应用 DOM 变化
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    const isDark = mode === 'system' ? getSystemDark() : mode === 'dark'
    applyDark(isDark)
    set({ mode, isDark })
  },

  // 循环切换主题：浅色 → 深色 → 跟随系统 → 浅色
  cycleMode: () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(get().mode) + 1) % order.length]
    get().setMode(next)
  },
}))
