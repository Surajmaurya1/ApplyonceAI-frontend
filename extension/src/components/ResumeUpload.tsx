// ─────────────────────────────────────────────
//  ApplyOnce AI – Resume Upload Component
// ─────────────────────────────────────────────
import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { extractTextFromPDF, PDFServiceError } from "@/services/pdfService";
import { parseResumeToProfile } from "@/services/geminiService";
import type { UserProfile, LoadingStep } from "@/types";
import { cn } from "@/lib/utils";

const STEP_PROGRESS: Record<LoadingStep, number> = {
  idle: 0,
  uploading: 10,
  reading_pdf: 30,
  analyzing_resume: 55,
  generating_profile: 75,
  saving_profile: 90,
  detecting_form: 50,
  ai_mapping: 70,
  filling_form: 90,
  success: 100,
  error: 0,
};

const STEP_LABELS: Record<LoadingStep, string> = {
  idle: "",
  uploading: "Uploading...",
  reading_pdf: "Reading PDF...",
  analyzing_resume: "Analyzing Resume...",
  generating_profile: "Generating Profile...",
  saving_profile: "Saving Profile...",
  detecting_form: "Detecting Form...",
  ai_mapping: "AI Mapping...",
  filling_form: "Filling Form...",
  success: "Profile Created!",
  error: "Something went wrong",
};

interface ResumeUploadProps {
  onProfileCreated: (profile: UserProfile) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ onProfileCreated }) => {
  const [step, setStep] = useState<LoadingStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      try {
        // Step 1: Upload
        setStep("uploading");
        await new Promise((r) => setTimeout(r, 300));

        // Step 2: Read PDF
        setStep("reading_pdf");
        const text = await extractTextFromPDF(file);

        // Step 3: Analyze
        setStep("analyzing_resume");
        await new Promise((r) => setTimeout(r, 200));

        // Step 4: Gemini parse
        setStep("generating_profile");
        const profile = await parseResumeToProfile(text);

        // Step 5: Save (caller handles chrome.storage)
        setStep("saving_profile");
        await new Promise((r) => setTimeout(r, 300));

        setStep("success");
        setTimeout(() => onProfileCreated(profile), 800);
      } catch (err) {
        const message =
          err instanceof PDFServiceError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to process resume. Please try again.";
        setError(message);
        setStep("error");
      }
    },
    [onProfileCreated]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const isLoading =
    step !== "idle" && step !== "success" && step !== "error";

  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-sm font-semibold text-foreground">Profile Created!</p>
        <p className="text-xs text-muted-foreground">Your resume has been processed.</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome Header */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 mb-3">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground">Welcome to ApplyOnce AI</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Upload your resume once. Fill every application instantly.
        </p>
      </div>

      {/* Drop Zone */}
      <label
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-primary/70 bg-primary/10"
            : "border-border hover:border-primary/40 hover:bg-secondary/50",
          isLoading && "pointer-events-none opacity-60"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isLoading}
          id="resume-upload-input"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-primary">
              {STEP_LABELS[step]}
            </p>
            <Progress value={STEP_PROGRESS[step]} className="w-full" />
          </div>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Upload className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">
                Drop your resume here
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                or click to browse
              </p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground/70">
              <span>PDF only</span>
              <span>·</span>
              <span>Max 5 MB</span>
            </div>
          </>
        )}
      </label>

      {/* Upload Button */}
      {!isLoading && (
        <Button
          variant="glow"
          size="default"
          className="w-full"
          onClick={() => document.getElementById("resume-upload-input")?.click()}
          id="upload-resume-btn"
        >
          <Upload className="w-4 h-4" />
          Upload Resume
        </Button>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
          >
            <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive">Error</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => { setError(null); setStep("idle"); }}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
