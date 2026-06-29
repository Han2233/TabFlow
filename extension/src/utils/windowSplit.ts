import { groupTabs } from './grouping'
import type { GroupConfig, ManualAssignments, TabInfo } from '../types'

export interface SplitGroup {
  name: string
  color: string
  tabs: TabInfo[]
}

export function buildSplitGroups(
  tabs: TabInfo[],
  groups: GroupConfig[],
  manualAssignments: ManualAssignments,
): SplitGroup[] {
  const { grouped, ungrouped } = groupTabs(tabs, groups, manualAssignments)

  const result: SplitGroup[] = grouped.map((g) => ({
    name: g.config.name,
    color: g.config.color,
    tabs: g.tabs,
  }))

  if (ungrouped.tabs.length > 0) {
    result.push({ name: '未分组', color: 'grey', tabs: ungrouped.tabs })
  }

  return result
}

/** 创建一个浏览器窗口，打开该分组所有标签页 */
async function createWindowWithUrls(urls: string[], focused: boolean) {
  if (urls.length === 0) return
  await chrome.windows.create({ url: urls, focused, type: 'normal' })
}

export async function splitToNewWindows(splitGroups: SplitGroup[]) {
  for (const group of splitGroups) {
    const urls = group.tabs.map((t) => t.url).filter(Boolean)
    await createWindowWithUrls(urls, false)
    // 窗口间稍作间隔，避免 Chrome 限流
    await new Promise((r) => setTimeout(r, 500))
  }
}

export async function splitReplaceCurrent(splitGroups: SplitGroup[]) {
  // 收集所有新 URL
  const allUrls: string[][] = splitGroups
    .map((g) => g.tabs.map((t) => t.url).filter(Boolean))
    .filter((urls) => urls.length > 0)

  // 关闭所有现有窗口
  const existing = await chrome.windows.getAll()
  for (const w of existing) {
    if (w.id && w.type === 'normal') {
      await chrome.windows.remove(w.id)
    }
  }

  // 创建新窗口
  for (let i = 0; i < allUrls.length; i++) {
    await createWindowWithUrls(allUrls[i], i === 0)
    await new Promise((r) => setTimeout(r, 500))
  }
}

// ====== 时间追踪 ======

const STORAGE_KEY_TAB_CREATED = 'tabflow_tab_created_at'

export function recordTabCreated(tabId: number) {
  chrome.storage.local.get(STORAGE_KEY_TAB_CREATED).then((result) => {
    const map: Record<number, number> = (result[STORAGE_KEY_TAB_CREATED] as Record<number, number>) || {}
    map[tabId] = Date.now()
    chrome.storage.local.set({ [STORAGE_KEY_TAB_CREATED]: map })
  })
}

export function cleanupTabCreated(tabId: number) {
  chrome.storage.local.get(STORAGE_KEY_TAB_CREATED).then((result) => {
    const map: Record<number, number> = (result[STORAGE_KEY_TAB_CREATED] as Record<number, number>) || {}
    delete map[tabId]
    chrome.storage.local.set({ [STORAGE_KEY_TAB_CREATED]: map })
  })
}

export async function getTabCreatedMap(): Promise<Record<number, number>> {
  const result = await chrome.storage.local.get(STORAGE_KEY_TAB_CREATED)
  return (result[STORAGE_KEY_TAB_CREATED] as Record<number, number>) || {}
}
