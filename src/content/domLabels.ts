export function getBestLabel(element: HTMLElement): string {
  const parts = [
    getExplicitLabel(element),
    getParentLabel(element),
    getAriaLabel(element),
    getAriaLabelledBy(element),
    getFieldsetLegend(element)
  ];

  return uniqueJoin(parts);
}

export function getNearbyText(element: HTMLElement): string {
  const parts: string[] = [];
  const parent = element.parentElement;
  const grandparent = parent?.parentElement;

  if (parent) parts.push(cleanText(parent.innerText));
  if (grandparent) parts.push(cleanText(grandparent.innerText));

  return uniqueJoin(parts).slice(0, 700);
}

export function getSectionText(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element.parentElement;
  let depth = 0;

  while (current && depth < 6) {
    const heading = current.querySelector("h1,h2,h3,h4,h5,h6,legend,[role='heading']");
    if (heading instanceof HTMLElement) parts.push(cleanText(heading.innerText));
    current = current.parentElement;
    depth += 1;
  }

  return uniqueJoin(parts);
}

export function getControlValue(element: HTMLElement): string {
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox" || element.type === "radio") return element.checked ? element.value : "";
    return element.value;
  }
  if (element instanceof HTMLTextAreaElement) return element.value;
  if (element instanceof HTMLSelectElement) {
    return element.selectedOptions[0]?.text ?? element.value;
  }
  return "";
}

export function getOptionLabel(input: HTMLInputElement): string {
  return uniqueJoin([
    getExplicitLabel(input),
    getParentLabel(input),
    input.getAttribute("aria-label") ?? "",
    input.value
  ]);
}

function getExplicitLabel(element: HTMLElement): string {
  const id = element.getAttribute("id");
  if (!id) return "";
  const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
  return label instanceof HTMLElement ? cleanText(label.innerText) : "";
}

function getParentLabel(element: HTMLElement): string {
  const label = element.closest("label");
  return label instanceof HTMLElement ? cleanText(label.innerText) : "";
}

function getAriaLabel(element: HTMLElement): string {
  return cleanText(element.getAttribute("aria-label") ?? "");
}

function getAriaLabelledBy(element: HTMLElement): string {
  const ids = (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  const labels = ids
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .map((node) => cleanText(node.innerText));
  return uniqueJoin(labels);
}

function getFieldsetLegend(element: HTMLElement): string {
  const fieldset = element.closest("fieldset");
  const legend = fieldset?.querySelector("legend");
  return legend instanceof HTMLElement ? cleanText(legend.innerText) : "";
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueJoin(parts: Array<string | undefined>): string {
  const seen = new Set<string>();
  const cleanParts = parts
    .map((part) => cleanText(part ?? ""))
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return cleanParts.join(" ");
}
