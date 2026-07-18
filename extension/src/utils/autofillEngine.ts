// ─────────────────────────────────────────────
//  ApplyOnce AI – Autofill Engine
//  Fills form fields and dispatches proper DOM events
//  so React/Angular/Vue forms detect updates.
// ─────────────────────────────────────────────
import type { AutofillMapping } from "@/types";

/**
 * Dispatches input, change, blur events on an element.
 * This ensures React, Angular, and Vue detect the change.
 */
function dispatchEvents(el: HTMLElement): void {
  const inputEvent = new Event("input", { bubbles: true });
  const changeEvent = new Event("change", { bubbles: true });
  const blurEvent = new FocusEvent("blur", { bubbles: true });

  el.dispatchEvent(inputEvent);
  el.dispatchEvent(changeEvent);
  el.dispatchEvent(blurEvent);

  // Also trigger React's synthetic event system
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  if (el.tagName === "INPUT" && nativeInputValueSetter) {
    nativeInputValueSetter.call(el, (el as HTMLInputElement).value);
  } else if (el.tagName === "TEXTAREA" && nativeTextareaSetter) {
    nativeTextareaSetter.call(el, (el as HTMLTextAreaElement).value);
  }
}

/**
 * Fills a text / email / tel / date / url / number input.
 */
function fillTextInput(el: HTMLInputElement, value: string): void {
  el.focus();
  el.value = value;
  dispatchEvents(el);
}

/**
 * Fills a textarea.
 */
function fillTextarea(el: HTMLTextAreaElement, value: string): void {
  el.focus();
  el.value = value;
  dispatchEvents(el);
}

/**
 * Selects the closest matching option in a <select>.
 */
function fillSelect(el: HTMLSelectElement, value: string): void {
  const lowerValue = value.toLowerCase();

  // Try exact match first, then partial
  let matched = false;
  for (const option of Array.from(el.options)) {
    if (
      option.value.toLowerCase() === lowerValue ||
      option.text.toLowerCase() === lowerValue
    ) {
      el.value = option.value;
      matched = true;
      break;
    }
  }

  if (!matched) {
    for (const option of Array.from(el.options)) {
      if (
        option.value.toLowerCase().includes(lowerValue) ||
        option.text.toLowerCase().includes(lowerValue)
      ) {
        el.value = option.value;
        matched = true;
        break;
      }
    }
  }

  if (matched) {
    dispatchEvents(el);
  }
}

/**
 * Handles checkbox inputs.
 */
function fillCheckbox(el: HTMLInputElement, value: string): void {
  const shouldCheck = value === "true" || value === "yes" || value === "1";
  if (el.checked !== shouldCheck) {
    el.checked = shouldCheck;
    dispatchEvents(el);
  }
}

/**
 * Handles radio inputs — clicks the radio with matching value.
 */
function fillRadio(name: string, value: string): void {
  const radios = document.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][name="${name}"]`
  );
  const lowerValue = value.toLowerCase();

  radios.forEach((radio) => {
    if (
      radio.value.toLowerCase() === lowerValue ||
      radio.getAttribute("aria-label")?.toLowerCase() === lowerValue
    ) {
      radio.checked = true;
      dispatchEvents(radio);
    }
  });
}

/**
 * Finds an element by id or name attribute.
 */
function findElement(idOrName: string): HTMLElement | null {
  if (!idOrName) return null;
  return (
    document.getElementById(idOrName) ||
    document.querySelector<HTMLElement>(`[name="${idOrName}"]`) ||
    document.querySelector<HTMLElement>(`[data-fieldname="${idOrName}"]`) ||
    null
  );
}

/**
 * Main autofill function. Applies the AI mapping to the page's form fields.
 * Returns the count of successfully filled fields.
 */
export function autofillForm(mapping: AutofillMapping): number {
  let filledCount = 0;

  for (const [key, value] of Object.entries(mapping)) {
    if (!value || value.trim() === "") continue;

    const el = findElement(key);
    if (!el) continue;

    try {
      const tagName = el.tagName.toLowerCase();
      const type = ((el as HTMLInputElement).type || "").toLowerCase();

      if (tagName === "select") {
        fillSelect(el as HTMLSelectElement, value);
        filledCount++;
      } else if (tagName === "textarea") {
        fillTextarea(el as HTMLTextAreaElement, value);
        filledCount++;
      } else if (tagName === "input") {
        if (type === "checkbox") {
          fillCheckbox(el as HTMLInputElement, value);
          filledCount++;
        } else if (type === "radio") {
          const name = (el as HTMLInputElement).name;
          fillRadio(name, value);
          filledCount++;
        } else {
          // text, email, tel, date, url, number, etc.
          fillTextInput(el as HTMLInputElement, value);
          filledCount++;
        }
      }
    } catch (err) {
      console.warn(`[ApplyOnce] Failed to fill field "${key}":`, err);
    }
  }

  return filledCount;
}
