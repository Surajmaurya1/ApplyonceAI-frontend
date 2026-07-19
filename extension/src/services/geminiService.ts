// extension/src/services/geminiService.ts
// ─────────────────────────────────────────────
//  ApplyOnce AI – Backend API Service
//
//  This file previously called AI providers directly using embedded API keys.
//  It now calls the ApplyOnce backend API using JWT authentication.
//
//  NO AI API KEYS exist in this file or anywhere in the extension.
//  The backend holds all provider keys securely.
// ─────────────────────────────────────────────
import { apiRequest, uploadFile } from "../lib/apiClient.js";
import type { UserProfile, FormField, AutofillMapping } from "../types/index.js";

interface ResumeUploadResponse {
  message: string;
  profile: UserProfile;
}

interface ResumeAnalyzeResponse {
  message: string;
  profile: UserProfile;
}

interface AutofillResponse {
  mapping: AutofillMapping;
}

/**
 * Parses resume text into a structured UserProfile.
 *
 * If `input` is a File, it uploads the PDF to the backend (server-side PDF extraction + AI).
 * If `input` is a string, it sends the extracted text to the backend for AI parsing.
 *
 * The function name is preserved for backward compatibility.
 */
export async function parseResumeToProfile(
  input: File | string
): Promise<UserProfile> {
  let response: ResumeUploadResponse | ResumeAnalyzeResponse;

  if (input instanceof File) {
    // Upload PDF directly — backend handles extraction and AI parsing
    response = await uploadFile<ResumeUploadResponse>("/api/v1/resume/upload", input);
  } else {
    // Send extracted text — backend handles AI parsing
    response = await apiRequest<ResumeAnalyzeResponse>("/api/v1/resume/analyze", {
      method: "POST",
      body: JSON.stringify({ resumeText: input }),
    });
  }

  if (!response.profile?.personalInfo) {
    throw new Error("Backend returned an invalid profile structure.");
  }

  return response.profile;
}

/**
 * Generates an autofill mapping from a profile and detected form fields.
 *
 * The function signature is preserved for backward compatibility with useAutofill.ts.
 * Internally, this now calls the backend instead of calling AI providers directly.
 */
export async function generateAutofillMapping(
  profile: UserProfile,
  fields: FormField[]
): Promise<AutofillMapping> {
  if (fields.length === 0) return {};

  // Strip resumeText to reduce payload size
  const profileForBackend = { ...profile, resumeText: undefined };

  const response = await apiRequest<AutofillResponse>("/api/v1/ai/autofill", {
    method: "POST",
    body: JSON.stringify({ profile: profileForBackend, fields }),
  });

  if (!response.mapping || typeof response.mapping !== "object") {
    throw new Error("Backend returned an invalid autofill mapping.");
  }

  return response.mapping;
}
