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

/** 为一个分组创建独立窗口并设置 Tab Group */
async function createWindowWithGroup(group: SplitGroup, focused: boolean) {
  if (group.tabs.length === 0) return
  const urls = group.tabs.map((t) => t.url).filter(Boolean)
  if (urls.length === 0) return

  // 先用第一个 URL 创建窗口
  const firstUrl = urls[0]
  const win = await chrome.windows.create({ url: firstUrl, focused })
  if (!win || !win.id) return

  // 在窗口中逐个创建剩余标签页
  for (let i = 1; i < urls.length; i++) {
    await chrome.tabs.create({ windowId: win.id, url: urls[i], active: false })
  }

  // 等所有标签页创建完成后，获取窗口中的所有标签页并创建 Chrome Tab Group
  if (urls.length >= 2) {
    // 稍微等待确保标签页都创建好了
    await new Promise((r) => setTimeout(r, 200))
    const tabs = await chrome.tabs.query({ windowId: win.id })
    if (tabs.length >= 2) {
      try {
        const tabIds = tabs.map((t) => t.id!).filter(Boolean)
        if (tabIds.length >= 2) {
          const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] })
          await chrome.tabGroups.update(groupId, {
            title: group.name,
            color: toChromeColor(group.color),
          })
        }
      } catch {
        // ignore
      }
    }
  }
}

export async function splitToNewWindows(splitGroups: SplitGroup[]) {
  for (const group of splitGroups) {
    await createWindowWithGroup(group, false)
  }
}

export async function splitReplaceCurrent(splitGroups: SplitGroup[]) {
  const existingWindows = await chrome.windows.getAll()
  for (const w of existingWindows) {
    if (w.id && w.type === 'normal') {
      await chrome.windows.remove(w.id)
    }
  }

  for (let i = 0; i < splitGroups.length; i++) {
    await createWindowWithGroup(splitGroups[i], i === 0)
  }
}

function toChromeColor(color: string) {
  const valid = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']
  return (valid.includes(color) ? color : 'grey') as 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'
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
