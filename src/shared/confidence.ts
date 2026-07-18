import type { Confidence } from "./types";

export function shouldFill(confidence: Confidence): boolean {
  return confidence === "high";
}

export function isReviewOnly(confidence: Confidence): boolean {
  return confidence === "medium" || confidence === "low";
}
