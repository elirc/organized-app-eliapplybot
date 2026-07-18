import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { shouldFill } from "../shared/confidence";
import { mapFields } from "../shared/fieldMatchers";
import { sampleProfile } from "../shared/sampleProfile";
import type { FieldMapping } from "../shared/types";
import { fillField, rollbackFilled, type RollbackEntry } from "./filler";
import { scanPage } from "./scanner";

const fixture = readFileSync(resolve(__dirname, "../../test-pages/fake-application.html"), "utf8");

function input(name: string): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!element) throw new Error(`Missing input ${name}`);
  return element;
}

function select(name: string): HTMLSelectElement {
  const element = document.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
  if (!element) throw new Error(`Missing select ${name}`);
  return element;
}

function autofill(): { filled: FieldMapping[]; unsure: FieldMapping[]; skipped: FieldMapping[]; rollback: RollbackEntry[] } {
  const detected = scanPage();
  const mappings = mapFields(detected, sampleProfile);
  const rollback: RollbackEntry[] = [];
  const filled: FieldMapping[] = [];
  const unsure: FieldMapping[] = [];
  const skipped: FieldMapping[] = [];

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
    if (fillField(mapping, field, rollback)) {
      filled.push(mapping);
    } else {
      unsure.push(mapping);
    }
  }

  return { filled, unsure, skipped, rollback };
}

describe("autofill on the fake application page", () => {
  beforeEach(() => {
    const bodyMatch = fixture.match(/<body>([\s\S]*)<\/body>/);
    document.body.innerHTML = bodyMatch ? bodyMatch[1] : fixture;
  });

  it("fills contact information from the sample profile", () => {
    autofill();
    expect(input("first_name").value).toBe("Alex");
    expect(input("last_name").value).toBe("Example");
    expect(input("email").value).toBe("alex.example@example.com");
    expect(input("phone").value).toBe("555-010-1234");
    expect(input("location").value).toBe("San Francisco, CA");
    expect(input("linkedin_url").value).toBe(sampleProfile.personal.linkedin);
    expect(input("github").value).toBe(sampleProfile.personal.github);
    expect(input("portfolio").value).toBe(sampleProfile.personal.portfolio);
  });

  it("answers authorization selects from the profile", () => {
    autofill();
    expect(select("authorized_us").value).toBe("Yes");
    expect(select("requires_sponsorship").value).toBe("No");
  });

  it("fills experience, education, and exact years of experience", () => {
    autofill();
    expect(input("experience_company").value).toBe("Example Software Co.");
    expect(input("experience_title").value).toBe("Frontend Engineer");
    expect(input("experience_start_date").value).toBe("06/2022");
    expect(input("experience_end_date").value).toBe("Present");
    expect(input("react_years").value).toBe("4");
    expect(input("education_school").value).toBe("Example University");
    expect(input("education_degree").value).toBe("Bachelor of Science");
    expect(input("education_end_date").value).toBe("05/2020");
  });

  it("selects saved EEO answers when the options match", () => {
    autofill();
    expect(select("eeo_gender").value).toBe("I don't wish to answer");
    expect(select("eeo_race").value).toBe("I don't wish to answer");
    expect(select("eeo_veteran").value).toBe("I don't wish to answer");
    expect(select("eeo_disability").value).toBe("I don't wish to answer");
  });

  it("never touches uploads, essays, or buttons", () => {
    const { skipped } = autofill();
    expect(input("resume").value).toBe("");
    expect(input("cover_letter_file").value).toBe("");
    expect(document.querySelector<HTMLTextAreaElement>("textarea[name='why_company']")!.value).toBe("");
    expect(skipped.length).toBeGreaterThanOrEqual(3);
  });

  it("rolls back every value it filled", () => {
    const { filled, rollback } = autofill();
    expect(filled.length).toBeGreaterThan(10);

    const count = rollbackFilled(rollback);
    expect(count).toBe(filled.length);

    for (const name of ["first_name", "last_name", "email", "phone", "location", "experience_company"]) {
      expect(input(name).value).toBe("");
    }
    expect(select("authorized_us").value).toBe("");
    expect(select("eeo_gender").value).toBe("");
    expect(rollback).toHaveLength(0);
  });
});
