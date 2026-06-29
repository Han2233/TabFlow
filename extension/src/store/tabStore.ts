import { create } from 'zustand'
import type { WindowInfo } from '../types'
import { getAllWindows } from '../utils/tabs'

interface TabStore {
  windows: WindowInfo[]
  loading: boolean
  refresh: () => Promise<void>
}

export const useTabStore = create<TabStore>((set) => ({
  windows: [],
  loading: true,

  refresh: async () => {
    const windows = await getAllWindows()
    set({ windows, loading: false })
  },
}))
