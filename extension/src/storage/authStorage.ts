// extension/src/storage/authStorage.ts
// Stores JWT tokens in chrome.storage.local.
// chrome.storage.local is encrypted per Chrome profile — safer than localStorage.
// These are USER session tokens, NOT AI API keys.

const ACCESS_TOKEN_KEY = "ao_access_token";
const REFRESH_TOKEN_KEY = "ao_refresh_token";
const USER_KEY = "ao_user";

export interface StoredUser {
  id: string;
  email: string;
  credits: number;
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [ACCESS_TOKEN_KEY]: accessToken, [REFRESH_TOKEN_KEY]: refreshToken },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

export async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([ACCESS_TOKEN_KEY], (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result[ACCESS_TOKEN_KEY] ?? null);
    });
  });
}

export async function getRefreshToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([REFRESH_TOKEN_KEY], (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result[REFRESH_TOKEN_KEY] ?? null);
    });
  });
}

export async function saveUser(user: StoredUser): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [USER_KEY]: user }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

export async function getUser(): Promise<StoredUser | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([USER_KEY], (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result[USER_KEY] ?? null);
    });
  });
}

export async function clearAuth(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY], () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}
