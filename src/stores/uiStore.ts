import { create } from 'zustand'

interface UIState {
  activeBlock: string | null
  setActiveBlock: (block: string | null) => void
}

export const useUIStore = create<UIState>(set => ({
  activeBlock: null,
  setActiveBlock: (block) => set({ activeBlock: block }),
}))
