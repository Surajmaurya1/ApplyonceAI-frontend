// ─────────────────────────────────────────────
//  ApplyOnce AI – Background Service Worker
//  Handles extension lifecycle and message routing
// ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === "install") {
    console.log("[ApplyOnce] Extension installed.");
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === "update") {
    console.log("[ApplyOnce] Extension updated.");
  }
});

// Keep service worker alive during autofill operations
chrome.runtime.onMessage.addListener(
  (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.type === "PING") {
      sendResponse({ success: true, alive: true });
      return true;
    }

    // All other messages are handled directly between popup and content script
    // The background worker acts as a relay if needed in the future
    return false;
  }
);

// Log when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  // This fires only when there's no popup defined — with popup defined, it opens the popup
  console.log("[ApplyOnce] Extension action clicked.");
});
