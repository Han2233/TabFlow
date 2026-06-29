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

/** 为一个分组创建独立窗口：创建空窗口 → 将标签页移入 → 设置 Tab Group */
async function createWindowWithGroup(group: SplitGroup, focused: boolean) {
  if (group.tabs.length === 0) return

  // 1. 创建一个空窗口
  const win = await chrome.windows.create({ focused })
  if (!win || !win.id) return

  // 2. 将该分组的标签页移入新窗口
  const tabIds = group.tabs.map((t) => t.id)
  await chrome.tabs.move(tabIds, { windowId: win.id, index: -1 })

  // 3. 设置 Chrome Tab Group
  if (tabIds.length >= 2) {
    // 移动后标签页 ID 不变，但需要确保它们都在新窗口中了
    await new Promise((r) => setTimeout(r, 100))
    try {
      const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] })
      await chrome.tabGroups.update(groupId, {
        title: group.name,
        color: toChromeColor(group.color),
      })
    } catch {
      // ignore
    }
  }
}

export async function splitToNewWindows(splitGroups: SplitGroup[]) {
  for (const group of splitGroups) {
    await createWindowWithGroup(group, false)
  }
}

export async function splitReplaceCurrent(splitGroups: SplitGroup[]) {
  // 先为每个分组创建目标窗口并移入标签页
  for (let i = 0; i < splitGroups.length; i++) {
    await createWindowWithGroup(splitGroups[i], i === 0)
  }

  // 关闭剩余的空窗口（原窗口标签页已被移走，会变为空窗口）
  const remainingWindows = await chrome.windows.getAll({ populate: true })
  for (const w of remainingWindows) {
    if (w.id && w.type === 'normal' && (!w.tabs || w.tabs.length === 0)) {
      await chrome.windows.remove(w.id)
    }
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
