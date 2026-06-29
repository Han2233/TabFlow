import { getPendingConfig, DEFAULT_PENDING_CONFIG } from '../store/closeHistoryStore'
import { useCloseHistoryStore } from '../store/closeHistoryStore'

/** 正在软关闭的标签页 */
type PendingInfo = { tabId: number; url: string; title: string; favIconUrl?: string; windowId: number; expiresAt: number; timer: ReturnType<typeof setTimeout> }
const pendingMap = new Map<number, PendingInfo>()

export function getPendingCloseIds(): Set<number> {
  return new Set(pendingMap.keys())
}

export function getPendingInfo(tabId: number): PendingInfo | undefined {
  return pendingMap.get(tabId)
}

export function cancelPendingClose(tabId: number) {
  const info = pendingMap.get(tabId)
  if (info) {
    clearTimeout(info.timer)
    pendingMap.delete(tabId)
  }
}

export function forceClose(tabId: number) {
  const info = pendingMap.get(tabId)
  if (info) {
    clearTimeout(info.timer)
    pendingMap.delete(tabId)
    chrome.tabs.remove(tabId)
  }
}

/** 软关闭一个标签页，返回是否进入了暂留模式 */
export async function softCloseTab(
  tabId: number,
  url: string,
  title: string,
  favIconUrl: string | undefined,
  windowId: number,
): Promise<boolean> {
  const config = await getPendingConfig()
  // 防御旧配置：旧版本用 delaySeconds，新版本用 delayMinutes
  const delayMinutes = (() => {
    const raw = config as unknown as Record<string, unknown>
    if (typeof raw.delayMinutes === 'number' && raw.delayMinutes > 0) return raw.delayMinutes
    if (typeof raw.delaySeconds === 'number' && raw.delaySeconds > 0) return Math.max(1, Math.round(raw.delaySeconds / 60))
    return DEFAULT_PENDING_CONFIG.delayMinutes
  })()

  if (config.enabled === false || delayMinutes <= 0) {
    await chrome.tabs.remove(tabId)
    recordToHistory(url, title, favIconUrl)
    return false // 直接关闭，无暂留
  }

  const delayMs = delayMinutes * 60 * 1000
  const expiresAt = Date.now() + delayMs
  const timer = setTimeout(async () => {
    pendingMap.delete(tabId)
    try {
      await chrome.tabs.remove(tabId)
    } catch {
      // tab 可能已经不存在了
    }
    recordToHistory(url, title, favIconUrl)
  }, delayMs)

  pendingMap.set(tabId, { tabId, url, title, favIconUrl, windowId, expiresAt, timer })
  return true // 进入了暂留模式
}

function recordToHistory(url: string, title: string, favIconUrl: string | undefined) {
  const store = useCloseHistoryStore.getState()
  store.addToHistory({
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    url,
    title,
    favIconUrl,
    closedAt: Date.now(),
  })
}

export async function initCloseHistory() {
  const store = useCloseHistoryStore.getState()
  await store.load()
  const config = await getPendingConfig()
  await store.clearOlderThan(config.historyDays)
}

export async function softCloseTabs(
  tabs: Array<{ id: number; url: string; title: string; favIconUrl?: string; windowId: number }>,
) {
  for (const t of tabs) {
    await softCloseTab(t.id, t.url, t.title, t.favIconUrl, t.windowId)
  }
}
