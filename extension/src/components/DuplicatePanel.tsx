import { useMemo } from 'react'
import { useTabStore } from '../store/tabStore'
import { TabItem } from './TabItem'
import { detectDuplicates, mergeDuplicates, type DuplicateGroup } from '../utils/duplicateDetector'
import { closeTab } from '../utils/tabs'

interface DuplicatePanelProps {
  onClose: () => void
}

export function DuplicatePanel({ onClose }: DuplicatePanelProps) {
  const { windows, refresh } = useTabStore()

  const allTabs = useMemo(() => windows.flatMap((w) => w.tabs), [windows])
  const duplicates = useMemo(() => detectDuplicates(allTabs), [allTabs])

  const handleMerge = async (group: DuplicateGroup) => {
    await mergeDuplicates(group)
    await refresh()
  }

  const handleCloseTab = async (tabId: number) => {
    await closeTab(tabId)
    await refresh()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">重复检测</h2>
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onClose}>
          返回 ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {duplicates.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            <div className="text-3xl mb-2">✨</div>
            <div>没有发现重复标签页</div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              发现 {duplicates.length} 组重复，共涉及 {duplicates.reduce((s, g) => s + g.tabs.length, 0)} 个标签页
            </p>
            {duplicates.map((group, i) => (
              <div key={i} className="border border-orange-200 rounded-lg bg-orange-50/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-700">
                    {group.reason} ({group.tabs.length} 个)
                  </span>
                  <button
                    className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                    onClick={() => handleMerge(group)}
                  >
                    合并保留一个
                  </button>
                </div>
                <div className="space-y-0.5">
                  {group.tabs.map((tab) => (
                    <TabItem key={tab.id} tab={tab} onClose={handleCloseTab} />
                  ))}
                </div>
              </div>
            ))}

            {/* 一键合并全部 */}
            <button
              className="w-full px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              onClick={async () => {
                for (const g of duplicates) {
                  await mergeDuplicates(g)
                }
                await refresh()
              }}
            >
              一键合并全部 ({duplicates.length} 组)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
