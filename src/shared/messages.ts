import type { DetectedField, FillResult } from "./types";

export const MessageTypes = {
  Autofill: "EAM_AUTOFILL",
  Detect: "EAM_DETECT",
  Clear: "EAM_CLEAR",
  ShowLastResult: "EAM_SHOW_LAST_RESULT",
  Ping: "EAM_PING"
} as const;

export type ContentRequest =
  | { type: typeof MessageTypes.Autofill }
  | { type: typeof MessageTypes.Detect }
  | { type: typeof MessageTypes.Clear }
  | { type: typeof MessageTypes.ShowLastResult }
  | { type: typeof MessageTypes.Ping };

export type ContentResponse =
  | { ok: true; result: FillResult }
  | { ok: true; detected: DetectedField[] }
  | { ok: true; cleared: number }
  | { ok: true; ready: true }
  | { ok: false; error: string };
