// ─────────────────────────────────────────────
//  ApplyOnce AI – Main Popup Component
// ─────────────────────────────────────────────
import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, User, Settings, RotateCcw, ExternalLink, Trash2, LogOut,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ResumeUpload } from "@/components/ResumeUpload";
import { ProfileView } from "@/components/ProfileView";
import { AutofillButton } from "@/components/AutofillButton";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AuthGate } from "@/components/AuthGate";
import { useProfile } from "@/hooks/useProfile";
import { useAutofill } from "@/hooks/useAutofill";
import { useAuth } from "@/hooks/useAuth";
import type { UserProfile } from "@/types";

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
};

export const Popup: React.FC = () => {
  const { profile, loading: profileLoading, save, clear } = useProfile();
  const { step, filledCount, error, triggerAutofill, reset } = useAutofill();
  const { user, isAuthenticated, loading: authLoading, login, register, logout } = useAuth();

  const handleProfileCreated = useCallback(
    async (newProfile: UserProfile) => {
      await save(newProfile);
    },
    [save]
  );

  const handleAutofill = useCallback(() => {
    if (profile) triggerAutofill(profile);
  }, [profile, triggerAutofill]);

  const handleClearProfile = useCallback(async () => {
    if (confirm("Are you sure you want to clear your profile?")) {
      await clear();
      reset();
    }
  }, [clear, reset]);

  const openOptions = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  const handleLogout = useCallback(async () => {
    if (confirm("Are you sure you want to log out?")) {
      await logout();
      reset();
    }
  }, [logout, reset]);

  const loading = profileLoading || authLoading;

  return (
    <div className="w-[360px] min-h-[480px] max-h-[600px] bg-background flex flex-col relative overflow-hidden">
      {/* Loading overlay for initial load */}
      <LoadingOverlay visible={loading} message="Loading..." />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight">
              ApplyOnce AI
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge />
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openOptions}
              id="open-options-btn"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* ── Auth Gate ── */
          <motion.div
            key="auth"
            {...fadeIn}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <AuthGate
              login={login}
              register={register}
              onAuthSuccess={() => {}}
            />
          </motion.div>
        ) : !profile ? (
          /* ── First Time: Upload Screen ── */
          <motion.div
            key="upload"
            {...fadeIn}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            <ResumeUpload onProfileCreated={handleProfileCreated} />
          </motion.div>
        ) : (
          /* ── Profile Exists: Main UI ── */
          <motion.div
            key="main"
            {...fadeIn}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Tabs defaultValue="home" className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Nav */}
              <div className="px-4 pt-3">
                <TabsList className="w-full">
                  <TabsTrigger value="home" id="tab-home">
                    <Zap className="w-3 h-3" />
                    Home
                  </TabsTrigger>
                  <TabsTrigger value="profile" id="tab-profile">
                    <User className="w-3 h-3" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="settings" id="tab-settings">
                    <Settings className="w-3 h-3" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Home Tab */}
              <TabsContent
                value="home"
                className="flex-1 overflow-y-auto px-4 pb-4"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4 pt-2"
                >
                  {/* Profile summary card */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(profile.personalInfo.name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {profile.personalInfo.name || "Your Profile"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {profile.personalInfo.email || user?.email}
                          </p>
                        </div>
                      </div>
                      {user && (
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-foreground">{user.credits} CR</p>
                          <p className="text-[10px] text-muted-foreground">Credits</p>
                        </div>
                      )}
                    </div>

                    <Separator className="my-2.5" />

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-primary">
                          {profile.experience.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Jobs</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">
                          {profile.skills.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Skills</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">
                          {profile.education.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Degrees</p>
                      </div>
                    </div>
                  </div>

                  {/* Autofill CTA */}
                  <AutofillButton
                    step={step}
                    filledCount={filledCount}
                    error={error}
                    onAutofill={handleAutofill}
                    onReset={reset}
                  />

                  {/* Tip */}
                  <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">Tip:</span>{" "}
                      Navigate to a job application page, then click{" "}
                      <span className="text-primary font-medium">Autofill</span> to
                      let AI fill the form automatically.
                    </p>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent
                value="profile"
                className="flex-1 overflow-y-auto px-4 pb-4"
              >
                <ProfileView profile={profile} onSave={save} />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent
                value="settings"
                className="flex-1 overflow-y-auto px-4 pb-4"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-3 pt-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Actions</p>
                    <p className="text-xs text-muted-foreground">
                      Manage your profile and extension settings
                    </p>
                  </div>

                  <Separator />

                  {/* Upload new resume */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Upload New Resume</p>
                      <p className="text-xs text-muted-foreground">Replace current profile</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clear()}
                      id="replace-resume-btn"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Replace
                    </Button>
                  </div>

                  <Separator />

                  {/* Options page */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Full Settings</p>
                      <p className="text-xs text-muted-foreground">Export, import, reset data</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openOptions}
                      id="open-options-settings-btn"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </Button>
                  </div>

                  <Separator />

                  {/* Logout */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Log Out</p>
                      <p className="text-xs text-muted-foreground">Sign out of your session</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      id="logout-btn"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </Button>
                  </div>

                  <Separator />

                  {/* Clear Profile */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-destructive">Clear Profile</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your data</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearProfile}
                      id="clear-profile-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </Button>
                  </div>

                  <Separator />

                  {/* Profile stats */}
                  {profile.updatedAt && (
                    <p className="text-xs text-muted-foreground/60 text-center">
                      Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
