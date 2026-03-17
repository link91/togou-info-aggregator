chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "tugou:open" && message.url) {
    chrome.tabs.create({ url: message.url }, () => sendResponse({ ok: true }));
    return true;
  }

  // 代理 fetch 请求，绕过 CORS 限制
  if (message?.type === "tugou:fetch") {
    const { url, options } = message;

    fetch(url, {
      method: options?.method || "GET",
      headers: options?.headers || {},
      body: options?.body,
      credentials: "include",
    })
      .then(async (resp) => {
        const contentType = resp.headers.get("content-type") || "";
        const text = await resp.text();
        sendResponse({
          ok: resp.ok,
          status: resp.status,
          contentType,
          body: text,
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, status: 0, error: err.message });
      });

    return true;
  }

  return false;
});
