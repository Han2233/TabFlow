import { useState, useMemo } from 'react'
import { useTabStore } from '../store/tabStore'
import { useGroupStore } from '../store/groupStore'
import { buildSplitGroups, splitToNewWindows, splitReplaceCurrent } from '../utils/windowSplit'

interface SplitWindowsProps {
  onClose: () => void
}

export function SplitWindows({ onClose }: SplitWindowsProps) {
  const { windows } = useTabStore()
  const { groups, manualAssignments } = useGroupStore()

  const [splitting, setSplitting] = useState(false)
  const [resultMsg, setResultMsg] = useState('')

  const allTabs = useMemo(() => windows.flatMap((w) => w.tabs), [windows])
  const splitGroups = useMemo(
    () => buildSplitGroups(allTabs, groups, manualAssignments),
    [allTabs, groups, manualAssignments],
  )

  const handleNewWindows = async () => {
    setSplitting(true)
    await splitToNewWindows(splitGroups)
    setSplitting(false)
    setResultMsg(`✅ 已创建 ${splitGroups.length} 个浏览器窗口`)
    setTimeout(() => onClose(), 1500)
  }

  const handleReplace = async () => {
    if (!confirm('替换将关闭当前所有窗口，确定吗？')) return
    setSplitting(true)
    await splitReplaceCurrent(splitGroups)
    setSplitting(false)
    setResultMsg(`✅ 已替换为 ${splitGroups.length} 个窗口（含未分组）`)
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">一键分窗口</h2>
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onClose}>
          返回 ✕
        </button>
      </div>

      {/* 成功提示 */}
      {resultMsg && (
        <div className="mx-4 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
          {resultMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <p className="text-xs text-gray-500">
          每个分组将在独立的新浏览器窗口中打开，原标签页保持不变：
        </p>

        {splitGroups.map((sg, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-800">
                {sg.name}
              </span>
              <span className="text-xs text-gray-400">
                {sg.tabs.length} 个标签页
              </span>
            </div>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {sg.tabs.slice(0, 5).map((tab) => (
                <div key={tab.id} className="text-xs text-gray-500 truncate pl-2 border-l-2 border-gray-200">
                  {tab.title || 'Untitled'}
                </div>
              ))}
              {sg.tabs.length > 5 && (
                <div className="text-xs text-gray-400 pl-2">
                  ...还有 {sg.tabs.length - 5} 个标签页
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 p-3 space-y-2">
        <button
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600
            disabled:opacity-50 transition-colors"
          onClick={handleNewWindows}
          disabled={splitting}
        >
          {splitting ? '处理中...' : `创建 ${splitGroups.length} 个新窗口`}
        </button>
        <button
          className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100
            disabled:opacity-50 transition-colors"
          onClick={handleReplace}
          disabled={splitting}
        >
          {splitting ? '处理中...' : '替换当前所有窗口'}
        </button>
      </div>
    </div>
  )
}
