import { getPendingConfig, DEFAULT_PENDING_CONFIG } from '../store/closeHistoryStore'
import { useCloseHistoryStore } from '../store/closeHistoryStore'

type PendingInfo = { tabId: number; url: string; title: string; favIconUrl?: string; windowId: number; expiresAt: number; timer: ReturnType<typeof setTimeout> }
const pendingMap = new Map<number, PendingInfo>()

export function getPendingCloseIds(): Set<number> {
  return new Set(pendingMap.keys())
}

export function cancelPendingClose(tabId: number) {
  const info = pendingMap.get(tabId)
  if (info) {
    clearTimeout(info.timer)
    pendingMap.delete(tabId)
  }
}

/** 软关闭一个标签页，返回是否进入了暂留模式 */
export async function softCloseTab(
  tabId: number, url: string, title: string,
  favIconUrl: string | undefined, windowId: number,
): Promise<boolean> {
  const config = await getPendingConfig()
  console.log('[TabFlow] softCloseTab called', { tabId, title, enabled: config.enabled, delayMinutes: config.delayMinutes })

  // 确保 delayMinutes 有效
  const mins = typeof config.delayMinutes === 'number' && config.delayMinutes > 0
    ? config.delayMinutes
    : DEFAULT_PENDING_CONFIG.delayMinutes

  if (config.enabled === false || mins <= 0) {
    console.log('[TabFlow] softCloseTab: disabled, removing immediately')
    await chrome.tabs.remove(tabId)
    recordToHistory(url, title, favIconUrl)
    return false
  }

  // 先不关浏览器标签页，只加入 pendingMap
  const delayMs = mins * 60 * 1000
  const expiresAt = Date.now() + delayMs
  const timer = setTimeout(() => {
    pendingMap.delete(tabId)
    chrome.tabs.remove(tabId).catch(() => {})
    recordToHistory(url, title, favIconUrl)
  }, delayMs)

  pendingMap.set(tabId, { tabId, url, title, favIconUrl, windowId, expiresAt, timer })
  console.log('[TabFlow] softCloseTab: pending, expires in', mins, 'minutes, pendingMap size:', pendingMap.size)
  return true
}

function recordToHistory(url: string, title: string, favIconUrl: string | undefined) {
  useCloseHistoryStore.getState().addToHistory({
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    url, title, favIconUrl, closedAt: Date.now(),
  })
  console.log('[TabFlow] recorded to history:', title)
}

export async function initCloseHistory() {
  const store = useCloseHistoryStore.getState()
  await store.load()
  const config = await getPendingConfig()
  await store.clearOlderThan(config.historyDays)
}
