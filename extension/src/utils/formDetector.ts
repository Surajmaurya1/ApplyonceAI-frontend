// ─────────────────────────────────────────────
//  ApplyOnce AI – Form Field Detector
//  Detects visible form fields on any page
// ─────────────────────────────────────────────
import type { FormField } from "@/types";

/**
 * Finds the label text associated with a form element.
 * Checks: <label for="id">, aria-label, aria-labelledby, placeholder, name.
 */
function getFieldLabel(el: HTMLElement): string {
  // 1. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();

  // 2. aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.innerText.trim();
  }

  // 3. <label for="id">
  const id = el.getAttribute("id");
  if (id) {
    const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (labelEl) return labelEl.innerText.trim();
  }

  // 4. Closest wrapping label
  const closestLabel = el.closest("label");
  if (closestLabel) {
    const clone = closestLabel.cloneNode(true) as HTMLElement;
    // Remove input from clone to get just the label text
    clone.querySelectorAll("input, select, textarea").forEach((n) => n.remove());
    const text = clone.innerText.trim();
    if (text) return text;
  }

  // 5. Preceding sibling label
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.tagName === "LABEL") return (prev as HTMLElement).innerText.trim();
    if (prev.tagName === "INPUT" || prev.tagName === "TEXTAREA") break;
    prev = prev.previousElementSibling;
  }

  // 6. Parent text content (last resort)
  const parent = el.parentElement;
  if (parent) {
    const parentText = parent.innerText?.trim();
    if (parentText && parentText.length < 100) return parentText;
  }

  return "";
}

/**
 * Checks if an element is visible to the user.
 */
function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  // Allow elements slightly off-screen (lazy loaded sections)
  return rect.width > 0 && rect.height > 0;
}

/**
 * Gets options for select, radio, and checkbox groups.
 */
function getOptions(el: HTMLElement): string[] {
  if (el.tagName === "SELECT") {
    return Array.from((el as HTMLSelectElement).options).map((o) => o.text.trim());
  }
  // For radio/checkbox groups, find siblings with same name
  const name = el.getAttribute("name");
  if (name && (el.getAttribute("type") === "radio" || el.getAttribute("type") === "checkbox")) {
    const siblings = document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`);
    return Array.from(siblings).map((s) => s.value || s.getAttribute("aria-label") || "");
  }
  return [];
}

/**
 * Detects all visible, interactable form fields on the current page.
 * Returns a deduplicated array of FormField objects.
 */
export function detectFormFields(): FormField[] {
  const selectors = [
    "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image'])",
    "textarea",
    "select",
  ];

  const elements = document.querySelectorAll<HTMLElement>(selectors.join(", "));
  const seen = new Set<string>();
  const fields: FormField[] = [];

  elements.forEach((el) => {
    if (!isVisible(el)) return;

    const id = el.getAttribute("id") || "";
    const name = el.getAttribute("name") || "";
    const type = (el as HTMLInputElement).type || el.tagName.toLowerCase();

    // Skip if we've already seen this name/id combo (dedup radio groups etc.)
    const uniqueKey = `${type}:${name || id}`;
    if (name && type === "radio" && seen.has(uniqueKey)) return;
    if (uniqueKey !== ":" && seen.has(uniqueKey)) {
      if (type !== "checkbox") return;
    }
    seen.add(uniqueKey);

    const label = getFieldLabel(el);
    const placeholder = el.getAttribute("placeholder") || "";
    const ariaLabel = el.getAttribute("aria-label") || "";
    const value = (el as HTMLInputElement).value || "";
    const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
    const options = getOptions(el);

    fields.push({
      id,
      name,
      type,
      label,
      placeholder,
      ariaLabel,
      value,
      options: options.length > 0 ? options : undefined,
      required,
      visible: true,
    });
  });

  return fields;
}
