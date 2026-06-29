import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTabStore } from '../store/tabStore'
import { useGroupStore } from '../store/groupStore'
import { WindowGroup } from '../components/WindowGroup'
import { GroupSection } from '../components/GroupSection'
import { GroupManager } from '../components/GroupManager'
import { SearchBar } from '../components/SearchBar'
import { TabItem } from '../components/TabItem'
import { groupTabs } from '../utils/grouping'
import { closeTab } from '../utils/tabs'
import type { GroupDisplay, UngroupedDisplay } from '../types'

type ViewMode = 'grouped' | 'all'

export default function SidePanel() {
  const { windows, loading, refresh } = useTabStore()
  const {
    groups, manualAssignments, loaded: groupsLoaded,
    load: loadGroups, assignTab,
  } = useGroupStore()

  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [showManager, setShowManager] = useState(false)
  // 加载分组数据
  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  // 监听标签页事件自动刷新
  useEffect(() => {
    refresh()

    const onTabEvent = () => refresh()
    chrome.tabs.onCreated.addListener(onTabEvent)
    chrome.tabs.onRemoved.addListener(onTabEvent)
    chrome.tabs.onUpdated.addListener(onTabEvent)
    chrome.tabs.onMoved.addListener(onTabEvent)
    chrome.tabs.onAttached.addListener(onTabEvent)
    chrome.tabs.onDetached.addListener(onTabEvent)
    chrome.windows.onCreated.addListener(onTabEvent)
    chrome.windows.onRemoved.addListener(onTabEvent)
    chrome.windows.onFocusChanged.addListener(onTabEvent)

    return () => {
      chrome.tabs.onCreated.removeListener(onTabEvent)
      chrome.tabs.onRemoved.removeListener(onTabEvent)
      chrome.tabs.onUpdated.removeListener(onTabEvent)
      chrome.tabs.onMoved.removeListener(onTabEvent)
      chrome.tabs.onAttached.removeListener(onTabEvent)
      chrome.tabs.onDetached.removeListener(onTabEvent)
      chrome.windows.onCreated.removeListener(onTabEvent)
      chrome.windows.onRemoved.removeListener(onTabEvent)
      chrome.windows.onFocusChanged.removeListener(onTabEvent)
    }
  }, [refresh])

  // 所有标签页的扁平列表
  const allTabs = useMemo(
    () => windows.flatMap((w) => w.tabs),
    [windows],
  )

  // 分组计算
  const { grouped, ungrouped } = useMemo(() => {
    if (!groupsLoaded) {
      return { grouped: [] as GroupDisplay[], ungrouped: { tabs: allTabs } as UngroupedDisplay }
    }
    return groupTabs(allTabs, groups, manualAssignments)
  }, [allTabs, groups, manualAssignments, groupsLoaded])

  // tabId → 分组名称映射
  const groupNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const g of grouped) {
      for (const tab of g.tabs) {
        map.set(tab.id, g.config.name)
      }
    }
    return map
  }, [grouped])

  const totalTabs = windows.reduce((sum, w) => sum + w.tabs.length, 0)

  const handleAssignTab = useCallback(
    (tabId: number, groupId: string | null) => {
      assignTab(tabId, groupId)
    },
    [assignTab],
  )

  const handleUnassignTab = useCallback(
    (tabId: number) => {
      assignTab(tabId, null)
    },
    [assignTab],
  )

  const handleUngroupedDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const tabId = parseInt(e.dataTransfer.getData('tabId'), 10)
      if (!isNaN(tabId)) {
        assignTab(tabId, null)
      }
    },
    [assignTab],
  )

  const handleCloseTab = useCallback(
    async (tabId: number) => {
      await closeTab(tabId)
      await refresh()
    },
    [refresh],
  )

  if (loading || !groupsLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中...
      </div>
    )
  }

  if (showManager) {
    return <GroupManager onClose={() => setShowManager(false)} />
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-800">TabFlow</h1>
        <span className="text-xs text-gray-500">
          {windows.length} 个窗口 · {totalTabs} 个标签页
        </span>
      </header>

      {/* 搜索栏 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <SearchBar allTabs={allTabs} groupNameMap={groupNameMap} />
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            viewMode === 'grouped'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setViewMode('grouped')}
        >
          分组
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            viewMode === 'all'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setViewMode('all')}
        >
          全部
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-3">
        {viewMode === 'grouped' ? (
          <>
            {grouped.map((g) => (
              <GroupSection
                key={g.config.id}
                config={g.config}
                tabs={g.tabs}
                onAssignTab={handleAssignTab}
                onUnassignTab={handleUnassignTab}
              />
            ))}

            {ungrouped.tabs.length > 0 && (
              <div
                className="mb-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleUngroupedDrop}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-xs">▼</span>
                  <span className="text-sm font-medium text-gray-500">未分组</span>
                  <span className="text-xs text-gray-400 ml-auto">{ungrouped.tabs.length}</span>
                </div>
                <div className="pb-1">
                  {ungrouped.tabs.map((tab) => (
                    <TabItem key={tab.id} tab={tab} onClose={handleCloseTab} />
                  ))}
                </div>
              </div>
            )}

            {grouped.length === 0 && ungrouped.tabs.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                没有打开的标签页
              </div>
            )}
          </>
        ) : (
          windows.map((win, i) => (
            <WindowGroup key={win.id} window={win} index={i} />
          ))
        )}
      </main>

      {/* Bottom Actions */}
      <footer className="border-t border-gray-200 p-3 space-y-2">
        <button
          className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => setShowManager(true)}
        >
          ⚙️ 管理分组
        </button>
      </footer>
    </div>
  )
}
