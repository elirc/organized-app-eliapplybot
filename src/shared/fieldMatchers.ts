import type { CandidateProfile, DetectedField, FieldKind, FieldMapping } from "./types";

type MatchCandidate = Pick<FieldMapping, "kind" | "confidence" | "reason" | "value">;

type MatchContext = {
  field: DetectedField;
  /** Everything near the field, including sibling labels — good for section context only. */
  text: string;
  /** The field's own label, name, id, and placeholder — required for high-confidence matches. */
  own: string;
  profile: CandidateProfile;
};

const SKIP_PATTERNS = [
  /\bresume\b/i,
  /\bcv\b/i,
  /\bcover letter\b/i,
  /\bwriting sample\b/i,
  /\bportfolio upload\b/i,
  /\battachment\b/i,
  /\bfile upload\b/i
];

const SHORT_ANSWER_PATTERNS = [
  /\bwhy\b.*\b(company|role|team|us)\b/i,
  /\btell us\b/i,
  /\bdescribe\b/i,
  /\bstory\b/i,
  /\bproject\b/i,
  /\bessay\b/i,
  /\bcover letter\b/i
];

const YES_VALUES = ["yes", "y", "true"];
const NO_VALUES = ["no", "n", "false"];

export function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9+# ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapFields(fields: DetectedField[], profile: CandidateProfile): FieldMapping[] {
  return fields.map((field) => mapField(field, profile));
}

export function mapField(field: DetectedField, profile: CandidateProfile): FieldMapping {
  const text = buildFieldText(field);
  const context: MatchContext = { field, text, own: buildOwnText(field), profile };
  const base = {
    fieldId: field.id,
    labelText: field.labelText
  };

  if (field.inputType === "submit" || field.inputType === "button" || field.inputType === "reset") {
    return { ...base, kind: "unknown", confidence: "skip", reason: "Button controls are never clicked or filled." };
  }

  if (field.inputType === "file" || SKIP_PATTERNS.some((pattern) => pattern.test(text))) {
    return { ...base, kind: "unknown", confidence: "skip", reason: "File uploads, resumes, and cover letters are skipped in v1." };
  }

  if (field.elementType === "textarea" && SHORT_ANSWER_PATTERNS.some((pattern) => pattern.test(text))) {
    return { ...base, kind: "unknown", confidence: "skip", reason: "Job-specific long-form answers are intentionally skipped." };
  }

  const personal = matchPersonal(context);
  if (personal) return { ...base, ...personal };

  const authorization = matchAuthorization(context);
  if (authorization) return { ...base, ...authorization };

  const eeo = matchEeo(context);
  if (eeo) return { ...base, ...eeo };

  const experienceYears = matchExperienceYears(context);
  if (experienceYears) return { ...base, ...experienceYears };

  const education = matchEducation(context);
  if (education) return { ...base, ...education };

  const experience = matchExperience(context);
  if (experience) return { ...base, ...experience };

  return { ...base, kind: "unknown", confidence: "low", reason: "No deterministic v1 mapping matched this field." };
}

function buildFieldText(field: DetectedField): string {
  return normalizeText(
    [
      field.labelText,
      field.nearbyText,
      field.sectionText,
      field.name,
      field.idAttribute,
      field.placeholder,
      ...(field.options ?? [])
    ].join(" ")
  );
}

function buildOwnText(field: DetectedField): string {
  return normalizeText([field.labelText, field.name, field.idAttribute, field.placeholder].join(" "));
}

