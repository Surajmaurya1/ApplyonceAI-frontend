// extension/src/lib/apiClient.ts
// Authenticated HTTP client for the ApplyOnce backend.
// ALL requests from the extension to the backend go through this module.
// NEVER add AI provider API keys here. JWT tokens only.

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "../storage/authStorage.js";

const API_URL = (import.meta.env.VITE_API_URL as string) ?? "";

if (!API_URL) {
  console.error("[ApplyOnce] VITE_API_URL is not configured.");
}

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * Makes an authenticated request to the backend.
 * Automatically refreshes the access token if it receives TOKEN_EXPIRED.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  // If access token expired, try to refresh it and retry the request once
  if (response.status === 401) {
    const body = await response.json().catch(() => ({})) as {
      code?: string;
      message?: string;
      error?: string;
    };

    if (body.code === "TOKEN_EXPIRED") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers as Record<string, string> ?? {}),
        };
        const retry = await fetch(`${API_URL}${path}`, {
          ...options,
          headers: retryHeaders,
        });
        if (retry.ok) return retry.json() as Promise<T>;
      }
    }

    throw new ApiRequestError(401, body.message ?? body.error ?? "Unauthorized. Please log in.", body.code);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText })) as {
      message?: string;
      error?: string;
      code?: string;
    };
    throw new ApiRequestError(response.status, body.message ?? body.error ?? "Request failed", body.code);
  }

  return response.json() as Promise<T>;
}

/**
 * Uploads a file to the backend with JWT authentication.
 * Used for PDF resume uploads.
 */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const accessToken = await getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText })) as {
      message?: string;
      error?: string;
    };
    throw new ApiRequestError(response.status, body.message ?? body.error ?? "Upload failed");
  }

  return response.json() as Promise<T>;
}

/**
 * Attempts to get a new access token using the stored refresh token.
 * Returns the new access token or null if refresh fails.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;

    const data = await response.json() as {
      accessToken: string;
      refreshToken: string;
    };
    await saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}
