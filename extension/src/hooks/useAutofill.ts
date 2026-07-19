// ─────────────────────────────────────────────
//  ApplyOnce AI – useAutofill Hook
//  Orchestrates the autofill flow:
//  1. Get form fields from content script
//  2. Send to Gemini for mapping
//  3. Send mapping back to content script to fill
// ─────────────────────────────────────────────
import { useState, useCallback } from "react";
import { generateAutofillMapping } from "@/services/geminiService";
import type { UserProfile, LoadingStep, FormField, AutofillMapping } from "@/types";

interface UseAutofillReturn {
  step: LoadingStep;
  filledCount: number;
  error: string | null;
  triggerAutofill: (profile: UserProfile) => Promise<void>;
  reset: () => void;
}

/**
 * Ensures the content script is injected into the tab, then sends a message.
 * This handles file:// pages and any tab where the content script hasn't loaded yet.
 */
async function sendMessageToActiveTab<T>(
  message: { type: string; payload?: unknown }
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        reject(new Error("No active tab found. Please make sure a web page is open."));
        return;
      }

      const tabId = tab.id;

      // First try to PING the content script to see if it's already alive
      chrome.tabs.sendMessage(tabId, { type: "PING" }, (pingResponse) => {
        const isAlive = !chrome.runtime.lastError && pingResponse?.success;

        const doSend = () => {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response as T);
            }
          });
        };

        if (isAlive) {
          // Content script is already running — send the message directly
          doSend();
        } else {
          // Content script is not running — inject it programmatically first
          chrome.scripting.executeScript(
            { target: { tabId }, files: ["content.js"] },
            () => {
              if (chrome.runtime.lastError) {
                reject(
                  new Error(
                    `Could not inject into this page. ` +
                    `If this is a local file (file://), please go to chrome://extensions → ` +
                    `ApplyOnce AI → Details → enable "Allow access to file URLs", ` +
                    `then refresh the page and try again.`
                  )
                );
                return;
              }
              // Give the content script a moment to initialize
              setTimeout(doSend, 150);
            }
          );
        }
      });
    });
  });
}


export function useAutofill(): UseAutofillReturn {
  const [step, setStep] = useState<LoadingStep>("idle");
  const [filledCount, setFilledCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setFilledCount(0);
    setError(null);
  }, []);

  const triggerAutofill = useCallback(async (profile: UserProfile) => {
    setError(null);
    setFilledCount(0);

    try {
      // Step 1: Detect form fields
      setStep("detecting_form");
      const fieldsResponse = await sendMessageToActiveTab<{
        success: boolean;
        fields?: FormField[];
        error?: string;
      }>({ type: "GET_FIELDS" });

      if (!fieldsResponse.success || !fieldsResponse.fields?.length) {
        throw new Error(
          fieldsResponse.error || "No form fields detected on this page."
        );
      }

      const fields = fieldsResponse.fields;

      // Step 2: Gemini mapping
      setStep("ai_mapping");
      const mapping: AutofillMapping = await generateAutofillMapping(profile, fields);

      if (Object.keys(mapping).length === 0) {
        throw new Error("AI could not map any fields. The form may not be a job application.");
      }

      // Step 3: Fill the form
      setStep("filling_form");
      const fillResponse = await sendMessageToActiveTab<{
        success: boolean;
        filledCount?: number;
        error?: string;
      }>({ type: "AUTOFILL", payload: mapping });

      if (!fillResponse.success) {
        throw new Error(fillResponse.error || "Failed to fill form.");
      }

      setFilledCount(fillResponse.filledCount ?? 0);
      setStep("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to generate mapping. Please try again.";
      setError(message);
      setStep("error");
    }
  }, []);

  return { step, filledCount, error, triggerAutofill, reset };
}
