import type { CandidateProfile, DateParts } from "./types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateProfileDetailed(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["Profile must be a JSON object."] };
  }

  const personal = value.personal;
  if (!isRecord(personal)) {
    errors.push("personal must be an object.");
  } else {
    for (const key of ["firstName", "lastName", "email", "phone", "location", "linkedin"] as const) {
      if (typeof personal[key] !== "string") errors.push(`personal.${key} must be a string.`);
    }
    for (const key of ["github", "portfolio"] as const) {
      if (personal[key] !== undefined && typeof personal[key] !== "string") {
        errors.push(`personal.${key} must be a string when present.`);
      }
    }
  }

  const authorization = value.authorization;
  if (!isRecord(authorization)) {
    errors.push("authorization must be an object.");
  } else {
    if (typeof authorization.legallyAuthorizedUS !== "boolean") {
      errors.push("authorization.legallyAuthorizedUS must be true or false.");
    }
    if (typeof authorization.requiresSponsorshipNowOrFuture !== "boolean") {
      errors.push("authorization.requiresSponsorshipNowOrFuture must be true or false.");
    }
  }

  const eeo = value.eeo;
  if (!isRecord(eeo)) {
    errors.push('eeo must be an object (use {} to leave all EEO answers blank).');
  } else {
    for (const key of ["gender", "raceEthnicity", "veteranStatus", "disabilityStatus"] as const) {
      if (eeo[key] !== undefined && typeof eeo[key] !== "string") {
        errors.push(`eeo.${key} must be a string when present.`);
      }
    }
  }

  if (!Array.isArray(value.education)) {
    errors.push("education must be an array.");
  } else {
    value.education.forEach((entry, index) => {
      if (!isRecord(entry)) {
        errors.push(`education[${index}] must be an object.`);
        return;
      }
      if (typeof entry.school !== "string" || !entry.school.trim()) {
        errors.push(`education[${index}].school must be a non-empty string.`);
      }
      if (typeof entry.degree !== "string") errors.push(`education[${index}].degree must be a string.`);
      if (entry.fieldOfStudy !== undefined && typeof entry.fieldOfStudy !== "string") {
        errors.push(`education[${index}].fieldOfStudy must be a string when present.`);
      }
      validateDateParts(entry.start, `education[${index}].start`, errors);
      if (entry.end !== null) validateDateParts(entry.end, `education[${index}].end`, errors, "or null");
    });
  }

  if (!Array.isArray(value.experience)) {
    errors.push("experience must be an array.");
  } else {
    value.experience.forEach((entry, index) => {
      if (!isRecord(entry)) {
        errors.push(`experience[${index}] must be an object.`);
        return;
      }
      if (typeof entry.company !== "string" || !entry.company.trim()) {
        errors.push(`experience[${index}].company must be a non-empty string.`);
      }
      if (typeof entry.title !== "string") errors.push(`experience[${index}].title must be a string.`);
      if (entry.location !== undefined && typeof entry.location !== "string") {
        errors.push(`experience[${index}].location must be a string when present.`);
      }
      if (typeof entry.current !== "boolean") errors.push(`experience[${index}].current must be true or false.`);
      validateDateParts(entry.start, `experience[${index}].start`, errors);
      if (entry.end !== null) validateDateParts(entry.end, `experience[${index}].end`, errors, "or null");
      if (entry.description !== undefined) {
        if (!Array.isArray(entry.description) || entry.description.some((line) => typeof line !== "string")) {
          errors.push(`experience[${index}].description must be an array of strings when present.`);
        }
      }
    });
  }

  const experienceYears = value.experienceYears;
  if (!isRecord(experienceYears)) {
    errors.push("experienceYears must be an object mapping skill names to numbers.");
  } else {
    for (const [skill, years] of Object.entries(experienceYears)) {
      if (typeof years !== "number" || !Number.isFinite(years) || years < 0) {
        errors.push(`experienceYears["${skill}"] must be a non-negative number.`);
      }
    }
  }

  const answerBank = value.futureAnswerBank;
  if (answerBank !== undefined) {
    if (!Array.isArray(answerBank)) {
      errors.push("futureAnswerBank must be an array when present.");
    } else {
      answerBank.forEach((entry, index) => {
        if (!isRecord(entry)) {
          errors.push(`futureAnswerBank[${index}] must be an object.`);
          return;
        }
        for (const key of ["id", "category", "title", "answer"] as const) {
          if (typeof entry[key] !== "string") errors.push(`futureAnswerBank[${index}].${key} must be a string.`);
        }
        if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== "string")) {
          errors.push(`futureAnswerBank[${index}].tags must be an array of strings.`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateCandidateProfile(value: unknown): value is CandidateProfile {
  return validateProfileDetailed(value).valid;
}

function validateDateParts(value: unknown, path: string, errors: string[], suffix = ""): value is DateParts {
  const expectation = `must be { "month": 1-12, "year": number } ${suffix}`.trim();
  if (!isRecord(value)) {
    errors.push(`${path} ${expectation}.`);
    return false;
  }
  const month = value.month;
  const year = value.year;
  if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) {
    errors.push(`${path}.month must be an integer from 1 to 12.`);
    return false;
  }
  if (typeof year !== "number" || !Number.isInteger(year) || year < 1900 || year > 2200) {
    errors.push(`${path}.year must be a four-digit year.`);
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
