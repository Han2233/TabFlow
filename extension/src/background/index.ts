chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
