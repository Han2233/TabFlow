import { recordTabCreated, cleanupTabCreated } from '../utils/windowSplit'
import { getHibernateConfig, type HibernateConfig } from '../utils/duplicateDetector'
import { detectDuplicates } from '../utils/duplicateDetector'
import { getAllWindows } from '../utils/tabs'
import { getPendingConfig, DEFAULT_PENDING_CONFIG } from '../store/closeHistoryStore'

// ====== 标签页信息追踪（用于 onRemoved 时记录关闭历史） ======

interface TrackedTab {
  url: string
  title: string
  favIconUrl?: string
}

const tabInfoMap = new Map<number, TrackedTab>()

function trackTab(tabId: number, url: string, title: string, favIconUrl?: string) {
  if (url && !url.startsWith('chrome://')) {
    tabInfoMap.set(tabId, { url, title, favIconUrl })
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    recordTabCreated(tab.id)
    trackTab(tab.id, tab.url || '', tab.title || '')
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
    trackTab(tabId, tab.url || tab.title || '', tab.title || '', tab.favIconUrl)
  }
})

// ====== 关闭历史记录 ======

chrome.tabs.onRemoved.addListener(async (tabId) => {
  cleanupTabCreated(tabId)
  const info = tabInfoMap.get(tabId)
  if (info) {
    tabInfoMap.delete(tabId)
    // 记录到关闭历史
    const result = await chrome.storage.local.get('tabflow_close_history')
    const history = ((result.tabflow_close_history as Array<Record<string, unknown>>) || []) as Array<{ id: string; url: string; title: string; favIconUrl?: string; closedAt: number }>
    history.unshift({
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url: info.url,
      title: info.title,
      favIconUrl: info.favIconUrl,
      closedAt: Date.now(),
    })
    if (history.length > 5000) history.length = 5000
    chrome.storage.local.set({ tabflow_close_history: history })

    // 定期清理过期历史
    const config = await getPendingConfig()
    const cutoff = Date.now() - (config.historyDays || DEFAULT_PENDING_CONFIG.historyDays) * 86400000
    const filtered = history.filter((h) => h.closedAt > cutoff)
    if (filtered.length !== history.length) {
      chrome.storage.local.set({ tabflow_close_history: filtered })
    }
  }
})

// ====== 点击图标 → 侧边栏 ======

chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
})

// ====== 休眠逻辑 ======

const lastActiveMap = new Map<number, number>()
let hibernateTimer: ReturnType<typeof setInterval> | null = null
let badgeTimer: ReturnType<typeof setInterval> | null = null

chrome.tabs.onActivated.addListener((info) => {
  lastActiveMap.set(info.tabId, Date.now())
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    lastActiveMap.set(tabId, Date.now())
  }
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
      const hostname = new URL(tab.url || '').hostname
      if (config.whitelist.some((d) => hostname.includes(d))) continue
    } catch { continue }
    const lastActive = lastActiveMap.get(tab.id) || now
    if (now - lastActive > timeout) {
      await chrome.tabs.discard(tab.id)
    }
  }
}

getHibernateConfig().then((config) => {
  if (config.enabled) {
    hibernateTimer = setInterval(runHibernate, 60_000)
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tabflow_hibernate_config) {
    if (hibernateTimer) clearInterval(hibernateTimer)
    const config = changes.tabflow_hibernate_config.newValue as HibernateConfig
    if (config?.enabled) {
      hibernateTimer = setInterval(runHibernate, 60_000)
    }
  }
})

// ====== 重复 Badge ======

async function updateBadge() {
  const windows = await getAllWindows()
  const allTabs = windows.flatMap((w) => w.tabs)
  const dups = detectDuplicates(allTabs)
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

// ====== 启动时清理旧版软关闭配置 ======

chrome.storage.local.get('tabflow_pending_config').then((r) => {
  const cfg = r.tabflow_pending_config as Record<string, unknown> | undefined
  if (cfg && typeof cfg.delayMinutes !== 'number') {
    chrome.storage.local.remove('tabflow_pending_config')
  }
})
