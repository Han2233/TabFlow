import { useState, useEffect, useMemo } from 'react'
import type { TabInfo } from '../types'
import { getTabCreatedMap } from '../utils/windowSplit'
import { TabItem } from './TabItem'
import { closeTab, closeTabs } from '../utils/tabs'
import { useTabStore } from '../store/tabStore'

interface TimeGroup {
  label: string
  tabs: TabInfo[]
}

function isToday(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isYesterday(ts: number): boolean {
  const d = new Date(ts)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

function isThisWeek(ts: number): boolean {
  const now = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return ts > weekAgo.getTime()
}

export function TimeView() {
  const { windows, refresh } = useTabStore()
  const [createdMap, setCreatedMap] = useState<Record<number, number>>({})

  useEffect(() => {
    getTabCreatedMap().then(setCreatedMap)
  }, [])

  const allTabs = useMemo(() => windows.flatMap((w) => w.tabs), [windows])

  const timeGroups = useMemo((): TimeGroup[] => {
    const today: TabInfo[] = []
    const yesterday: TabInfo[] = []
    const thisWeek: TabInfo[] = []
    const older: TabInfo[] = []

    for (const tab of allTabs) {
      const ts = createdMap[tab.id]
      if (!ts || isToday(ts)) {
        today.push(tab)
      } else if (isYesterday(ts)) {
        yesterday.push(tab)
      } else if (isThisWeek(ts)) {
        thisWeek.push(tab)
      } else {
        older.push(tab)
      }
    }

    const groups: TimeGroup[] = []
    if (today.length > 0) groups.push({ label: '今天', tabs: today })
    if (yesterday.length > 0) groups.push({ label: '昨天', tabs: yesterday })
    if (thisWeek.length > 0) groups.push({ label: '本周', tabs: thisWeek })
    if (older.length > 0) groups.push({ label: '更早', tabs: older })
    return groups
  }, [allTabs, createdMap])

  const handleCloseTab = async (tabId: number) => {
    await closeTab(tabId)
    await refresh()
    // Refresh created map
    getTabCreatedMap().then(setCreatedMap)
  }

  const handleCloseGroup = async (tabs: TabInfo[]) => {
    if (!confirm(`确定关闭这 ${tabs.length} 个标签页吗？`)) return
    const ids = tabs.map((t) => t.id)
    await closeTabs(ids)
    await refresh()
    getTabCreatedMap().then(setCreatedMap)
  }

  if (timeGroups.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-8">
        暂无标签页
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {timeGroups.map((group) => (
        <div key={group.label} className="rounded-lg border border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-gray-700">{group.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{group.tabs.length} 个</span>
              {group.label !== '今天' && (
                <button
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={() => handleCloseGroup(group.tabs)}
                >
                  一键关闭
                </button>
              )}
            </div>
          </div>
          <div className="pb-1">
            {group.tabs.map((tab) => (
              <TabItem key={tab.id} tab={tab} onClose={handleCloseTab} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