function matchPersonal({ own: label, text, profile }: MatchContext): MatchCandidate | null {
  const personal = profile.personal;

  if (/\b(first|given)\s*name\b/.test(label)) {
    return high("firstName", personal.firstName, "Matched first/given name label.");
  }
  if (/\b(last|family|surname)\s*name\b/.test(label)) {
    return high("lastName", personal.lastName, "Matched last/family name label.");
  }
  if (/^name$|^\*?\s*name\s*\*?$|\bfull name\b/.test(label)) {
    return high("fullName", `${personal.firstName} ${personal.lastName}`, "Matched full name label.");
  }
  if (/\b(e mail|email|email address)\b/.test(label)) {
    return high("email", personal.email, "Matched email label.");
  }
  if (/\b(phone|mobile|telephone)\b/.test(label)) {
    return high("phone", personal.phone, "Matched phone label.");
  }
  if (/\b(linkedin|linked in)\b/.test(label)) {
    return high("linkedin", personal.linkedin, "Matched LinkedIn label.");
  }
  if (/\b(github|git hub)\b/.test(label) && personal.github) {
    return high("github", personal.github, "Matched GitHub label.");
  }
  if (/\b(portfolio|personal website|website|web site)\b/.test(label) && personal.portfolio) {
    return high("portfolio", personal.portfolio, "Matched portfolio or website label.");
  }
  // "address" alone is too broad (email address, employer address); require a
  // residence-flavored qualifier and exclude email labels and company contexts.
  const looksLikeLocation =
    /\b(location|city)\b/.test(label) || /\b(street|home|mailing|current|residential)\s+address\b/.test(label);
  if (looksLikeLocation && !/\b(e mail|email)\b/.test(label) && !/\b(company|employer)\b/.test(text)) {
    return high("location", personal.location, "Matched location/address label.");
  }

  return null;
}

function matchAuthorization({ field, own, text, profile }: MatchContext): MatchCandidate | null {
  const hasClearYesNo = hasRecognizedYesNo(field);
  const authorizationPattern = /\b(legally authorized|authorized to work|eligible to work)\b/;
  const sponsorshipPattern = /\b(sponsorship|visa sponsorship|work visa)\b/;

  // High confidence needs the question in the field's own label; matching on
  // nearby text alone would grab neighboring questions in the same section.
  if (authorizationPattern.test(own)) {
    if (!hasClearYesNo) {
      return medium("workAuthorization", "Authorization field found, but options are not a clear yes/no set.");
    }
    return high(
      "workAuthorization",
      profile.authorization.legallyAuthorizedUS ? "Yes" : "No",
      "Matched a clear work authorization yes/no question."
    );
  }

  if (sponsorshipPattern.test(own) && /\b(require|need|now|future)\b/.test(own)) {
    if (!hasClearYesNo) {
      return medium("sponsorship", "Sponsorship field found, but options are not a clear yes/no set.");
    }
    return high(
      "sponsorship",
      profile.authorization.requiresSponsorshipNowOrFuture ? "Yes" : "No",
      "Matched a clear sponsorship yes/no question."
    );
  }

  if (authorizationPattern.test(text)) {
    return medium("workAuthorization", "Authorization question found nearby, but not in this field's own label.");
  }
  if (sponsorshipPattern.test(text) && /\b(require|need|now|future)\b/.test(text)) {
    return medium("sponsorship", "Sponsorship question found nearby, but not in this field's own label.");
  }

  return null;
}

function matchEeo({ field, own, profile }: MatchContext): MatchCandidate | null {
  if (!field.options || field.options.length === 0) return null;

  const eeoChecks: Array<[RegExp, FieldKind, string | undefined, string]> = [
    [/\bgender\b/, "eeoGender", profile.eeo.gender, "Matched EEO gender field with a saved option."],
    [/\b(race|ethnicity|hispanic|latino)\b/, "eeoRace", profile.eeo.raceEthnicity, "Matched EEO race/ethnicity field with a saved option."],
    [/\b(veteran|protected veteran)\b/, "eeoVeteran", profile.eeo.veteranStatus, "Matched EEO veteran field with a saved option."],
    [/\b(disability|disabled)\b/, "eeoDisability", profile.eeo.disabilityStatus, "Matched EEO disability field with a saved option."]
  ];

  // EEO fields sit side by side on the same form, so only the field's own
  // label is trustworthy — nearby text would match every sibling question.
  for (const [pattern, kind, value, reason] of eeoChecks) {
    if (pattern.test(own)) {
      if (value && optionExists(field, value)) return high(kind, value, reason);
      return medium(kind, `Saved EEO value does not clearly match available options for ${kind}.`);
    }
  }

  return null;
}

