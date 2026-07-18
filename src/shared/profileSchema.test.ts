import { describe, expect, it } from "vitest";
import { validateCandidateProfile, validateProfileDetailed } from "./profileSchema";
import { sampleProfile } from "./sampleProfile";

describe("validateProfileDetailed", () => {
  it("accepts the sample profile", () => {
    const result = validateProfileDetailed(sampleProfile);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects non-objects with a clear message", () => {
    expect(validateProfileDetailed(null).errors).toEqual(["Profile must be a JSON object."]);
    expect(validateProfileDetailed("hi").valid).toBe(false);
    expect(validateProfileDetailed([]).valid).toBe(false);
  });

  it("pinpoints a missing education start date", () => {
    const profile = structuredClone(sampleProfile) as Record<string, unknown>;
    (profile.education as unknown[])[0] = { school: "State U", degree: "BS", end: null };
    const result = validateProfileDetailed(profile);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.startsWith("education[0].start"))).toBe(true);
  });

  it("pinpoints an invalid month", () => {
    const profile = structuredClone(sampleProfile);
    profile.education[0].start.month = 13;
    const result = validateProfileDetailed(profile);
    expect(result.errors).toContain("education[0].start.month must be an integer from 1 to 12.");
  });

  it("rejects non-numeric experienceYears values", () => {
    const profile = structuredClone(sampleProfile) as unknown as { experienceYears: Record<string, unknown> };
    profile.experienceYears.react = "four";
    const result = validateProfileDetailed(profile);
    expect(result.errors).toContain('experienceYears["react"] must be a non-negative number.');
  });

  it("requires experience.current to be boolean", () => {
    const profile = structuredClone(sampleProfile) as unknown as { experience: Array<Record<string, unknown>> };
    delete profile.experience[0].current;
    const result = validateProfileDetailed(profile);
    expect(result.errors).toContain("experience[0].current must be true or false.");
  });

  it("allows futureAnswerBank to be absent but requires eeo", () => {
    const profile = structuredClone(sampleProfile) as Record<string, unknown>;
    delete profile.futureAnswerBank;
    expect(validateProfileDetailed(profile).valid).toBe(true);

    delete profile.eeo;
    const result = validateProfileDetailed(profile);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.startsWith("eeo"))).toBe(true);
  });

  it("keeps the boolean guard in sync", () => {
    expect(validateCandidateProfile(sampleProfile)).toBe(true);
    expect(validateCandidateProfile({})).toBe(false);
  });
});
