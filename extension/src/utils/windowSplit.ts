import { groupTabs } from './grouping'
import type { GroupConfig, ManualAssignments, TabInfo } from '../types'

export interface SplitGroup {
  name: string
  color: string
  tabs: TabInfo[]
}

/**
 * 将标签页按分组归类，未分组的归入"未分组"
 * 确保所有标签页都被分配到某个窗口
 */
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

  // 未分组标签页单独分在一个窗口
  if (ungrouped.tabs.length > 0) {
    result.push({
      name: '未分组',
      color: 'grey',
      tabs: ungrouped.tabs,
    })
  }

  return result
}

async function createWindowWithGroup(group: SplitGroup, focused: boolean) {
  if (group.tabs.length === 0) return
  const urls = group.tabs.map((t) => t.url).filter(Boolean)
  if (urls.length === 0) return

  const win = await chrome.windows.create({ url: urls, focused })
  if (!win) return

  // 为窗口中的标签页创建 Chrome Tab Group
  if (win.tabs && win.tabs.length >= 2) {
    try {
      const tabIds = win.tabs.map((t) => t.id!).filter(Boolean) as [number, ...number[]]
      const groupId = await chrome.tabs.group({ tabIds })
      await chrome.tabGroups.update(groupId, {
        title: group.name,
        color: toChromeColor(group.color),
      })
    } catch {
      // Chrome Tab Group 可能不适用于所有情况
    }
  }
}

/**
 * 在新的浏览器窗口中打开分组
 */
export async function splitToNewWindows(splitGroups: SplitGroup[]) {
  for (const group of splitGroups) {
    await createWindowWithGroup(group, false)
  }
}

/**
 * 替换当前所有窗口：关闭所有窗口后在新的浏览器窗口中打开分组
 */
export async function splitReplaceCurrent(splitGroups: SplitGroup[]) {
  // 关闭所有现有窗口
  const existingWindows = await chrome.windows.getAll()
  for (const w of existingWindows) {
    if (w.id && w.type === 'normal') {
      await chrome.windows.remove(w.id)
    }
  }

  // 第一个分组聚焦，其余的 unfocused
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

/** 记录标签页创建时间 */
export function recordTabCreated(tabId: number) {
  chrome.storage.local.get(STORAGE_KEY_TAB_CREATED).then((result) => {
    const map: Record<number, number> = (result[STORAGE_KEY_TAB_CREATED] as Record<number, number>) || {}
    map[tabId] = Date.now()
    chrome.storage.local.set({ [STORAGE_KEY_TAB_CREATED]: map })
  })
}

/** 清理已关闭标签页的记录 */
export function cleanupTabCreated(tabId: number) {
  chrome.storage.local.get(STORAGE_KEY_TAB_CREATED).then((result) => {
    const map: Record<number, number> = (result[STORAGE_KEY_TAB_CREATED] as Record<number, number>) || {}
    delete map[tabId]
    chrome.storage.local.set({ [STORAGE_KEY_TAB_CREATED]: map })
  })
}

/** 获取标签页创建时间映射 */
export async function getTabCreatedMap(): Promise<Record<number, number>> {
  const result = await chrome.storage.local.get(STORAGE_KEY_TAB_CREATED)
  return (result[STORAGE_KEY_TAB_CREATED] as Record<number, number>) || {}
}
