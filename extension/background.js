chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "tugou:open" && message.url) {
    chrome.tabs.create({ url: message.url }, () => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
