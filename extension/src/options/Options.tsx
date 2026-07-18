// ─────────────────────────────────────────────
//  ApplyOnce AI – Options / Settings Page
// ─────────────────────────────────────────────
import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Zap, Download, Upload, Trash2, RefreshCw, ShieldCheck,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import type { UserProfile } from "@/types";

interface SettingRowProps {
  title: string;
  description: string;
  action: React.ReactNode;
  danger?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ title, description, action, danger }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1 min-w-0 mr-4">
      <p className={`text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    {action}
  </div>
);

export const Options: React.FC = () => {
  const { profile, loading, save, clear, reload } = useProfile();
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", msg: string) => {
      setToast({ type, msg });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const handleExport = useCallback(() => {
    if (!profile) {
      showToast("error", "No profile to export.");
      return;
    }
    try {
      const json = JSON.stringify(profile, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applyonce-profile-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("success", "Profile exported successfully.");
    } catch {
      showToast("error", "Failed to export profile.");
    }
  }, [profile, showToast]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as UserProfile;

        // Basic validation
        if (!imported.personalInfo) {
          throw new Error("Invalid profile format.");
        }

        await save(imported);
        showToast("success", "Profile imported successfully.");
      } catch (err) {
        showToast(
          "error",
          err instanceof Error ? err.message : "Failed to import profile."
        );
      }
    };
    input.click();
  }, [save, showToast]);

  const handleReset = useCallback(async () => {
    if (
      confirm(
        "This will permanently delete your profile and all saved data. Are you sure?"
      )
    ) {
      await clear();
      showToast("success", "All data cleared.");
    }
  }, [clear, showToast]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">ApplyOnce AI</h1>
            <p className="text-xs text-muted-foreground">Extension Settings</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 rounded-lg border p-3 mb-6 text-sm ${
              toast.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {toast.msg}
          </motion.div>
        )}

        {/* Profile Status */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Profile Status</h2>
            {profile ? (
              <Badge variant="success">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive">No Profile</Badge>
            )}
          </div>

          {profile && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-border">
                  <p className="text-xl font-bold text-primary">{profile.experience.length}</p>
                  <p className="text-xs text-muted-foreground">Work Experiences</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">{profile.skills.length}</p>
                  <p className="text-xs text-muted-foreground">Skills</p>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-border">
                  <p className="text-xl font-bold text-primary">{profile.education.length}</p>
                  <p className="text-xs text-muted-foreground">Education</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">{profile.projects.length}</p>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>
              </div>
              {profile.personalInfo.name && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs text-center text-muted-foreground">
                    {profile.personalInfo.name} · {profile.personalInfo.email}
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        {/* Data Management */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-4">Data Management</h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            <div className="px-4">
              <SettingRow
                title="Export Profile"
                description="Download your profile as a JSON file"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={!profile || loading}
                    id="export-profile-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </Button>
                }
              />
            </div>
            <div className="px-4">
              <SettingRow
                title="Import Profile"
                description="Load a previously exported JSON profile"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImport}
                    disabled={loading}
                    id="import-profile-btn"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import
                  </Button>
                }
              />
            </div>
            <div className="px-4">
              <SettingRow
                title="Reload Profile"
                description="Refresh data from storage"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reload}
                    disabled={loading}
                    id="reload-profile-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reload
                  </Button>
                }
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h2>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4">
            <SettingRow
              title="Reset All Data"
              description="Permanently delete your profile and all stored data"
              danger
              action={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReset}
                  disabled={loading}
                  id="reset-data-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset
                </Button>
              }
            />
          </div>
        </section>

        {/* Security Note */}
        <section>
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Privacy & Security</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your resume data is stored locally in your browser using{" "}
                  <code className="text-primary">chrome.storage.local</code>. It is never sent
                  to any server except Gemini AI for processing when you upload a resume or
                  trigger autofill.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong className="text-foreground">Note:</strong> This is a hackathon MVP.
                  In production, the Gemini API key would be protected via a backend proxy,
                  never bundled in the extension.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
