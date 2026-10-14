/**
 * Core domain types for the guideline engine.
 *
 * Every rule in this engine is traceable to a published source:
 *  - Fleischner Society 2017 (MacMahon et al., Radiology 2017;284:228-243)
 *  - ACR Incidental Findings Committee white papers (JACR 2017): adrenal
 *    (Mayo-Smith), renal (Herts), liver (Gore), pancreas (Megibow)
 *  - ACR incidental thyroid nodule white paper (Hoang, JACR 2015) and
 *    ACR TI-RADS (Tessler, JACR 2017)
 *
 * The engine never diagnoses. It maps a structured description of a finding
 * to the follow-up the guideline describes, and says so when it cannot.
 */

export type Organ =
  | "lung"
  | "adrenal"
  | "kidney"
  | "liver"
  | "pancreas"
  | "thyroid"
  | "other";

export type Modality = "CT" | "MRI" | "US" | "XR" | "PET" | "unknown";

export type Tri = boolean | null; // null = not stated in the report

export interface Finding {
  id: string;
  organ: Organ;
  /** Free-text organ label when organ === "other" (e.g. "ovary", "bone"). */
  organLabel?: string | null;
  kind: "nodule" | "mass" | "cyst" | "lesion" | "other";
  /** One-line description in the report's own words. */
  description: string;
  /** Exact substring of the report this finding was read from. */
  sourceQuote: string;
  /** Set by the server after checking sourceQuote against the report text. */
  quoteVerified?: boolean;
  /** Largest reported dimension in mm (long axis), or null if not stated. */
  sizeMm: number | null;
  /** Short axis in mm if the report gives two dimensions. */
  sizeShortMm?: number | null;
  multiplicity: "single" | "multiple" | "unknown";
  /** Was this found by accident (not the reason for the exam)? */
  incidental: Tri;
  /** Compared with prior imaging. */
  stability: "new" | "stable" | "enlarging" | "unknown";
  /** How long it has been stable, in months, if stated. */
  stableMonths?: number | null;
  /** The radiologist's own recommendation, verbatim, if the report has one. */
  radiologistRecommendation?: string | null;

  // ---- lung ----
  attenuation?: "solid" | "ground-glass" | "part-solid" | "unknown";
  solidComponentMm?: number | null;
  calcified?: Tri;
  benignCalcification?: Tri; // central/laminated/popcorn/diffuse
  perifissural?: Tri;
  spiculated?: Tri;
  upperLobe?: Tri;

  // ---- adrenal / kidney / liver (CT attenuation) ----
  unenhancedHU?: number | null;
  macroscopicFat?: Tri;
  enhancement?: "none" | "present" | "unknown";
  homogeneous?: Tri;
  /** Adrenal washout: APW >= 60% or RPW >= 40% means adenoma. */
  washoutMeetsAdenoma?: Tri;
  /** Report explicitly calls it a simple cyst / hemangioma / FNH etc. */
  explicitlyBenign?: Tri;
  bosniak?: "I" | "II" | "IIF" | "III" | "IV" | null;
  tooSmallToCharacterize?: Tri;

  // ---- liver ----
  suspiciousFeatures?: Tri; // ill-defined margins, heterogeneity, mural nodularity, thick septa, >20 HU enhancement
  flashFilling?: Tri;

  // ---- pancreas ----
  mainDuctCommunication?: "yes" | "no" | "unknown";
  worrisomeFeatures?: Tri; // mural nodule, wall thickening, MPD >= 7 mm
  highRiskStigmata?: Tri; // obstructive jaundice, enhancing solid component, MPD >= 10 mm
  serousCystadenoma?: Tri;

  // ---- thyroid ----
  tiRads?: 1 | 2 | 3 | 4 | 5 | null;
  thyroidSuspicious?: Tri; // local invasion, abnormal lymph nodes
  petAvid?: Tri;

  /** Extractor's confidence that this finding is real and correctly read, 0-1. */
  confidence: number;
}

export interface ReportContext {
  modality: Modality;
  bodyRegion: string | null;
  contrast: "with" | "without" | "both" | "unknown";
  examReason: string | null;
  patientAgeYears: number | null;
  patientSex: "female" | "male" | "unknown";
  /** Report mentions a history of cancer / known malignancy. */
  knownCancer: Tri;
  /** Lung cancer screening exam (Lung-RADS / low-dose screening CT). */
  screeningExam: Tri;
  immunocompromised: Tri;
  cirrhosisOrHepaticRisk: Tri;
  priorComparisonAvailable: Tri;
  reportDate: string | null; // ISO date if present
}

/** Answers the patient gives in the UI. Optional, overrides the report. */
export interface PatientInputs {
  ageYears?: number | null;
  smoking?: "never" | "former" | "current" | "unknown";
  familyHistoryLungCancer?: boolean | null;
  emphysema?: boolean | null;
  knownCancer?: boolean | null;
  immunocompromised?: boolean | null;
  cirrhosisOrHepaticRisk?: boolean | null;
  examDate?: string | null; // ISO date of the scan
  limitedLifeExpectancy?: boolean | null;
}

export type RiskLevel = "low" | "high" | "unknown";

export interface PlanStep {
  /** e.g. "CT chest" */
  what: string;
  /** Window after the index exam, in months. [6, 12] = 6-12 months. */
  monthsFrom: number;
  monthsTo: number;
  /** "Optional"/"consider" in the guideline. */
  optional?: boolean;
  /** Shown as a short clause, e.g. "if the nodule is still there". */
  condition?: string;
}

export type PlanStatus =
  | "no-follow-up" // guideline says nothing further is needed
  | "follow-up" // scheduled surveillance imaging
  | "further-evaluation" // a different test now (MRI, PET, biopsy, labs)
  | "refer" // see a specialist now
  | "insufficient-data" // the report lacks something the rule needs
  | "out-of-scope"; // the guideline does not apply to this patient/finding

export type Urgency = "none" | "routine" | "soon" | "prompt";

export interface Plan {
  findingId: string;
  guideline: { name: string; citation: string; url: string };
  status: PlanStatus;
  urgency: Urgency;
  /** One sentence, plain language. */
  headline: string;
  /** What the guideline literally says for this branch. */
  guidelineText: string;
  steps: PlanStep[];
  /** When risk category is unknown, both branches are returned. */
  branches?: { label: string; risk: RiskLevel; steps: PlanStep[]; guidelineText: string }[];
  /** Which rules fired, in order. Audit trail. */
  rationale: string[];
  /** What the patient should ask. */
  questions: string[];
  /** What the rule needed and did not get. */
  missing?: string[];
}

export interface Guideline {
  name: string;
  citation: string;
  url: string;
}
