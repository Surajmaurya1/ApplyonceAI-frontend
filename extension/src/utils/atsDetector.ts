// ─────────────────────────────────────────────
//  ApplyOnce AI – ATS Platform Detector
// ─────────────────────────────────────────────
import type { ATSPlatform } from "@/types";

interface ATSConfig {
  name: ATSPlatform;
  urlPatterns: string[];
  domSelectors?: string[];
}

const ATS_CONFIGS: ATSConfig[] = [
  {
    name: "greenhouse",
    urlPatterns: ["greenhouse.io", "boards.greenhouse.io"],
    domSelectors: ['[data-source="greenhouse"]', ".application--form"],
  },
  {
    name: "lever",
    urlPatterns: ["lever.co", "jobs.lever.co"],
    domSelectors: [".lever-job-application"],
  },
  {
    name: "ashby",
    urlPatterns: ["ashbyhq.com", "jobs.ashbyhq.com"],
    domSelectors: ["[data-testid='ashby-application']"],
  },
  {
    name: "workable",
    urlPatterns: ["workable.com", "apply.workable.com"],
    domSelectors: [".application-form", "[data-ui='application-form']"],
  },
  {
    name: "bamboohr",
    urlPatterns: ["bamboohr.com"],
    domSelectors: [".job-application__form"],
  },
];

/**
 * Detects which ATS platform the current page is using.
 */
export function detectATSPlatform(url?: string): ATSPlatform {
  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  for (const ats of ATS_CONFIGS) {
    // Check URL patterns
    if (ats.urlPatterns.some((pattern) => currentUrl.includes(pattern))) {
      return ats.name;
    }

    // Check DOM selectors (browser context only)
    if (typeof document !== "undefined" && ats.domSelectors) {
      if (ats.domSelectors.some((sel) => document.querySelector(sel))) {
        return ats.name;
      }
    }
  }

  return "generic";
}

/**
 * Returns a human-readable label for an ATS platform.
 */
export function getATSLabel(platform: ATSPlatform): string {
  const labels: Record<ATSPlatform, string> = {
    greenhouse: "Greenhouse",
    lever: "Lever",
    ashby: "Ashby",
    workable: "Workable",
    bamboohr: "BambooHR",
    generic: "Generic Form",
  };
  return labels[platform];
}
