// 点击扩展图标 → 打开侧边栏（当没有 popup 时生效）
chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
})
