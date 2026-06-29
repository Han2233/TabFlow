import { getPendingConfig, type PendingConfig, DEFAULT_PENDING_CONFIG } from '../store/closeHistoryStore'
import { useCloseHistoryStore, type ClosedTab } from '../store/closeHistoryStore'

/** 正在软关闭的标签页 { tabId → PendingInfo } */
type PendingInfo = { tabId: number; url: string; title: string; favIconUrl?: string; windowId: number; expiresAt: number; timer: ReturnType<typeof setTimeout> }
const pendingMap = new Map<number, PendingInfo>()

/** 获取当前所有软关闭中的 tabId 集合 */
export function getPendingCloseIds(): Set<number> {
  return new Set(pendingMap.keys())
}

/** 获取软关闭中的 tab 信息 */
export function getPendingInfo(tabId: number): PendingInfo | undefined {
  return pendingMap.get(tabId)
}

/** 取消软关闭（撤销） */
export function cancelPendingClose(tabId: number) {
  const info = pendingMap.get(tabId)
  if (info) {
    clearTimeout(info.timer)
    pendingMap.delete(tabId)
  }
}

/** 立即执行关闭（跳过等待） */
export function forceClose(tabId: number) {
  const info = pendingMap.get(tabId)
  if (info) {
    clearTimeout(info.timer)
    pendingMap.delete(tabId)
    chrome.tabs.remove(tabId)
  }
}

/** 软关闭一个标签页 */
export async function softCloseTab(
  tabId: number,
  url: string,
  title: string,
  favIconUrl: string | undefined,
  windowId: number,
) {
  const config = await getPendingConfig()

  if (!config.enabled || config.delayMinutes === 0) {
    // 直接关闭
    await chrome.tabs.remove(tabId)
    recordToHistory(url, title, favIconUrl)
    return
  }

  const expiresAt = Date.now() + config.delayMinutes * 60 * 1000
  const timer = setTimeout(async () => {
    pendingMap.delete(tabId)
    try {
      await chrome.tabs.remove(tabId)
    } catch {
      // tab 可能已经不存在了
    }
    recordToHistory(url, title, favIconUrl)
  }, config.delayMinutes * 60 * 1000)

  pendingMap.set(tabId, { tabId, url, title, favIconUrl, windowId, expiresAt, timer })
}

/** 记录到关闭历史 */
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

/** 初始化：加载历史 + 清理过期 */
export async function initCloseHistory() {
  const store = useCloseHistoryStore.getState()
  await store.load()
  const config = await getPendingConfig()
  await store.clearOlderThan(config.historyDays)
}

/** 批量关闭 */
export async function softCloseTabs(
  tabs: Array<{ id: number; url: string; title: string; favIconUrl?: string; windowId: number }>,
) {
  for (const t of tabs) {
    await softCloseTab(t.id, t.url, t.title, t.favIconUrl, t.windowId)
  }
}
