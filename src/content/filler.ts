import type { DetectedField, FieldMapping } from "../shared/types";
import { normalizeText } from "../shared/fieldMatchers";
import { findFieldElements } from "./scanner";

export type RollbackEntry = {
  fieldId: string;
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  value: string;
  checked?: boolean;
};

export function fillField(mapping: FieldMapping, field: DetectedField, rollback: RollbackEntry[]): boolean {
  if (!mapping.value && mapping.value !== "") return false;
  const elements = findFieldElements(mapping.fieldId);
  if (elements.length === 0) return false;

  if (field.elementType === "radio" || field.elementType === "checkbox") {
    return fillChoiceGroup(elements.filter((element): element is HTMLInputElement => element instanceof HTMLInputElement), mapping.value, rollback);
  }

  const element = elements[0];
  if (element instanceof HTMLInputElement && ["file", "submit", "button", "reset", "image"].includes(element.type)) {
    return false;
  }

  if (element instanceof HTMLSelectElement) {
    const entry = snapshot(mapping.fieldId, element);
    const matched = selectOption(element, mapping.value);
    if (matched) {
      rollback.push(entry);
      dispatchChanged(element);
    }
    return matched;
  }

  rollback.push(snapshot(mapping.fieldId, element));
  setNativeValue(element, mapping.value);
  dispatchChanged(element);
  return true;
}

export function rollbackFilled(entries: RollbackEntry[]): number {
  let changed = 0;

  for (const entry of entries.reverse()) {
    const element = entry.element;
    if (!document.contains(element)) continue;

    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      element.checked = !!entry.checked;
    } else {
      setNativeValue(element, entry.value);
    }
    dispatchChanged(element);
    changed += 1;
  }

  entries.length = 0;
  return changed;
}

function fillChoiceGroup(inputs: HTMLInputElement[], value: string, rollback: RollbackEntry[]): boolean {
  const normalizedValue = normalizeText(value);
  const match = inputs.find((input) => {
    const label = normalizeText(getChoiceText(input));
    return label === normalizedValue || input.value.toLowerCase() === normalizedValue;
  });

  if (!match) return false;

  for (const input of inputs) rollback.push(snapshot(input.getAttribute("data-eli-apply-mate-field-id") ?? "", input));
  match.checked = true;
  dispatchChanged(match);
  return true;
}

function selectOption(select: HTMLSelectElement, value: string): boolean {
  const normalizedValue = normalizeText(value);
  const option = Array.from(select.options).find((candidate) => {
    const text = normalizeText(candidate.text);
    const candidateValue = normalizeText(candidate.value);
    return text === normalizedValue || candidateValue === normalizedValue;
  });

  if (!option) return false;
  setNativeValue(select, option.value);
  return true;
}

function snapshot(fieldId: string, element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): RollbackEntry {
  return {
    fieldId,
    element,
    value: element.value,
    checked: element instanceof HTMLInputElement ? element.checked : undefined
  };
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  // React >=16 overrides the value property on controlled inputs; calling the
  // prototype setter directly makes the dispatched input event register there too.
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
}

function dispatchChanged(element: HTMLElement): void {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function getChoiceText(input: HTMLInputElement): string {
  const id = input.id;
  const explicit = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
  if (explicit instanceof HTMLElement) return explicit.innerText;
  const parentLabel = input.closest("label");
  if (parentLabel instanceof HTMLElement) return parentLabel.innerText;
  return input.value;
}
