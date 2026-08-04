import { useLayoutEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

interface HeaderState {
  showBack: boolean
  backPath?: string | number
  setBack: (showBack: boolean, backPath?: string | number) => void
}

const useHeaderStore = create<HeaderState>((set) => ({
  showBack: false,
  backPath: undefined,
  setBack: (showBack, backPath) => set({ showBack, backPath }),
}))

/** 配置持久化的 Header 返回按钮 */
export function useHeaderBack(showBack = false, backPath?: string | number) {
  const setBack = useHeaderStore((s) => s.setBack)
  useLayoutEffect(() => {
    setBack(showBack, backPath)
  }, [showBack, backPath, setBack])
}

/** 供 Header 消费该 store 的 Hook */
export function useHeaderState() {
  return useHeaderStore(
    useShallow((s) => ({ showBack: s.showBack, backPath: s.backPath }))
  )
}