function matchExperienceYears({ own, profile }: MatchContext): MatchCandidate | null {
  // The question must be in the field's own label; gating on nearby text would
  // let one "Years of X" question capture every field in the same section.
  if (!/\b(years?|yrs?)\b/.test(own) || !/\b(experience|exp)\b/.test(own)) return null;

  // Whole-word matches only ("java" must not match "javascript"); when several
  // saved skills match, the longest one wins so "node.js" beats "js".
  let best: { skill: string; years: number } | null = null;
  for (const [skill, years] of Object.entries(profile.experienceYears)) {
    const normalizedSkill = normalizeText(skill);
    if (!normalizedSkill) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(normalizedSkill)}\\b`);
    if (pattern.test(own) && (!best || normalizedSkill.length > normalizeText(best.skill).length)) {
      best = { skill, years };
    }
  }

  if (best) {
    return high("yearsOfExperience", String(best.years), `Matched exact saved years of experience skill: ${best.skill}.`);
  }

  return medium("yearsOfExperience", "Years-of-experience field found, but no exact saved skill matched.");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchEducation({ own, text, profile }: MatchContext): MatchCandidate | null {
  const education = profile.education[0];
  if (!education) return null;
  // Section context may come from nearby text, but the specific column must be
  // named in the field's own label so sibling fields don't cross-match.
  const inEducation = /\b(education|school|university|college|degree|study)\b/.test(text);
  if (!inEducation) return null;

  if (/\b(school|university|college|institution)\b/.test(own)) {
    return high("educationSchool", education.school, "Matched education school field.");
  }
  if (/\b(degree|qualification)\b/.test(own)) {
    return high("educationDegree", education.degree, "Matched education degree field.");
  }
  if (/\b(field of study|major|discipline)\b/.test(own) && education.fieldOfStudy) {
    return high("educationFieldOfStudy", education.fieldOfStudy, "Matched education field of study.");
  }
  if (/\b(start|from)\b/.test(own) && /\b(date|month|year)\b/.test(own)) {
    return high("educationStartDate", formatDate(education.start), "Matched education start date.");
  }
  if (/\b(end|to|graduation|graduate)\b/.test(own) && /\b(date|month|year)\b/.test(own)) {
    return high("educationEndDate", education.end ? formatDate(education.end) : "", "Matched education end date.");
  }

  return null;
}

function matchExperience({ own, text, profile }: MatchContext): MatchCandidate | null {
  const experience = profile.experience[0];
  if (!experience) return null;
  const inExperience = /\b(experience|employment|employer|company|job|work history|position)\b/.test(text);
  if (!inExperience) return null;

  if (/\b(company|employer|organization)\b/.test(own)) {
    return high("experienceCompany", experience.company, "Matched work experience company field.");
  }
  if (/\b(title|position|role)\b/.test(own)) {
    return high("experienceTitle", experience.title, "Matched work experience title field.");
  }
  if (/\b(location|city)\b/.test(own) && experience.location) {
    return high("experienceLocation", experience.location, "Matched work experience location field.");
  }
  if (/\b(start|from)\b/.test(own) && /\b(date|month|year)\b/.test(own)) {
    return high("experienceStartDate", formatDate(experience.start), "Matched work experience start date.");
  }
  if (/\b(end|to)\b/.test(own) && /\b(date|month|year)\b/.test(own)) {
    return high("experienceEndDate", experience.current ? "Present" : formatDate(experience.end), "Matched work experience end date.");
  }

  return null;
}

function high(kind: FieldKind, value: string | undefined, reason: string): MatchCandidate {
  return { kind, confidence: "high", value, reason };
}

function medium(kind: FieldKind, reason: string): MatchCandidate {
  return { kind, confidence: "medium", reason };
}

function formatDate(date: { month: number; year: number } | null): string {
  if (!date) return "";
  return `${String(date.month).padStart(2, "0")}/${date.year}`;
}

function hasRecognizedYesNo(field: DetectedField): boolean {
  // Typing a literal "Yes"/"No" into a free-text control is risky, so bare
  // inputs and textareas are never treated as a clear yes/no set; they fall
  // back to medium (review-only) in the callers.
  if (!field.options || field.options.length === 0) return false;

  const normalizedOptions = field.options.map(normalizeText).filter(Boolean);
  return normalizedOptions.some((option) => YES_VALUES.includes(option)) && normalizedOptions.some((option) => NO_VALUES.includes(option));
}

function optionExists(field: DetectedField, value: string): boolean {
  const normalizedValue = normalizeText(value);
  return (field.options ?? []).some((option) => normalizeText(option) === normalizedValue);
}
