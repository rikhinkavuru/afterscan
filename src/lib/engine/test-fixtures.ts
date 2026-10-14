import type { Finding, ReportContext } from "./types";

export function baseCtx(over: Partial<ReportContext> = {}): ReportContext {
  return {
    modality: "CT",
    bodyRegion: "chest",
    contrast: "unknown",
    examReason: null,
    patientAgeYears: null,
    patientSex: "unknown",
    knownCancer: null,
    screeningExam: null,
    immunocompromised: null,
    cirrhosisOrHepaticRisk: null,
    priorComparisonAvailable: null,
    reportDate: null,
    ...over,
  };
}

export function baseFinding(over: Partial<Finding> = {}): Finding {
  return {
    id: "f1",
    organ: "lung",
    kind: "nodule",
    description: "test finding",
    sourceQuote: "test finding",
    sizeMm: null,
    multiplicity: "single",
    incidental: true,
    stability: "unknown",
    confidence: 0.9,
    ...over,
  };
}
