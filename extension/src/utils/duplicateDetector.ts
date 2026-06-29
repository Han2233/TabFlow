import type { TabInfo } from '../types'

export interface DuplicateGroup {
  tabs: TabInfo[]
  reason: string  // 重复原因描述
}

/** 去掉 URL 中的查询参数 */
function stripQuery(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return url
  }
}

/** 去掉 URL 中的 hash */
function stripHash(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.toString()
  } catch {
    return url
  }
}

/** 标准化 URL（去掉末尾斜杠等） */
function normalize(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * 检测重复标签页
 * @param tabs 所有标签页
 * @returns 重复分组列表（每组至少 2 个标签页）
 */
export function detectDuplicates(tabs: TabInfo[]): DuplicateGroup[] {
  // 精确匹配：完全相同的 URL
  const exactMap = new Map<string, TabInfo[]>()
  // 忽略参数匹配
  const noQueryMap = new Map<string, TabInfo[]>()
  // 忽略 hash 匹配
  const noHashMap = new Map<string, TabInfo[]>()
  // 已处理的 tab id 集合（避免一个 tab 出现在多个分组）
  const handled = new Set<number>()
  const results: DuplicateGroup[] = []

  for (const tab of tabs) {
    if (!tab.url || handled.has(tab.id)) continue

    const exact = normalize(tab.url)
    const noQuery = normalize(stripQuery(tab.url))
    const noHash = normalize(stripHash(tab.url))

    if (!exactMap.has(exact)) exactMap.set(exact, [])
    exactMap.get(exact)!.push(tab)

    if (!noQueryMap.has(noQuery)) noQueryMap.set(noQuery, [])
    noQueryMap.get(noQuery)!.push(tab)

    if (!noHashMap.has(noHash)) noHashMap.set(noHash, [])
    noHashMap.get(noHash)!.push(tab)
  }

  // 优先精确匹配
  for (const [, group] of exactMap) {
    if (group.length >= 2 && !group.some((t) => handled.has(t.id))) {
      for (const t of group) handled.add(t.id)
      results.push({ tabs: group, reason: 'URL 完全相同' })
    }
  }

  // 忽略参数
  for (const [key, group] of noQueryMap) {
    if (group.length >= 2 && !group.some((t) => handled.has(t.id))) {
      for (const t of group) handled.add(t.id)
      results.push({ tabs: group, reason: '忽略 URL 参数后相同' })
    }
  }

  // 忽略 hash
  for (const [key, group] of noHashMap) {
    if (group.length >= 2 && !group.some((t) => handled.has(t.id))) {
      for (const t of group) handled.add(t.id)
      results.push({ tabs: group, reason: '忽略 URL 锚点后相同' })
    }
  }

  return results
}

/**
 * 合并重复标签页：保留第一个（最近访问的），关闭其余
 */
export async function mergeDuplicates(group: DuplicateGroup) {
  const keep = group.tabs[0]
  const toClose = group.tabs.slice(1).map((t) => t.id)
  if (toClose.length > 0) {
    await chrome.tabs.remove(toClose)
  }
  // 激活保留的标签页
  if (keep) {
    await chrome.tabs.update(keep.id, { active: true })
    await chrome.windows.update(keep.windowId, { focused: true })
  }
}

// ====== 休眠 ======

const STORAGE_KEY_HIBERNATE_CONFIG = 'tabflow_hibernate_config'

export interface HibernateConfig {
  enabled: boolean
  timeoutMinutes: number  // 默认 30
  whitelist: string[]     // 不自动休眠的域名
}

export const DEFAULT_HIBERNATE_CONFIG: HibernateConfig = {
  enabled: true,
  timeoutMinutes: 30,
  whitelist: ['localhost', '127.0.0.1'],
}

export async function getHibernateConfig(): Promise<HibernateConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY_HIBERNATE_CONFIG)
  return (result[STORAGE_KEY_HIBERNATE_CONFIG] as HibernateConfig) || DEFAULT_HIBERNATE_CONFIG
}

export async function saveHibernateConfig(config: HibernateConfig) {
  await chrome.storage.local.set({ [STORAGE_KEY_HIBERNATE_CONFIG]: config })
}
