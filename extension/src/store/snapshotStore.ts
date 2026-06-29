import { create } from 'zustand'
import type { Snapshot, WindowSnapshot, TabSnapshot } from '../types/snapshot'
import type { GroupConfig } from '../types'

const STORAGE_KEY = 'tabflow_snapshots'

interface SnapshotStore {
  snapshots: Snapshot[]
  loaded: boolean

  load: () => Promise<void>
  save: () => Promise<void>

  /** 保存当前所有窗口和标签页为快照 */
  createSnapshot: (name: string, groups: GroupConfig[]) => Promise<void>

  /** 删除快照 */
  deleteSnapshot: (id: string) => void

  /** 重命名快照 */
  renameSnapshot: (id: string, name: string) => void

  /** 恢复快照：在新窗口中打开 */
  restoreInNewWindow: (id: string) => Promise<void>

  /** 恢复快照：替换当前窗口 */
  restoreReplaceCurrent: (id: string) => Promise<void>
}

export const useSnapshotStore = create<SnapshotStore>((set, get) => ({
  snapshots: [],
  loaded: false,

  load: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const snapshots: Snapshot[] = (result[STORAGE_KEY] as Snapshot[]) || []
    set({ snapshots, loaded: true })
  },

  save: async () => {
    const { snapshots } = get()
    await chrome.storage.local.set({ [STORAGE_KEY]: snapshots })
  },

  createSnapshot: async (name, groups) => {
    const windows = await chrome.windows.getAll({ populate: true })
    const normalWindows = windows.filter((w) => w.type === 'normal')

    const windowSnapshots: WindowSnapshot[] = normalWindows.map((w) => {
      const tabs: TabSnapshot[] = (w.tabs || []).map((tab) => {
        // 查找该标签页的分组
        const groupName = groups.find((g) =>
          g.rules.some((r) => {
            try {
              const hostname = new URL(tab.url || '').hostname
              return hostname.includes(r.pattern) || hostname.endsWith('.' + r.pattern)
            } catch {
              return false
            }
          }),
        )?.name

        return {
          url: tab.url || '',
          title: tab.title || 'Untitled',
          favIconUrl: tab.favIconUrl,
          pinned: tab.pinned,
          groupName,
        }
      })
      return { tabs }
    })

    const totalTabs = windowSnapshots.reduce((sum, ws) => sum + ws.tabs.length, 0)

    const snapshot: Snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      createdAt: Date.now(),
      windows: windowSnapshots,
      tabCount: totalTabs,
    }

    set((s) => ({ snapshots: [snapshot, ...s.snapshots] }))
    get().save()
  },

  deleteSnapshot: (id) => {
    set((s) => ({ snapshots: s.snapshots.filter((sn) => sn.id !== id) }))
    get().save()
  },

  renameSnapshot: (id, name) => {
    set((s) => ({
      snapshots: s.snapshots.map((sn) => (sn.id === id ? { ...sn, name } : sn)),
    }))
    get().save()
  },

  restoreInNewWindow: async (id) => {
    const snapshot = get().snapshots.find((sn) => sn.id === id)
    if (!snapshot) return

    // 收集当前所有已打开的 URL
    const currentTabs = await chrome.tabs.query({})
    const currentUrls = new Set(currentTabs.map((t) => t.url))

    for (const winSnap of snapshot.windows) {
      const urlsToOpen = winSnap.tabs
        .map((t) => t.url)
        .filter((url) => url && !currentUrls.has(url))

      if (urlsToOpen.length > 0) {
        await chrome.windows.create({ url: urlsToOpen, focused: false })
      }
    }
  },

  restoreReplaceCurrent: async (id) => {
    const snapshot = get().snapshots.find((sn) => sn.id === id)
    if (!snapshot) return

    const currentWindow = await chrome.windows.getCurrent()

    // 收集当前所有已打开的 URL（排除当前窗口的标签页）
    const allTabs = await chrome.tabs.query({})
    const allUrls = new Set(allTabs.map((t) => t.url))

    // 先打开第一个窗口的标签页到当前窗口
    if (snapshot.windows.length > 0) {
      const firstWin = snapshot.windows[0]
      const urlsToOpen = firstWin.tabs
        .map((t) => t.url)
        .filter((url) => url && !allUrls.has(url))

      for (const url of urlsToOpen) {
        await chrome.tabs.create({ windowId: currentWindow.id!, url, active: false })
      }
    }

    // 其余窗口在新窗口中打开
    for (let i = 1; i < snapshot.windows.length; i++) {
      const winSnap = snapshot.windows[i]
      const urlsToOpen = winSnap.tabs
        .map((t) => t.url)
        .filter((url) => url && !allUrls.has(url))

      if (urlsToOpen.length > 0) {
        await chrome.windows.create({ url: urlsToOpen, focused: false })
      }
    }
  },
}))
