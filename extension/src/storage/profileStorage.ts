// ─────────────────────────────────────────────
//  ApplyOnce AI – chrome.storage.local wrapper
// ─────────────────────────────────────────────
import type { UserProfile } from "@/types";

const PROFILE_KEY = "userProfile";

/**
 * Save the parsed profile to chrome.storage.local.
 * Never stores the PDF binary — only structured JSON.
 */
export async function saveProfile(profile: UserProfile): Promise<void> {
  const updated: UserProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
    createdAt: profile.createdAt ?? new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [PROFILE_KEY]: updated }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Load the saved profile. Returns null if no profile exists.
 */
export async function loadProfile(): Promise<UserProfile | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PROFILE_KEY], (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[PROFILE_KEY] ?? null);
      }
    });
  });
}

/**
 * Remove the stored profile entirely.
 */
export async function clearProfile(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([PROFILE_KEY], () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}
