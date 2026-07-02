import { recordTabCreated, cleanupTabCreated } from '../utils/windowSplit'
import { getHibernateConfig, type HibernateConfig } from '../utils/duplicateDetector'
import { detectDuplicates } from '../utils/duplicateDetector'
import { getAllWindows } from '../utils/tabs'
import { getPendingConfig, DEFAULT_PENDING_CONFIG } from '../store/closeHistoryStore'

// ====== 标签页追踪（持久化到 storage，Service Worker 重启不丢失） ======

const TAB_PREFIX = 'tab_track_'
const HISTORY_KEY = 'tabflow_close_history'

async function trackTab(tabId: number, url: string, title: string, favIconUrl?: string) {
  if (!url || url.startsWith('chrome://')) return
  await chrome.storage.local.set({
    [TAB_PREFIX + tabId]: { url, title, favIconUrl, ts: Date.now() },
  })
}

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    recordTabCreated(tab.id)
    trackTab(tab.id, tab.url || '', tab.title || '', tab.favIconUrl)
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
    trackTab(tabId, tab.url || '', tab.title || '', tab.favIconUrl)
  }
})

// ====== 关闭历史：onRemoved 从 storage 读取标签页信息 ======

chrome.tabs.onRemoved.addListener(async (tabId) => {
  cleanupTabCreated(tabId)

  const key = TAB_PREFIX + tabId
  const result = await chrome.storage.local.get(key)
  const info = result[key] as { url: string; title: string; favIconUrl?: string } | undefined
  chrome.storage.local.remove(key) // 清理追踪记录

  if (!info) return

  // 写入关闭历史
  const stored = await chrome.storage.local.get(HISTORY_KEY)
  const history = (stored[HISTORY_KEY] as Array<Record<string, unknown>>) || []
  history.unshift({
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    url: info.url,
    title: info.title,
    favIconUrl: info.favIconUrl,
    closedAt: Date.now(),
  })
  if (history.length > 5000) history.length = 5000
  chrome.storage.local.set({ [HISTORY_KEY]: history })

  // 定期清理
  const config = await getPendingConfig()
  const cutoff = Date.now() - (config.historyDays || DEFAULT_PENDING_CONFIG.historyDays) * 86400000
  const filtered = history.filter((h: Record<string, unknown>) => (h.closedAt as number) > cutoff)
  if (filtered.length !== history.length) {
    chrome.storage.local.set({ [HISTORY_KEY]: filtered })
  }
})

// ====== 点击图标 → 侧边栏 ======

chrome.action.onClicked.addListener(() => {
  (async () => {
    try {
      const win = await chrome.windows.getCurrent()
      if (win?.id) await chrome.sidePanel.open({ windowId: win.id })
    } catch {}
  })()
})

// ====== 休眠逻辑 ======

const lastActiveMap = new Map<number, number>()
let hibernateTimer: ReturnType<typeof setInterval> | null = null
let badgeTimer: ReturnType<typeof setInterval> | null = null

chrome.tabs.onActivated.addListener((info) => { lastActiveMap.set(info.tabId, Date.now()) })
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') lastActiveMap.set(tabId, Date.now())
})

async function runHibernate() {
  const config = await getHibernateConfig()
  if (!config.enabled) return
  const now = Date.now()
  const timeout = config.timeoutMinutes * 60 * 1000
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (!tab.id || tab.active || tab.pinned || tab.discarded) continue
    try {
      if (config.whitelist.some((d) => new URL(tab.url || '').hostname.includes(d))) continue
    } catch { continue }
    if (now - (lastActiveMap.get(tab.id) || now) > timeout) {
      await chrome.tabs.discard(tab.id)
    }
  }
}

getHibernateConfig().then((c) => { if (c.enabled) hibernateTimer = setInterval(runHibernate, 60_000) })
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tabflow_hibernate_config) {
    if (hibernateTimer) clearInterval(hibernateTimer)
    if ((changes.tabflow_hibernate_config.newValue as HibernateConfig)?.enabled) {
      hibernateTimer = setInterval(runHibernate, 60_000)
    }
  }
})

// ====== 重复 Badge ======

async function updateBadge() {
  const wins = await getAllWindows()
  const dups = detectDuplicates(wins.flatMap((w) => w.tabs))
  const count = dups.reduce((s, g) => s + g.tabs.length - 1, 0)
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) })
    chrome.action.setBadgeBackgroundColor({ color: '#f97316' })
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

badgeTimer = setInterval(updateBadge, 5 * 60_000)
updateBadge()
chrome.tabs.onCreated.addListener(() => updateBadge())
chrome.tabs.onRemoved.addListener(() => updateBadge())
chrome.tabs.onUpdated.addListener(() => updateBadge())
