// ─────────────────────────────────────────────
//  ApplyOnce AI – PDF Text Extraction Service
//  Uses pdfjs-dist to extract text from PDF
// ─────────────────────────────────────────────
import * as pdfjs from "pdfjs-dist";

import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Set worker source locally from bundled assets to prevent CSP blocks in extensions
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export class PDFServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PDFServiceError";
  }
}

/**
 * Validates a file before processing.
 */
export function validatePDF(file: File): void {
  // Relax MIME check, some OS/browsers don't report application/pdf correctly in extension contexts
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new PDFServiceError("Only PDF files are supported.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new PDFServiceError(
      `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`
    );
  }
}

/**
 * Extracts all text content from a PDF File.
 * Returns a string containing all text from all pages.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  validatePDF(file);

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) return item.str;
        return "";
      })
      .join(" ");

    textParts.push(pageText);
  }

  const fullText = textParts.join("\n\n").trim();

  if (!fullText) {
    throw new PDFServiceError(
      "Could not extract text from this PDF. The file may be scanned or image-based."
    );
  }

  return fullText;
}
