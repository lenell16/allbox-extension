chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.create({
    url: 'tabs.html',
  });
});

function moveTabs(tabIds) {
  chrome.windows.create((window) =>
    chrome.tabs.move(tabIds, { windowId: window.id, index: -1 })
  );
}

function clickHandler(info, selectedTab) {
  if (info.menuItemId === 'moveOne') {
    const tabIds = [selectedTab.id];
    moveTabs(tabIds);
  }

  if (info.menuItemId === 'moveHighlighted') {
    chrome.tabs.query(
      { highlighted: true, windowId: selectedTab.windowId },
      (tabs) => {
        const tabIds = tabs.map((tab) => tab.id);
        moveTabs(tabIds);
      }
    );
  }

  if (['moveLeft', 'moveRight'].includes(info.menuItemId)) {
    chrome.tabs.getAllInWindow((tabs) => {
      const tabIds = tabs
        .filter((tab) =>
          info.menuItemId === 'moveLeft'
            ? tab.index >= selectedTab.index
            : tab.index <= selectedTab.index
        )
        .map((tab) => tab.id);
      moveTabs(tabIds);
    });
  }
}

// function noteHandler(info, selectedTab) {
//   chrome.notifications.create()
// }

// chrome.contextMenus.create({
//   title: "Test Note",
//   onclick: noteHandler
// })

chrome.contextMenus.create({
  id: 'move',
  title: 'Move Tabs',
});
chrome.contextMenus.create({
  id: 'moveLeft',
  parentId: 'move',
  title: 'Move tabs to left',
  onclick: clickHandler,
});
chrome.contextMenus.create({
  id: 'moveRight',
  parentId: 'move',
  title: 'Move tabs to right',
  onclick: clickHandler,
});
chrome.contextMenus.create({
  id: 'moveOne',
  parentId: 'move',
  title: 'Move this tab',
  onclick: clickHandler,
});
chrome.contextMenus.create({
  id: 'moveHighlighted',
  parentId: 'move',
  title: 'Move highlighted tabs',
  onclick: clickHandler,
});
// chrome.contextMenus.create({type:'separator'});
