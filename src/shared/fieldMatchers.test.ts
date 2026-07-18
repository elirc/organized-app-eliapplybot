import { describe, expect, it } from "vitest";
import { mapField, normalizeText } from "./fieldMatchers";
import { sampleProfile } from "./sampleProfile";
import type { CandidateProfile, DetectedField } from "./types";

function field(partial: Partial<DetectedField>): DetectedField {
  return {
    id: "field-1",
    elementType: "input",
    labelText: "",
    ...partial
  };
}

function profileWith(overrides: Partial<CandidateProfile>): CandidateProfile {
  return { ...structuredClone(sampleProfile), ...overrides };
}

describe("normalizeText", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeText("  First_Name / e-mail! ")).toBe("first name e mail");
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText("C# and Node.js")).toBe("c# and node js");
  });
});

describe("contact fields", () => {
  it("maps standardized contact fields with high confidence", () => {
    const mapping = mapField(field({ labelText: "First name", name: "first_name" }), sampleProfile);
    expect(mapping.kind).toBe("firstName");
    expect(mapping.confidence).toBe("high");
    expect(mapping.value).toBe(sampleProfile.personal.firstName);
  });

  it("maps full name, phone, and linkedin", () => {
    expect(mapField(field({ labelText: "Full name" }), sampleProfile).kind).toBe("fullName");
    expect(mapField(field({ labelText: "Phone number" }), sampleProfile).kind).toBe("phone");
    expect(mapField(field({ labelText: "LinkedIn profile" }), sampleProfile).kind).toBe("linkedin");
  });

  it("maps 'Email address' to email, never to location", () => {
    const mapping = mapField(field({ labelText: "Email address", name: "email" }), sampleProfile);
    expect(mapping.kind).toBe("email");
    expect(mapping.value).toBe(sampleProfile.personal.email);
  });

  it("still maps a Location field that sits near an email field", () => {
    const mapping = mapField(
      field({
        labelText: "Location",
        name: "location",
        placeholder: "City, State",
        nearbyText: "Email address Location Phone"
      }),
      sampleProfile
    );
    expect(mapping.kind).toBe("location");
    expect(mapping.confidence).toBe("high");
  });

  it("does not treat a bare 'Address' label as the personal location", () => {
    const mapping = mapField(field({ labelText: "Address" }), sampleProfile);
    expect(mapping.kind).not.toBe("location");
  });

  it("maps mailing address to location", () => {
    const mapping = mapField(field({ labelText: "Mailing address" }), sampleProfile);
    expect(mapping.kind).toBe("location");
  });

  it("does not map an employer address to the personal location", () => {
    const mapping = mapField(field({ labelText: "City", nearbyText: "Current employer address" }), sampleProfile);
    expect(mapping.kind).not.toBe("location");
  });
});

describe("skips", () => {
  it("skips resume uploads", () => {
    const mapping = mapField(field({ labelText: "Resume upload", inputType: "file" }), sampleProfile);
    expect(mapping.confidence).toBe("skip");
  });

  it("skips cover letter textareas", () => {
    const mapping = mapField(field({ elementType: "textarea", labelText: "Cover letter" }), sampleProfile);
    expect(mapping.confidence).toBe("skip");
  });

  it("skips job-specific essay questions", () => {
    const mapping = mapField(
      field({ elementType: "textarea", labelText: "Why do you want to join our company?" }),
      sampleProfile
    );
    expect(mapping.confidence).toBe("skip");
  });

  it("never touches buttons", () => {
    const mapping = mapField(field({ inputType: "submit", labelText: "Submit application" }), sampleProfile);
    expect(mapping.confidence).toBe("skip");
  });
});

