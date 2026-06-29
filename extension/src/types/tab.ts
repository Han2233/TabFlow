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
}

export interface WindowInfo {
  id: number
  tabs: TabInfo[]
  focused: boolean
}
