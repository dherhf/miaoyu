import { useLayoutEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

/** Header 返回按钮状态接口 */
interface HeaderState {
  /** 是否显示返回按钮 */
  showBack: boolean
  /** 返回路径：字符串则导航到指定路径，数字则后退 N 步 */
  backPath?: string | number
  /** 设置返回按钮状态 */
  setBack: (showBack: boolean, backPath?: string | number) => void
}

// 全局 Header 状态 store（跨页面共享返回按钮配置）
const useHeaderStore = create<HeaderState>((set) => ({
  showBack: false,
  backPath: undefined,
  setBack: (showBack, backPath) => set({ showBack, backPath }),
}))

/**
 * 配置 Header 返回按钮的 Hook。
 * 页面组件调用此 Hook 来控制返回按钮的显示与行为。
 * @param showBack 是否显示返回按钮，默认 false
 * @param backPath 返回路径，字符串则导航到指定路径，数字则后退对应步数
 */
export function useHeaderBack(showBack = false, backPath?: string | number) {
  const setBack = useHeaderStore((s) => s.setBack)
  useLayoutEffect(() => {
    setBack(showBack, backPath)
  }, [showBack, backPath, setBack])
}

/** 供 Header 消费该 store 的 Hook，返回返回按钮的显示状态和路径 */
export function useHeaderState() {
  return useHeaderStore(
    useShallow((s) => ({ showBack: s.showBack, backPath: s.backPath }))
  )
}