describe("authorization", () => {
  it("fills clear sponsorship questions cautiously", () => {
    const mapping = mapField(
      field({
        elementType: "select",
        labelText: "Will you now or in the future require sponsorship?",
        options: ["", "Yes", "No"]
      }),
      sampleProfile
    );
    expect(mapping.kind).toBe("sponsorship");
    expect(mapping.confidence).toBe("high");
    expect(mapping.value).toBe("No");
  });

  it("downgrades bare text inputs to review-only instead of typing Yes", () => {
    const mapping = mapField(
      field({ labelText: "Are you legally authorized to work in the United States?" }),
      sampleProfile
    );
    expect(mapping.kind).toBe("workAuthorization");
    expect(mapping.confidence).toBe("medium");
    expect(mapping.value).toBeUndefined();
  });

  it("downgrades selects whose options are not a clear yes/no set", () => {
    const mapping = mapField(
      field({
        elementType: "select",
        labelText: "Are you authorized to work in the US?",
        options: ["Citizen", "Green card", "H1B"]
      }),
      sampleProfile
    );
    expect(mapping.confidence).toBe("medium");
  });
});

describe("EEO", () => {
  it("fills when the saved answer matches an option exactly", () => {
    const mapping = mapField(
      field({
        elementType: "select",
        labelText: "Gender",
        options: ["Man", "Woman", "I don't wish to answer"]
      }),
      sampleProfile
    );
    expect(mapping.kind).toBe("eeoGender");
    expect(mapping.confidence).toBe("high");
    expect(mapping.value).toBe("I don't wish to answer");
  });

  it("stays review-only when the saved answer is not among the options", () => {
    const mapping = mapField(
      field({ elementType: "select", labelText: "Gender", options: ["Male", "Female"] }),
      sampleProfile
    );
    expect(mapping.kind).toBe("eeoGender");
    expect(mapping.confidence).toBe("medium");
  });
});

describe("years of experience", () => {
  it("does not fill without an exact skill match", () => {
    const mapping = mapField(field({ labelText: "Years of Kubernetes experience" }), sampleProfile);
    expect(mapping.kind).toBe("yearsOfExperience");
    expect(mapping.confidence).toBe("medium");
    expect(mapping.value).toBeUndefined();
  });

  it("does not let 'java' match 'JavaScript'", () => {
    const profile = profileWith({ experienceYears: { java: 8, javascript: 5 } });
    const js = mapField(field({ labelText: "Years of JavaScript experience" }), profile);
    expect(js.confidence).toBe("high");
    expect(js.value).toBe("5");

    const java = mapField(field({ labelText: "Years of Java experience" }), profile);
    expect(java.value).toBe("8");
  });

  it("prefers the longest matching skill", () => {
    const profile = profileWith({ experienceYears: { js: 2, "node.js": 3 } });
    const mapping = mapField(field({ labelText: "Years of Node.js experience" }), profile);
    expect(mapping.value).toBe("3");
  });

  it("matches skills containing regex metacharacters", () => {
    const profile = profileWith({ experienceYears: { "c++": 6 } });
    const mapping = mapField(field({ labelText: "Years of C++ experience" }), profile);
    // normalizeText strips "+" from the page text as well, so both sides align.
    expect(mapping.kind).toBe("yearsOfExperience");
  });
});

describe("education and experience", () => {
  it("maps school and degree", () => {
    const school = mapField(field({ labelText: "School or university" }), sampleProfile);
    expect(school.kind).toBe("educationSchool");
    expect(school.value).toBe(sampleProfile.education[0].school);

    const degree = mapField(field({ labelText: "Degree", nearbyText: "Education" }), sampleProfile);
    expect(degree.kind).toBe("educationDegree");
  });

  it("maps company and title", () => {
    const company = mapField(field({ labelText: "Employer company" }), sampleProfile);
    expect(company.kind).toBe("experienceCompany");
    expect(company.value).toBe(sampleProfile.experience[0].company);

    const title = mapField(field({ labelText: "Position title", nearbyText: "Work experience" }), sampleProfile);
    expect(title.kind).toBe("experienceTitle");
  });

  it("formats a current role's end date as Present", () => {
    const mapping = mapField(
      field({ labelText: "Experience end date", nearbyText: "Employment history" }),
      sampleProfile
    );
    expect(mapping.kind).toBe("experienceEndDate");
    expect(mapping.value).toBe("Present");
  });

  it("returns low-confidence unknown when nothing matches", () => {
    const mapping = mapField(field({ labelText: "Favorite color" }), sampleProfile);
    expect(mapping.kind).toBe("unknown");
    expect(mapping.confidence).toBe("low");
  });
});
