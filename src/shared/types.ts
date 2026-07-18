export type Confidence = "high" | "medium" | "low" | "skip";

export type FieldKind =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "github"
  | "portfolio"
  | "workAuthorization"
  | "sponsorship"
  | "eeoGender"
  | "eeoRace"
  | "eeoVeteran"
  | "eeoDisability"
  | "educationSchool"
  | "educationDegree"
  | "educationFieldOfStudy"
  | "educationStartDate"
  | "educationEndDate"
  | "experienceCompany"
  | "experienceTitle"
  | "experienceLocation"
  | "experienceStartDate"
  | "experienceEndDate"
  | "yearsOfExperience"
  | "unknown";

export type ElementType = "input" | "textarea" | "select" | "radio" | "checkbox";

export type DateParts = {
  month: number;
  year: number;
};

export type DetectedField = {
  id: string;
  elementType: ElementType;
  inputType?: string;
  labelText: string;
  nearbyText?: string;
  sectionText?: string;
  name?: string;
  idAttribute?: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  valueBefore?: string;
};

export type FieldMapping = {
  fieldId: string;
  kind: FieldKind;
  confidence: Confidence;
  reason: string;
  value?: string;
  labelText?: string;
};

export type FillResult = {
  filled: FieldMapping[];
  skipped: FieldMapping[];
  unsure: FieldMapping[];
  missingRequired: DetectedField[];
  detected: DetectedField[];
  site: string;
  profileName: string;
};

export type CandidateProfile = {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github?: string;
    portfolio?: string;
  };
  authorization: {
    legallyAuthorizedUS: boolean;
    requiresSponsorshipNowOrFuture: boolean;
  };
  eeo: {
    gender?: string;
    raceEthnicity?: string;
    veteranStatus?: string;
    disabilityStatus?: string;
  };
  education: Array<{
    school: string;
    degree: string;
    fieldOfStudy?: string;
    start: DateParts;
    end: DateParts | null;
  }>;
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    start: DateParts;
    end: DateParts | null;
    current: boolean;
    description?: string[];
  }>;
  experienceYears: Record<string, number>;
  futureAnswerBank?: Array<{
    id: string;
    category: string;
    tags: string[];
    title: string;
    answer: string;
  }>;
};

export type SiteAdapterName = "greenhouse" | "lever" | "workday" | "ashby" | "generic";

export type SiteAdapter = {
  name: SiteAdapterName;
  matches(url: URL): boolean;
  normalizeField?(field: DetectedField): DetectedField;
};
