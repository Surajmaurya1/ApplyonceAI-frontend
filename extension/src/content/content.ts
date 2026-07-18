// ─────────────────────────────────────────────
//  ApplyOnce AI – Content Script
//  Injected into all pages to:
//  - Detect form fields on request
//  - Execute autofill when given a mapping
// ─────────────────────────────────────────────
import { detectFormFields } from "../utils/formDetector";
import { autofillForm } from "../utils/autofillEngine";
import type { ChromeMessage, ChromeResponse } from "../types";

// Signal that the content script is alive
console.log("[ApplyOnce] Content script loaded on:", window.location.href);

chrome.runtime.onMessage.addListener(
  (
    message: ChromeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ChromeResponse) => void
  ) => {
    if (message.type === "GET_FIELDS") {
      try {
        const fields = detectFormFields();
        sendResponse({ success: true, fields });
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to detect fields";
        console.error("[ApplyOnce] Field detection error:", error);
        sendResponse({ success: false, error });
      }
      return true; // Keep message channel open for async
    }

    if (message.type === "AUTOFILL" && message.payload) {
      try {
        const filledCount = autofillForm(message.payload);
        sendResponse({ success: true, filledCount });
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to autofill form";
        console.error("[ApplyOnce] Autofill error:", error);
        sendResponse({ success: false, error });
      }
      return true;
    }

    if (message.type === "PING") {
      sendResponse({ success: true });
      return true;
    }

    return false;
  }
);
