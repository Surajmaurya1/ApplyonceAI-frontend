// ─────────────────────────────────────────────
//  ApplyOnce AI – useProfile Hook
//  Manages profile state from chrome.storage.local
// ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { loadProfile, saveProfile, clearProfile } from "@/storage/profileStorage";
import type { UserProfile } from "@/types";

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  save: (p: UserProfile) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const p = await loadProfile();
      setProfile(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (p: UserProfile) => {
    try {
      setError(null);
      await saveProfile(p);
      setProfile(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      throw err;
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      setError(null);
      await clearProfile();
      setProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear profile");
      throw err;
    }
  }, []);

  return {
    profile,
    loading,
    error,
    save,
    clear,
    reload: load,
  };
}
