import type { GroupConfig, GroupRule, TabInfo, GroupDisplay, UngroupedDisplay, ManualAssignments } from '../types'

/**
 * 内置默认分组规则
 */
export const DEFAULT_GROUPS: GroupConfig[] = [
  {
    id: '__builtin_aone__',
    name: 'Aone',
    color: 'blue',
    rules: [
      { id: 'aone-1', groupId: '__builtin_aone__', pattern: 'aone.alibaba-inc.com', type: 'domain' },
      { id: 'aone-2', groupId: '__builtin_aone__', pattern: 'aone.taobao.com', type: 'domain' },
    ],
    collapsed: false,
    createdAt: Date.now(),
  },
  {
    id: '__builtin_repos__',
    name: '代码仓库',
    color: 'green',
    rules: [
      { id: 'repos-1', groupId: '__builtin_repos__', pattern: 'github.com', type: 'domain' },
      { id: 'repos-2', groupId: '__builtin_repos__', pattern: 'gitlab.com', type: 'domain' },
      { id: 'repos-3', groupId: '__builtin_repos__', pattern: 'gitee.com', type: 'domain' },
    ],
    collapsed: false,
    createdAt: Date.now(),
  },
  {
    id: '__builtin_docs__',
    name: '文档',
    color: 'yellow',
    rules: [
      { id: 'docs-1', groupId: '__builtin_docs__', pattern: 'yuque.antfin.com', type: 'domain' },
      { id: 'docs-2', groupId: '__builtin_docs__', pattern: 'yuque.com', type: 'domain' },
      { id: 'docs-3', groupId: '__builtin_docs__', pattern: 'docs.google.com', type: 'domain' },
      { id: 'docs-4', groupId: '__builtin_docs__', pattern: 'notion.so', type: 'domain' },
      { id: 'docs-5', groupId: '__builtin_docs__', pattern: 'confluence', type: 'domain' },
    ],
    collapsed: false,
    createdAt: Date.now(),
  },
  {
    id: '__builtin_local__',
    name: '本地开发',
    color: 'purple',
    rules: [
      { id: 'local-1', groupId: '__builtin_local__', pattern: 'localhost', type: 'domain' },
      { id: 'local-2', groupId: '__builtin_local__', pattern: '127.0.0.1', type: 'domain' },
      { id: 'local-3', groupId: '__builtin_local__', pattern: '0.0.0.0', type: 'domain' },
    ],
    collapsed: false,
    createdAt: Date.now(),
  },
]

/**
 * 从 URL 中提取域名（去掉协议和路径）
 */
export function getDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return ''
  }
}

/**
 * 判断域名是否匹配规则
 */
function matchDomain(pattern: string, hostname: string): boolean {
  // 支持通配符 * 匹配
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2)
    return hostname.endsWith(suffix)
  }
  // 包含匹配（如 'confluence' 匹配 'xxx.confluence.xxx.com'）
  if (!pattern.includes('.') && !pattern.includes('*')) {
    return hostname.includes(pattern)
  }
  // 精确域名匹配
  return hostname === pattern || hostname.endsWith('.' + pattern)
}

/**
 * 判断 URL 是否匹配正则规则
 */
function matchRegex(pattern: string, url: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i')
    return regex.test(url)
  } catch {
    return false
  }
}

/**
 * 判断标签页是否匹配某条规则
 */
function matchRule(rule: GroupRule, tab: TabInfo): boolean {
  if (!tab.url) return false
  const hostname = getDomain(tab.url)

  if (rule.type === 'domain') {
    return matchDomain(rule.pattern, hostname)
  }
  if (rule.type === 'regex') {
    return matchRegex(rule.pattern, tab.url)
  }
  return false
}

/**
 * 为标签页查找匹配的分组
 * 优先级：手动分配 > 自定义分组规则 > 内置默认分组规则
 */
export function classifyTab(
  tab: TabInfo,
  groups: GroupConfig[],
  manualAssignments: ManualAssignments,
): GroupConfig | null {
  // 1. 检查手动分配
  const manualGroupId = manualAssignments[tab.id]
  if (manualGroupId) {
    const group = groups.find((g) => g.id === manualGroupId)
    if (group) return group
  }

  // 2. 先匹配自定义分组规则，再匹配内置规则
  // 自定义分组排在前面（优先级更高）
  for (const group of groups) {
    for (const rule of group.rules) {
      if (matchRule(rule, tab)) {
        return group
      }
    }
  }

  return null
}

/**
 * 将标签页列表按分组归类
 */
export function groupTabs(
  tabs: TabInfo[],
  groups: GroupConfig[],
  manualAssignments: ManualAssignments,
): { grouped: GroupDisplay[]; ungrouped: UngroupedDisplay } {
  const groupMap = new Map<string, TabInfo[]>()
  const ungroupedTabs: TabInfo[] = []

  for (const tab of tabs) {
    const matched = classifyTab(tab, groups, manualAssignments)
    if (matched) {
      const existing = groupMap.get(matched.id) || []
      existing.push(tab)
      groupMap.set(matched.id, existing)
    } else {
      ungroupedTabs.push(tab)
    }
  }

  // 保持 groups 的顺序，只包含有标签页的分组
  const grouped: GroupDisplay[] = groups
    .filter((g) => groupMap.has(g.id))
    .map((config) => ({
      config,
      tabs: groupMap.get(config.id)!,
    }))

  return { grouped, ungrouped: { tabs: ungroupedTabs } }
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 存储 Key 常量
 */
export const STORAGE_KEY_GROUPS = 'tabflow_groups'
export const STORAGE_KEY_MANUAL_ASSIGNMENTS = 'tabflow_manual_assignments'
