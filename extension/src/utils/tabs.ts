import type { TabInfo, WindowInfo } from '../types'

function toTabInfo(tab: chrome.tabs.Tab): TabInfo {
  return {
    id: tab.id!,
    windowId: tab.windowId,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl,
    active: tab.active,
    pinned: tab.pinned,
    index: tab.index,
    discarded: tab.discarded || false,
  }
}

export async function getAllWindows(): Promise<WindowInfo[]> {
  const windows = await chrome.windows.getAll({ populate: true })
  return windows
    .filter((w) => w.type === 'normal')
    .map((w) => ({
      id: w.id!,
      focused: w.focused,
      tabs: (w.tabs || []).map(toTabInfo),
    }))
}

export async function activateTab(tabId: number, windowId: number) {
  await chrome.tabs.update(tabId, { active: true })
  await chrome.windows.update(windowId, { focused: true })
}

export async function closeTab(tabId: number) {
  await chrome.tabs.remove(tabId)
}
