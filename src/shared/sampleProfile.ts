import type { CandidateProfile } from "./types";

export const sampleProfile: CandidateProfile = {
  personal: {
    firstName: "Alex",
    lastName: "Example",
    email: "alex.example@example.com",
    phone: "555-010-1234",
    location: "San Francisco, CA",
    linkedin: "https://www.linkedin.com/in/alex-example",
    github: "https://github.com/alex-example",
    portfolio: "https://alex-example.dev"
  },
  authorization: {
    legallyAuthorizedUS: true,
    requiresSponsorshipNowOrFuture: false
  },
  eeo: {
    gender: "I don't wish to answer",
    raceEthnicity: "I don't wish to answer",
    veteranStatus: "I don't wish to answer",
    disabilityStatus: "I don't wish to answer"
  },
  education: [
    {
      school: "Example University",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      start: { month: 9, year: 2016 },
      end: { month: 5, year: 2020 }
    }
  ],
  experience: [
    {
      company: "Example Software Co.",
      title: "Frontend Engineer",
      location: "Remote",
      start: { month: 6, year: 2022 },
      end: null,
      current: true,
      description: [
        "Built accessible React interfaces for internal tools.",
        "Improved form reliability with TypeScript and automated tests."
      ]
    }
  ],
  experienceYears: {
    react: 4,
    typescript: 4,
    javascript: 5,
    "node.js": 3,
    css: 5
  },
  futureAnswerBank: []
};
