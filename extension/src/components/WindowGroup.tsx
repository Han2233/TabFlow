import { useState, useCallback } from 'react'
import type { WindowInfo } from '../types'
import { TabItem } from './TabItem'
import { closeTab } from '../utils/tabs'
import { useTabStore } from '../store/tabStore'

interface WindowGroupProps {
  window: WindowInfo
  index: number
}

export function WindowGroup({ window: win, index }: WindowGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const refresh = useTabStore((s) => s.refresh)

  const handleCloseTab = useCallback(
    async (tabId: number) => {
      await closeTab(tabId)
      await refresh()
    },
    [refresh],
  )

  return (
    <div className="mb-2">
      <button
        className={`flex items-center gap-2 w-full px-3 py-2 text-left rounded-lg
          ${win.focused ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}
          hover:bg-gray-200 transition-colors`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
        <span className="text-sm font-medium">
          窗口 {index + 1}
          {win.focused && ' (当前)'}
        </span>
        <span className="text-xs text-gray-500 ml-auto">{win.tabs.length} 个标签页</span>
      </button>

      {!collapsed && (
        <div className="mt-1 ml-1">
          {win.tabs.map((tab) => (
            <TabItem key={tab.id} tab={tab} onClose={handleCloseTab} />
          ))}
        </div>
      )}
    </div>
  )
}
