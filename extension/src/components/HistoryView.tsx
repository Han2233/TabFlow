import { useEffect } from 'react'
import { useCloseHistoryStore, type ClosedTab } from '../store/closeHistoryStore'
import { initCloseHistory } from '../utils/pendingClose'

interface HistoryViewProps {
  onClose: () => void
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryView({ onClose }: HistoryViewProps) {
  const { history, loaded, load, clearHistory } = useCloseHistoryStore()

  useEffect(() => {
    initCloseHistory()
  }, [])

  const handleRestore = async (tab: ClosedTab) => {
    // 检查是否已打开相同 URL
    const existing = await chrome.tabs.query({ url: tab.url })
    if (existing.length > 0) {
      // 已打开，直接跳转
      await chrome.tabs.update(existing[0].id!, { active: true })
      await chrome.windows.update(existing[0].windowId, { focused: true })
    } else {
      await chrome.tabs.create({ url: tab.url, active: true })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">关闭历史</h2>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              className="text-xs text-red-400 hover:text-red-600"
              onClick={() => { if (confirm('清空所有关闭历史？')) clearHistory() }}
            >
              清空
            </button>
          )}
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onClose}>
            返回 ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!loaded ? (
          <div className="text-center text-gray-400 text-sm py-4">加载中...</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            <div className="text-3xl mb-2">📭</div>
            <div>暂无关闭记录</div>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map((tab) => (
              <button
                key={tab.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-md
                  hover:bg-gray-50 transition-colors group"
                onClick={() => handleRestore(tab)}
                title={`恢复：${tab.title}\n${tab.url}`}
              >
                <img
                  src={tab.favIconUrl || ''}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="%23ddd"/></svg>'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{tab.title}</div>
                  <div className="text-xs text-gray-400 truncate">{tab.url}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{formatTime(tab.closedAt)}</span>
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100">
                    恢复
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
