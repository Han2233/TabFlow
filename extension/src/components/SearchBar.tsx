import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { TabInfo } from '../types'
import { activateTab } from '../utils/tabs'

interface SearchBarProps {
  allTabs: TabInfo[]
  groupNameMap?: Map<number, string>
}

export function SearchBar({ allTabs, groupNameMap }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 监听来自 background 的聚焦消息
  useEffect(() => {
    const handleMessage = (message: { action: string }) => {
      if (message.action === 'focusSearch') {
        inputRef.current?.focus()
      }
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // 过滤结果
  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allTabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(q) ||
        tab.url.toLowerCase().includes(q),
    )
  }, [allTabs, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('')
        setFocused(false)
        inputRef.current?.blur()
        return
      }
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % results.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const tab = results[selectedIndex]
        if (tab) {
          activateTab(tab.id, tab.windowId)
          setQuery('')
          setFocused(false)
        }
      }
    },
    [results, selectedIndex],
  )

  const handleSelect = useCallback((tab: TabInfo) => {
    activateTab(tab.id, tab.windowId)
    setQuery('')
    setFocused(false)
  }, [])

  const highlight = (text: string) => {
    if (!query.trim()) return [text]
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          🔍
        </span>
        <input
          ref={inputRef}
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50
            focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200
            outline-none transition-colors"
          placeholder="搜索标签页标题或 URL..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setFocused(true)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150)
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            ✕
          </button>
        )}
      </div>

      {focused && query.trim() && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200
            rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              未找到匹配的标签页
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                {results.length} 个结果
              </div>
              {results.map((tab, i) => (
                <button
                  key={tab.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors
                    ${i === selectedIndex ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelect(tab)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <img
                    src={
                      tab.favIconUrl ||
                      `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=16`
                    }
                    alt=""
                    className="w-4 h-4 flex-shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="%23ddd"/></svg>'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">
                      {highlight(tab.title || 'Untitled')}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {highlight(tab.url)}
                    </div>
                  </div>
                  {groupNameMap && groupNameMap.has(tab.id) && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">
                      {groupNameMap.get(tab.id)}
                    </span>
                  )}
                  {tab.pinned && (
                    <span className="text-xs flex-shrink-0">📌</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
