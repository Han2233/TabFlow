import { useState, useCallback } from 'react'
import type { GroupConfig, TabInfo } from '../types'
import { TabItem } from './TabItem'
import { closeTab } from '../utils/tabs'
import { useTabStore } from '../store/tabStore'
import { useGroupStore } from '../store/groupStore'

interface GroupSectionProps {
  config: GroupConfig
  tabs: TabInfo[]
  onAssignTab: (tabId: number, groupId: string | null) => void
  onUnassignTab: (tabId: number) => void
}

const COLOR_CLASSES: Record<string, { bg: string; header: string; dot: string }> = {
  grey:    { bg: 'bg-gray-50',   header: 'bg-gray-100',   dot: 'bg-gray-400' },
  blue:    { bg: 'bg-blue-50',   header: 'bg-blue-100',   dot: 'bg-blue-500' },
  red:     { bg: 'bg-red-50',    header: 'bg-red-100',    dot: 'bg-red-500' },
  yellow:  { bg: 'bg-yellow-50', header: 'bg-yellow-100', dot: 'bg-yellow-500' },
  green:   { bg: 'bg-green-50',  header: 'bg-green-100',  dot: 'bg-green-500' },
  pink:    { bg: 'bg-pink-50',   header: 'bg-pink-100',   dot: 'bg-pink-500' },
  purple:  { bg: 'bg-purple-50', header: 'bg-purple-100', dot: 'bg-purple-500' },
  cyan:    { bg: 'bg-cyan-50',   header: 'bg-cyan-100',   dot: 'bg-cyan-500' },
  orange:  { bg: 'bg-orange-50', header: 'bg-orange-100', dot: 'bg-orange-500' },
  teal:    { bg: 'bg-teal-50',   header: 'bg-teal-100',   dot: 'bg-teal-500' },
  lime:    { bg: 'bg-lime-50',   header: 'bg-lime-100',   dot: 'bg-lime-500' },
  indigo:  { bg: 'bg-indigo-50', header: 'bg-indigo-100', dot: 'bg-indigo-500' },
  amber:   { bg: 'bg-amber-50',  header: 'bg-amber-100',  dot: 'bg-amber-500' },
  rose:    { bg: 'bg-rose-50',   header: 'bg-rose-100',   dot: 'bg-rose-500' },
  sky:     { bg: 'bg-sky-50',    header: 'bg-sky-100',    dot: 'bg-sky-500' },
  emerald: { bg: 'bg-emerald-50',header: 'bg-emerald-100',dot: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-50', header: 'bg-violet-100', dot: 'bg-violet-500' },
  fuchsia: { bg: 'bg-fuchsia-50',header: 'bg-fuchsia-100',dot: 'bg-fuchsia-500' },
  slate:   { bg: 'bg-slate-50',  header: 'bg-slate-100',  dot: 'bg-slate-500' },
  zinc:    { bg: 'bg-zinc-50',   header: 'bg-zinc-100',   dot: 'bg-zinc-500' },
}

export function GroupSection({ config, tabs, onAssignTab, onUnassignTab }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(config.collapsed)
  const refresh = useTabStore((s) => s.refresh)
  const toggleCollapseStore = useGroupStore((s) => s.toggleCollapse)

  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.grey

  const handleToggle = useCallback(() => {
    setCollapsed(!collapsed)
    toggleCollapseStore(config.id)
  }, [collapsed, config.id, toggleCollapseStore])

  const handleCloseTab = useCallback(
    async (tabId: number) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (tab) {
        await closeTab(tab.id)
        await refresh()
      }
    },
    [tabs, refresh],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const tabId = parseInt(e.dataTransfer.getData('tabId'), 10)
      if (!isNaN(tabId)) {
        onAssignTab(tabId, config.id)
      }
    },
    [config.id, onAssignTab],
  )

  return (
    <div
      className={`mb-2 rounded-lg ${colors.bg} border border-gray-100`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <button
        className={`flex items-center gap-2 w-full px-3 py-2 text-left rounded-t-lg ${colors.header} hover:opacity-80 transition-opacity`}
        onClick={handleToggle}
      >
        <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
        <span className="text-sm font-medium text-gray-800">{config.name}</span>
        <span className="text-xs text-gray-500 ml-auto">{tabs.length}</span>
        {config.note && (
          <span className="text-xs text-gray-400 truncate max-w-[100px]" title={config.note}>
            {config.note}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="py-1 rounded-b-lg">
          {tabs.map((tab) => (
            <TabItem key={tab.id} tab={tab} onClose={handleCloseTab} onUnassign={onUnassignTab} />
          ))}
          {tabs.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              拖拽标签页到此分组
            </div>
          )}
        </div>
      )}
    </div>
  )
}
