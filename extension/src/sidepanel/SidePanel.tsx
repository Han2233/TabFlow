import { useEffect } from 'react'
import { useTabStore } from '../store/tabStore'
import { WindowGroup } from '../components/WindowGroup'

export default function SidePanel() {
  const { windows, loading, refresh } = useTabStore()

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

  const totalTabs = windows.reduce((sum, w) => sum + w.tabs.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-800">TabFlow</h1>
        <span className="text-xs text-gray-500">
          {windows.length} 个窗口 · {totalTabs} 个标签页
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-3">
        {windows.map((win, i) => (
          <WindowGroup key={win.id} window={win} index={i} />
        ))}
      </main>
    </div>
  )
}
