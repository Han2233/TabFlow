import { recordTabCreated, cleanupTabCreated } from '../utils/windowSplit'
import { getHibernateConfig, type HibernateConfig } from '../utils/duplicateDetector'
import { detectDuplicates } from '../utils/duplicateDetector'
import { getAllWindows } from '../utils/tabs'

// 启动时清理可能残留的旧版软关闭配置
chrome.storage.local.get('tabflow_pending_config').then((r) => {
  const cfg = r.tabflow_pending_config as Record<string, unknown> | undefined
  if (cfg && typeof cfg.delayMinutes !== 'number') {
    chrome.storage.local.remove('tabflow_pending_config')
    console.log('TabFlow: migrated old pending config')
  }
})


// 点击扩展图标 → 打开侧边栏
chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
})

// 记录标签页创建时间
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) recordTabCreated(tab.id)
})

// 清理已关闭标签页
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTabCreated(tabId)
})

// ====== 休眠逻辑 ======

const lastActiveMap = new Map<number, number>()
let hibernateTimer: ReturnType<typeof setInterval> | null = null
let badgeTimer: ReturnType<typeof setInterval> | null = null

// 追踪标签页最后活跃时间
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

    // 检查白名单
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

// 启动休眠定时器
getHibernateConfig().then((config) => {
  if (config.enabled) {
    hibernateTimer = setInterval(runHibernate, 60_000) // 每分钟检查
  }
})

// 监听配置变更
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tabflow_hibernate_config) {
    if (hibernateTimer) clearInterval(hibernateTimer)
    const config = changes.tabflow_hibernate_config.newValue as HibernateConfig
    if (config?.enabled) {
      hibernateTimer = setInterval(runHibernate, 60_000)
    }
  }
})

// ====== 重复检测 Badge ======

async function updateBadge() {
  const windows = await getAllWindows()
  const allTabs = windows.flatMap((w) => w.tabs)
  const dups = detectDuplicates(allTabs)
  const count = dups.reduce((s, g) => s + g.tabs.length - 1, 0) // 多余的标签页数

  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) })
    chrome.action.setBadgeBackgroundColor({ color: '#f97316' }) // orange
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

// 每 5 分钟扫描一次 + 标签页事件时更新
badgeTimer = setInterval(updateBadge, 5 * 60_000)
updateBadge()

chrome.tabs.onCreated.addListener(() => updateBadge())
chrome.tabs.onRemoved.addListener(() => updateBadge())
chrome.tabs.onUpdated.addListener(() => updateBadge())
