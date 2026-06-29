export interface TabInfo {
  id: number
  windowId: number
  title: string
  url: string
  favIconUrl?: string
  active: boolean
  pinned: boolean
  index: number
  discarded: boolean
  groupId?: number  // Chrome 原生 Tab Group ID
}

export interface WindowInfo {
  id: number
  tabs: TabInfo[]
  focused: boolean
}

// === 分组相关类型 ===

/** 分组颜色标识 */
export type GroupColor =
  | 'grey' | 'blue' | 'red' | 'yellow'
  | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'

/** Chrome 原生 Tab Group 颜色 */
export type ChromeGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'

/** Chrome 原生 Tab Group 颜色映射 */
export const GROUP_COLOR_MAP: Record<GroupColor, ChromeGroupColor> = {
  grey: 'grey', blue: 'blue', red: 'red', yellow: 'yellow',
  green: 'green', pink: 'pink', purple: 'purple', cyan: 'cyan', orange: 'orange',
}

/** 分组匹配规则 */
export interface GroupRule {
  id: string
  groupId: string
  pattern: string       // 域名/URL 匹配模式
  type: 'domain' | 'regex'
}

/** 用户自定义分组 */
export interface GroupConfig {
  id: string
  name: string
  color: GroupColor
  note?: string          // 备注（需求ID、链接等）
  rules: GroupRule[]     // 自动匹配规则
  collapsed: boolean     // 是否折叠
  createdAt: number
}

/** 分组展示用（含归属标签页） */
export interface GroupDisplay {
  config: GroupConfig
  tabs: TabInfo[]
}

/** 未分组的标签页 */
export interface UngroupedDisplay {
  tabs: TabInfo[]
}

/** 手动分配记录: tabId → groupId */
export type ManualAssignments = Record<number, string>
