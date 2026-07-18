import type { DetectedField, ElementType, SiteAdapter } from "../shared/types";
import { getBestLabel, getControlValue, getNearbyText, getOptionLabel, getSectionText } from "./domLabels";

const FIELD_ID_ATTR = "data-eli-apply-mate-field-id";

export function scanPage(adapter?: SiteAdapter): DetectedField[] {
  const fields: DetectedField[] = [];
  let index = 0;

  const groupedNames = new Set<string>();
  const groupInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[type='radio'], input[type='checkbox']"));

  for (const input of groupInputs) {
    if (!isVisible(input)) continue;
    const groupKey = getGroupKey(input);
    if (groupedNames.has(groupKey)) continue;
    groupedNames.add(groupKey);

    const members = groupInputs.filter((candidate) => getGroupKey(candidate) === groupKey && isVisible(candidate));
    const id = `eam-field-${index++}`;
    for (const member of members) member.setAttribute(FIELD_ID_ATTR, id);

    const first = members[0];
    const field = normalize(adapter, {
      id,
      elementType: first.type === "radio" ? "radio" : "checkbox",
      inputType: first.type,
      labelText: getBestLabel(first),
      nearbyText: getNearbyText(first),
      sectionText: getSectionText(first),
      name: first.name || undefined,
      idAttribute: first.id || undefined,
      options: members.map(getOptionLabel).filter(Boolean),
      required: members.some((member) => member.required),
      valueBefore: members.filter((member) => member.checked).map(getOptionLabel).join(", ")
    });
    fields.push(field);
  }

  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"));
  for (const control of controls) {
    if (!isVisible(control)) continue;
    if (control instanceof HTMLInputElement && (control.type === "radio" || control.type === "checkbox")) continue;
    if (control instanceof HTMLInputElement && control.type === "hidden") continue;

    const id = `eam-field-${index++}`;
    control.setAttribute(FIELD_ID_ATTR, id);
    const elementType = getElementType(control);

    const field = normalize(adapter, {
      id,
      elementType,
      inputType: control instanceof HTMLInputElement ? control.type : undefined,
      labelText: getBestLabel(control),
      nearbyText: getNearbyText(control),
      sectionText: getSectionText(control),
      name: control.getAttribute("name") ?? undefined,
      idAttribute: control.getAttribute("id") ?? undefined,
      placeholder: control.getAttribute("placeholder") ?? undefined,
      options: control instanceof HTMLSelectElement ? Array.from(control.options).map((option) => option.text).filter(Boolean) : undefined,
      required: control.required || control.getAttribute("aria-required") === "true",
      valueBefore: getControlValue(control)
    });
    fields.push(field);
  }

  return fields;
}

export function findFieldElements(fieldId: string): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return Array.from(document.querySelectorAll(`[${FIELD_ID_ATTR}="${CSS.escape(fieldId)}"]`)).filter(
    (element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
  );
}

function getElementType(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): ElementType {
  if (control instanceof HTMLTextAreaElement) return "textarea";
  if (control instanceof HTMLSelectElement) return "select";
  return "input";
}

function getGroupKey(input: HTMLInputElement): string {
  const fieldset = input.closest("fieldset");
  const fieldsetText = fieldset?.querySelector("legend")?.textContent?.trim() ?? "";
  // Unnamed inputs outside a fieldset would otherwise all collapse into one
  // page-wide group; scope them to their nearest structural container instead.
  const structuralKey = input.name || fieldset ? "" : getStructuralKey(input);
  return [input.type, input.name, fieldsetText, input.form?.id, structuralKey].join("|");
}

const structuralKeys = new WeakMap<Element, number>();
let nextStructuralKey = 1;

function getStructuralKey(input: HTMLInputElement): string {
  const container =
    input.closest("[role='radiogroup'], [role='group']") ??
    input.parentElement?.parentElement ??
    input.parentElement ??
    input;
  let key = structuralKeys.get(container);
  if (key === undefined) {
    key = nextStructuralKey++;
    structuralKeys.set(container, key);
  }
  return `container-${key}`;
}

function isVisible(element: HTMLElement): boolean {
  if (element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalize(adapter: SiteAdapter | undefined, field: DetectedField): DetectedField {
  return adapter?.normalizeField ? adapter.normalizeField(field) : field;
}
