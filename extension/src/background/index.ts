import { recordTabCreated, cleanupTabCreated } from '../utils/windowSplit'

// 点击扩展图标 → 打开侧边栏（当没有 popup 时生效）
chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
})

// 记录新标签页的创建时间（用于时间视图）
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) recordTabCreated(tab.id)
})

// 清理已关闭标签页的记录
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTabCreated(tabId)
})
