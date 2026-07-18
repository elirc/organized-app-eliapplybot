import { fillField, rollbackFilled, type RollbackEntry } from "./filler";
import { findFieldElements, scanPage } from "./scanner";
import { shouldFill } from "../shared/confidence";
import { mapFields } from "../shared/fieldMatchers";
import { MessageTypes, type ContentRequest, type ContentResponse } from "../shared/messages";
import { getActiveProfile, getActiveProfileName } from "../shared/storage";
import type { DetectedField, FieldMapping, FillResult } from "../shared/types";
import { getSiteAdapter } from "../sites";
import { renderSidebar } from "../sidebar/renderSidebar";

// The popup injects this script on demand; guard against running twice in one page.
declare global {
  interface Window {
    __eliApplyMateLoaded?: boolean;
  }
}

if (!window.__eliApplyMateLoaded) {
  window.__eliApplyMateLoaded = true;
  initContentScript();
}

function initContentScript(): void {
  const rollbackEntries: RollbackEntry[] = [];
  let lastResult: FillResult | null = null;

  chrome.runtime.onMessage.addListener(
    (request: ContentRequest, _sender, sendResponse: (response: ContentResponse) => void) => {
      handleRequest(request)
        .then(sendResponse)
        .catch((error: unknown) => {
          sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
        });
      return true;
    }
  );

  async function handleRequest(request: ContentRequest): Promise<ContentResponse> {
    if (request.type === MessageTypes.Ping) {
      return { ok: true, ready: true };
    }

    if (request.type === MessageTypes.Clear) {
      const cleared = rollbackFilled(rollbackEntries);
      return { ok: true, cleared };
    }

    if (request.type === MessageTypes.ShowLastResult) {
      if (!lastResult) {
        return { ok: false, error: "Nothing to show yet. Run Autofill or Detect first." };
      }
      renderSidebar(lastResult, () => rollbackFilled(rollbackEntries));
      return { ok: true, result: lastResult };
    }

    const profile = await getActiveProfile();
    const profileName = await getActiveProfileName();
    const adapter = getSiteAdapter(window.location.href);
    const detected = scanPage(adapter);
    const mappings = mapFields(detected, profile);

    if (request.type === MessageTypes.Detect) {
      lastResult = {
        filled: [],
        skipped: mappings.filter((mapping) => mapping.confidence === "skip"),
        unsure: mappings.filter((mapping) => mapping.confidence !== "skip"),
        missingRequired: findMissingRequired(detected),
        detected,
        site: adapter.name,
        profileName
      };
      renderSidebar(lastResult, () => rollbackFilled(rollbackEntries));
      return { ok: true, detected };
    }

    const filled: FieldMapping[] = [];
    const skipped: FieldMapping[] = [];
    const unsure: FieldMapping[] = [];

    if (request.type === MessageTypes.Autofill) {
      for (const mapping of mappings) {
        const field = detected.find((candidate) => candidate.id === mapping.fieldId);
        if (!field) continue;

        if (mapping.confidence === "skip") {
          skipped.push(mapping);
          continue;
        }

        if (!shouldFill(mapping.confidence)) {
          unsure.push(mapping);
          continue;
        }

        const didFill = fillField(mapping, field, rollbackEntries);
        if (didFill) {
          filled.push(mapping);
        } else {
          unsure.push({
            ...mapping,
            confidence: "medium" as const,
            reason: `${mapping.reason} Could not find a matching visible control option to fill.`
          });
        }
      }
    }

    lastResult = {
      filled,
      skipped,
      unsure,
      missingRequired: findMissingRequired(detected),
      detected,
      site: adapter.name,
      profileName
    };
    renderSidebar(lastResult, () => rollbackFilled(rollbackEntries));
    return { ok: true, result: lastResult };
  }
}

function findMissingRequired(fields: DetectedField[]): DetectedField[] {
  return fields.filter((field) => {
    if (!field.required) return false;
    const elements = findFieldElements(field.id);
    if (elements.length === 0) return false;

    if (field.elementType === "radio" || field.elementType === "checkbox") {
      return !elements.some((element) => element instanceof HTMLInputElement && element.checked);
    }

    const element = elements[0];
    return !element.value;
  });
}
