// ─────────────────────────────────────────────
//  ApplyOnce AI – Autofill Button Component
// ─────────────────────────────────────────────
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, CheckCircle2, AlertCircle, Loader2, Search, Brain, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LoadingStep } from "@/types";

interface AutofillButtonProps {
  step: LoadingStep;
  filledCount: number;
  error: string | null;
  onAutofill: () => void;
  onReset: () => void;
  disabled?: boolean;
}

const STEP_PROGRESS: Record<LoadingStep, number> = {
  idle: 0,
  uploading: 15,
  reading_pdf: 30,
  analyzing_resume: 50,
  generating_profile: 70,
  saving_profile: 90,
  detecting_form: 25,
  ai_mapping: 60,
  filling_form: 90,
  success: 100,
  error: 0,
};

const STEP_CONFIG: Record<
  LoadingStep,
  { label: string; icon: React.ReactNode; color: string }
> = {
  idle: { label: "Autofill This Page", icon: <Zap className="w-4 h-4" />, color: "" },
  uploading: { label: "Uploading...", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-muted-foreground" },
  reading_pdf: { label: "Reading PDF...", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-muted-foreground" },
  analyzing_resume: { label: "Analyzing Resume...", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-muted-foreground" },
  generating_profile: { label: "Generating Profile...", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-muted-foreground" },
  saving_profile: { label: "Saving Profile...", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-muted-foreground" },
  detecting_form: { label: "Detecting Form Fields...", icon: <Search className="w-4 h-4 animate-pulse" />, color: "text-primary" },
  ai_mapping: { label: "AI Mapping Fields...", icon: <Brain className="w-4 h-4 animate-pulse" />, color: "text-primary" },
  filling_form: { label: "Filling Form...", icon: <PenLine className="w-4 h-4 animate-pulse" />, color: "text-primary" },
  success: { label: "Done!", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400" },
  error: { label: "Try Again", icon: <AlertCircle className="w-4 h-4" />, color: "text-destructive" },
};

export const AutofillButton: React.FC<AutofillButtonProps> = ({
  step,
  filledCount,
  error,
  onAutofill,
  onReset,
  disabled,
}) => {
  const isLoading =
    step === "detecting_form" || step === "ai_mapping" || step === "filling_form";
  const isSuccess = step === "success";
  const isError = step === "error";
  const config = STEP_CONFIG[step];

  return (
    <div className="flex flex-col gap-2">
      {/* Main Button */}
      <motion.div layout>
        <Button
          id="autofill-btn"
          variant={isSuccess ? "outline" : isError ? "destructive" : "glow"}
          size="lg"
          className="w-full"
          onClick={isSuccess || isError ? onReset : onAutofill}
          disabled={disabled || isLoading}
        >
          <span className={config.color}>{config.icon}</span>
          <span>{config.label}</span>
        </Button>
      </motion.div>

      {/* Progress Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-1.5"
          >
            <Progress value={STEP_PROGRESS[step]} className="h-1" />
            <p className={`text-xs text-center ${config.color}`}>{config.label}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Info */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 py-2 px-3"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <p className="text-xs text-green-400 font-medium">
              Filled {filledCount} field{filledCount !== 1 ? "s" : ""} successfully
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Info */}
      <AnimatePresence>
        {isError && error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 py-2 px-3"
          >
            <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive/90">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
