import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTabStore } from '../store/tabStore'
import { useGroupStore } from '../store/groupStore'
import { SearchBar } from '../components/SearchBar'
import { groupTabs } from '../utils/grouping'
import type { GroupDisplay, UngroupedDisplay } from '../types'

export default function Popup() {
  const { windows, loading, refresh } = useTabStore()
  const { groups, manualAssignments, loaded: groupsLoaded, load: loadGroups } = useGroupStore()

  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    refresh()
    loadGroups()
  }, [refresh, loadGroups])

  const allTabs = useMemo(() => windows.flatMap((w) => w.tabs), [windows])
  const totalTabs = allTabs.length

  // 分组统计
  const groupedCount = useMemo(() => {
    if (!groupsLoaded) return 0
    const { grouped } = groupTabs(allTabs, groups, manualAssignments)
    return grouped.reduce((sum, g) => sum + g.tabs.length, 0)
  }, [allTabs, groups, manualAssignments, groupsLoaded])

  // tabId → 分组名称映射
  const groupNameMap = useMemo(() => {
    if (!groupsLoaded) return new Map<number, string>()
    const map = new Map<number, string>()
    const { grouped } = groupTabs(allTabs, groups, manualAssignments)
    for (const g of grouped) {
      for (const tab of g.tabs) {
        map.set(tab.id, g.config.name)
      }
    }
    return map
  }, [allTabs, groups, manualAssignments, groupsLoaded])

  const openSidePanel = useCallback(() => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
    window.close()
  }, [])

  if (loading || !groupsLoaded) {
    return (
      <div className="w-72 h-40 flex items-center justify-center text-gray-400 text-sm">
        加载中...
      </div>
    )
  }

  if (showSearch) {
    return (
      <div className="w-72 p-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() => setShowSearch(false)}
          >
            ← 返回
          </button>
        </div>
        <SearchBar allTabs={allTabs} groupNameMap={groupNameMap} />
      </div>
    )
  }

  return (
    <div className="w-72 p-3 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-sm font-semibold text-gray-800">TabFlow</h1>
        <span className="text-xs text-gray-400">{totalTabs} 个标签页</span>
      </div>

      {/* 搜索栏 */}
      <div
        className="flex items-center gap-2 px-3 py-2 mb-3 border border-gray-200 rounded-lg
          bg-gray-50 text-gray-400 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setShowSearch(true)}
      >
        <span>🔍</span>
        <span>搜索标签页...</span>
        <span className="ml-auto text-xs text-gray-300">⌘F</span>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="text-lg font-semibold text-gray-800">{windows.length}</div>
          <div className="text-xs text-gray-400">窗口数</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="text-lg font-semibold text-gray-800">{totalTabs}</div>
          <div className="text-xs text-gray-400">标签页</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="text-lg font-semibold text-gray-800">{groups.length}</div>
          <div className="text-xs text-gray-400">分组数</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50">
          <div className="text-lg font-semibold text-gray-800">{groupedCount}</div>
          <div className="text-xs text-gray-400">已分组</div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="space-y-1.5">
        <button
          className="w-full px-3 py-2 text-sm text-left bg-gray-50 rounded-lg hover:bg-gray-100
            transition-colors text-gray-700"
          onClick={openSidePanel}
        >
          📋 打开侧边栏面板
        </button>
        <button
          className="w-full px-3 py-2 text-sm text-left bg-gray-50 rounded-lg hover:bg-gray-100
            transition-colors text-gray-700"
          onClick={() => {
            setShowSearch(true)
          }}
        >
          🔍 搜索标签页
        </button>
      </div>

      {/* 快捷键提示 */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400 space-y-0.5">
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">⌘Shift+F</kbd> 搜索标签页</div>
          <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">⌘Shift+G</kbd> 打开侧边栏</div>
        </div>
      </div>
    </div>
  )
}
