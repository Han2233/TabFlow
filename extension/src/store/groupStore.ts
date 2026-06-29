import { create } from 'zustand'
import type { GroupConfig, GroupRule, ManualAssignments } from '../types'
import { DEFAULT_GROUPS, generateId, STORAGE_KEY_GROUPS, STORAGE_KEY_MANUAL_ASSIGNMENTS } from '../utils/grouping'

interface GroupStore {
  groups: GroupConfig[]
  manualAssignments: ManualAssignments
  loaded: boolean

  load: () => Promise<void>
  save: () => Promise<void>

  addGroup: (name: string, color: GroupConfig['color'], note?: string) => void
  updateGroup: (id: string, updates: Partial<Pick<GroupConfig, 'name' | 'color' | 'note'>>) => void
  deleteGroup: (id: string) => void
  toggleCollapse: (id: string) => void

  addRule: (groupId: string, pattern: string, type: GroupRule['type']) => void
  removeRule: (ruleId: string) => void

  assignTab: (tabId: number, groupId: string | null) => void
  getManualGroupId: (tabId: number) => string | null
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  manualAssignments: {},
  loaded: false,

  load: async () => {
    const result = await chrome.storage.local.get([STORAGE_KEY_GROUPS, STORAGE_KEY_MANUAL_ASSIGNMENTS])

    let groups: GroupConfig[] = (result[STORAGE_KEY_GROUPS] as GroupConfig[]) || []
    const manualAssignments: ManualAssignments = (result[STORAGE_KEY_MANUAL_ASSIGNMENTS] as ManualAssignments) || {}

    // 首次加载：使用默认分组
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      groups = DEFAULT_GROUPS.map((g) => ({ ...g, createdAt: Date.now() }))
      await chrome.storage.local.set({ [STORAGE_KEY_GROUPS]: groups })
    }

    set({ groups, manualAssignments, loaded: true })
  },

  save: async () => {
    const { groups, manualAssignments } = get()
    await chrome.storage.local.set({
      [STORAGE_KEY_GROUPS]: groups,
      [STORAGE_KEY_MANUAL_ASSIGNMENTS]: manualAssignments,
    })
  },

  addGroup: (name, color, note) => {
    const newGroup: GroupConfig = {
      id: generateId(),
      name,
      color,
      note,
      rules: [],
      collapsed: false,
      createdAt: Date.now(),
    }
    set((s) => ({ groups: [...s.groups, newGroup] }))
    get().save()
  },

  updateGroup: (id, updates) => {
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }))
    get().save()
  },

  deleteGroup: (id) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      // 同时清除该分组的手动分配和规则
      manualAssignments: Object.fromEntries(
        Object.entries(s.manualAssignments).filter(([, gid]) => gid !== id),
      ),
    }))
    get().save()
  },

  toggleCollapse: (id) => {
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === id ? { ...g, collapsed: !g.collapsed } : g,
      ),
    }))
    get().save()
  },

  addRule: (groupId, pattern, type) => {
    const rule: GroupRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      pattern,
      type,
    }
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId ? { ...g, rules: [...g.rules, rule] } : g,
      ),
    }))
    get().save()
  },

  removeRule: (ruleId) => {
    set((s) => ({
      groups: s.groups.map((g) => ({
        ...g,
        rules: g.rules.filter((r) => r.id !== ruleId),
      })),
    }))
    get().save()
  },

  assignTab: (tabId, groupId) => {
    set((s) => {
      const next = { ...s.manualAssignments }
      if (groupId === null) {
        delete next[tabId]
      } else {
        next[tabId] = groupId
      }
      return { manualAssignments: next }
    })
    get().save()
  },

  getManualGroupId: (tabId) => {
    const { manualAssignments } = get()
    return manualAssignments[tabId] || null
  },
}))
