import { create } from 'zustand'

// ====== 类型 ======

export interface ClosedTab {
  id: string          // 唯一 ID
  url: string
  title: string
  favIconUrl?: string
  closedAt: number    // 关闭时间戳
  groupName?: string  // 所属分组
}

export interface PendingClose {
  tabId: number
  url: string
  title: string
  favIconUrl?: string
  windowId: number
  expiresAt: number   // 超时时间戳
}

// ====== 配置 ======

const STORAGE_HISTORY = 'tabflow_close_history'
const STORAGE_PENDING_CONFIG = 'tabflow_pending_config'

export interface PendingConfig {
  enabled: boolean
  /** 灰色暂留时长（分钟），默认 5 */
  delayMinutes: number
  /** 关闭历史保留天数，默认 7 */
  historyDays: number
}

export const DEFAULT_PENDING_CONFIG: PendingConfig = {
  enabled: true,
  delayMinutes: 5,
  historyDays: 7,
}

export async function getPendingConfig(): Promise<PendingConfig> {
  const result = await chrome.storage.local.get(STORAGE_PENDING_CONFIG)
  const raw = (result[STORAGE_PENDING_CONFIG] as Record<string, unknown>) || {}
  // 迁移旧版本配置：delaySeconds → delayMinutes
  if (raw.delaySeconds !== undefined && raw.delayMinutes === undefined) {
    raw.delayMinutes = Math.max(1, Math.round((raw.delaySeconds as number) / 60))
    delete raw.delaySeconds
    await chrome.storage.local.set({ [STORAGE_PENDING_CONFIG]: raw })
  }
  return (raw as unknown as PendingConfig).delayMinutes !== undefined
    ? (raw as unknown as PendingConfig)
    : DEFAULT_PENDING_CONFIG
}

export async function savePendingConfig(config: PendingConfig) {
  await chrome.storage.local.set({ [STORAGE_PENDING_CONFIG]: config })
}

// ====== 关闭历史 Store ======

interface CloseHistoryStore {
  history: ClosedTab[]
  loaded: boolean
  load: () => Promise<void>
  addToHistory: (tab: ClosedTab) => void
  clearHistory: () => void
  clearOlderThan: (days: number) => Promise<void>
}

export const useCloseHistoryStore = create<CloseHistoryStore>((set, get) => ({
  history: [],
  loaded: false,

  load: async () => {
    const result = await chrome.storage.local.get(STORAGE_HISTORY)
    const history: ClosedTab[] = (result[STORAGE_HISTORY] as ClosedTab[]) || []
    set({ history, loaded: true })
  },

  addToHistory: (tab) => {
    const next = [tab, ...get().history]
    // 限制最多 5000 条
    if (next.length > 5000) next.length = 5000
    set({ history: next })
    chrome.storage.local.set({ [STORAGE_HISTORY]: next })
  },

  clearHistory: () => {
    set({ history: [] })
    chrome.storage.local.set({ [STORAGE_HISTORY]: [] })
  },

  clearOlderThan: async (days) => {
    const cutoff = Date.now() - days * 86400000
    const filtered = get().history.filter((t) => t.closedAt > cutoff)
    set({ history: filtered })
    chrome.storage.local.set({ [STORAGE_HISTORY]: filtered })
  },
}))
