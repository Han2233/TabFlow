import { useState, useCallback } from 'react'
import type { TabInfo } from '../types'
import { activateTab } from '../utils/tabs'

interface TabItemProps {
  tab: TabInfo
  onClose: (tabId: number) => void
  onUnassign?: (tabId: number) => void
}

export function TabItem({ tab, onClose, onUnassign }: TabItemProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleClick = useCallback(() => {
    activateTab(tab.id, tab.windowId)
  }, [tab.id, tab.windowId])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setShowMenu(true)
  }, [])

  const handleCloseTab = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose(tab.id)
    },
    [tab.id, onClose],
  )

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(tab.url)
    setShowMenu(false)
  }, [tab.url])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('tabId', String(tab.id))
      e.dataTransfer.effectAllowed = 'move'
    },
    [tab.id],
  )

  const favicon = tab.favIconUrl
    ? tab.favIconUrl
    : `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=16`

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md group
          ${tab.active ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
          ${tab.discarded ? 'opacity-50' : ''}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={`${tab.title}\n${tab.url}`}
        draggable
        onDragStart={handleDragStart}
      >
        <img
          src={favicon}
          alt=""
          className="w-4 h-4 flex-shrink-0"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="%23ddd"/></svg>'
          }}
        />
        <span className="text-sm truncate flex-1">{tab.title || 'Untitled'}</span>
        {tab.pinned && <span className="text-xs text-gray-400">📌</span>}
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0 text-xs"
          onClick={handleCloseTab}
          title="关闭标签页"
        >
          ✕
        </button>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
              onClick={handleCopyUrl}
            >
              复制链接
            </button>
            {onUnassign && (
              <button
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onUnassign(tab.id)
                  setShowMenu(false)
                }}
              >
                取消分组
              </button>
            )}
            <button
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 text-red-600"
              onClick={(e) => {
                handleCloseTab(e)
                setShowMenu(false)
              }}
            >
              关闭标签页
            </button>
          </div>
        </>
      )}
    </div>
  )
}
