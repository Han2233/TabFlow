// 点击扩展图标 → 打开侧边栏（当没有 popup 时生效）
chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
})

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open_side_panel') {
    // 打开侧边栏
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
  }

  if (command === 'search_tabs') {
    // 打开侧边栏并通知聚焦搜索框
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
      .then(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'focusSearch' })
        }, 300)
      })
      .catch(() => {
        // 如果侧边栏已打开，直接发送消息
        chrome.runtime.sendMessage({ action: 'focusSearch' })
      })
  }
})
