chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'search_tabs') {
    // 打开侧边栏并通知聚焦搜索框
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
      .then(() => {
        // 延迟发送消息，确保侧边栏已加载
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
chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
