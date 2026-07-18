// ─────────────────────────────────────────────
//  ApplyOnce AI – Shared TypeScript Types
// ─────────────────────────────────────────────

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  description?: string;
}

export interface Experience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  highlights?: string[];
}

export interface Project {
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
  startDate?: string;
  endDate?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface Links {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
  [key: string]: string | undefined;
}

export interface UserProfile {
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  certifications: Certification[];
  links: Links;
  resumeText: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  ariaLabel: string;
  value: string;
  options?: string[]; // for select/radio
  required?: boolean;
  visible?: boolean;
}

export type AutofillMapping = Record<string, string>;

export type LoadingStep =
  | "idle"
  | "uploading"
  | "reading_pdf"
  | "analyzing_resume"
  | "generating_profile"
  | "saving_profile"
  | "detecting_form"
  | "ai_mapping"
  | "filling_form"
  | "success"
  | "error";

export const LOADING_STEP_LABELS: Record<LoadingStep, string> = {
  idle: "Ready",
  uploading: "Uploading...",
  reading_pdf: "Reading PDF...",
  analyzing_resume: "Analyzing Resume...",
  generating_profile: "Generating Profile...",
  saving_profile: "Saving Profile...",
  detecting_form: "Detecting Form...",
  ai_mapping: "AI Mapping...",
  filling_form: "Filling Form...",
  success: "Done!",
  error: "Something went wrong",
};

export type ATSPlatform =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "bamboohr"
  | "generic";

export interface ChromeMessage {
  type: "GET_FIELDS" | "AUTOFILL" | "PING";
  payload?: AutofillMapping;
}

export interface ChromeResponse {
  success: boolean;
  fields?: FormField[];
  error?: string;
  filledCount?: number;
}
