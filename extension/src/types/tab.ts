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
  groupId?: number
}

export interface WindowInfo {
  id: number
  tabs: TabInfo[]
  focused: boolean
}

// === 分组相关类型 ===

export type GroupColor =
  | 'grey' | 'blue' | 'red' | 'yellow' | 'green'
  | 'pink' | 'purple' | 'cyan' | 'orange'
  | 'teal' | 'lime' | 'indigo' | 'amber' | 'rose'
  | 'sky' | 'emerald' | 'violet' | 'fuchsia' | 'slate'
  | 'zinc'

export const GROUP_COLORS: GroupColor[] = [
  'blue', 'green', 'purple', 'cyan', 'orange',
  'teal', 'lime', 'indigo', 'amber', 'rose',
  'sky', 'emerald', 'violet', 'fuchsia', 'slate',
  'pink', 'red', 'yellow', 'grey', 'zinc',
]

export type ChromeGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'

export const GROUP_COLOR_MAP: Record<GroupColor, ChromeGroupColor> = {
  grey: 'grey', blue: 'blue', red: 'red', yellow: 'yellow',
  green: 'green', pink: 'pink', purple: 'purple', cyan: 'cyan', orange: 'orange',
  teal: 'cyan', lime: 'green', indigo: 'purple', amber: 'orange', rose: 'pink',
  sky: 'blue', emerald: 'green', violet: 'purple', fuchsia: 'pink', slate: 'grey',
  zinc: 'grey',
}

export interface GroupRule {
  id: string
  groupId: string
  pattern: string
  type: 'domain' | 'regex'
}

export interface GroupConfig {
  id: string
  name: string
  color: GroupColor
  note?: string
  rules: GroupRule[]
  collapsed: boolean
  createdAt: number
}

export interface GroupDisplay {
  config: GroupConfig
  tabs: TabInfo[]
}

export interface UngroupedDisplay {
  tabs: TabInfo[]
}

export type ManualAssignments = Record<number, string>
