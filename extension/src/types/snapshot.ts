/** 标签页快照（只保留恢复所需的关键信息） */
export interface TabSnapshot {
  url: string
  title: string
  favIconUrl?: string
  pinned: boolean
  groupName?: string  // 所属分组名称
}

/** 窗口快照 */
export interface WindowSnapshot {
  tabs: TabSnapshot[]
}

/** 工作区快照 */
export interface Snapshot {
  id: string
  name: string
  createdAt: number
  windows: WindowSnapshot[]
  tabCount: number
}
