import type {
  Finding,
  Plan,
  PlanStep,
  PlanStatus,
  Urgency,
  Guideline,
  PatientInputs,
  ReportContext,
  Tri,
} from "./types";

export const step = (
  what: string,
  monthsFrom: number,
  monthsTo: number,
  extra: Partial<PlanStep> = {},
): PlanStep => ({ what, monthsFrom, monthsTo, ...extra });

export function makePlan(
  finding: Finding,
  guideline: Guideline,
  partial: Partial<Plan> & { status: PlanStatus; headline: string },
): Plan {
  const urgency: Urgency =
    partial.urgency ??
    (partial.status === "refer" || partial.status === "further-evaluation"
      ? "soon"
      : partial.status === "follow-up"
        ? "routine"
        : "none");
  return {
    findingId: finding.id,
    guideline,
    steps: [],
    rationale: [],
    questions: [],
    guidelineText: "",
    ...partial,
    urgency,
  };
}

/** True only when the report or the patient explicitly said yes. */
export const yes = (v: Tri | undefined): boolean => v === true;
export const no = (v: Tri | undefined): boolean => v === false;

/** Patient inputs override the report's reading of the same fact. */
export function resolve(
  patient: boolean | null | undefined,
  report: Tri | undefined,
): Tri {
  if (patient === true || patient === false) return patient;
  return report ?? null;
}

export function resolveAge(ctx: ReportContext, p: PatientInputs): number | null {
  if (typeof p.ageYears === "number") return p.ageYears;
  return ctx.patientAgeYears;
}

export function outOfScope(
  finding: Finding,
  guideline: Guideline,
  reason: string,
  questions: string[] = [],
  rationale: string[] = [],
): Plan {
  return makePlan(finding, guideline, {
    status: "out-of-scope",
    urgency: "none",
    headline: reason,
    guidelineText: "",
    questions: questions.length
      ? questions
      : [
          "What follow-up, if any, do you recommend for this finding?",
        ],
    rationale: [...rationale, `Out of scope: ${reason}`],
  });
}

export function insufficient(
  finding: Finding,
  guideline: Guideline,
  missing: string[],
  questions: string[],
  rationale: string[] = [],
): Plan {
  return makePlan(finding, guideline, {
    status: "insufficient-data",
    urgency: "none",
    headline:
      "The report doesn't give enough detail for the guideline to apply. The question below gets the missing piece.",
    guidelineText: "",
    missing,
    questions,
    rationale: [...rationale, `Missing: ${missing.join("; ")}`],
  });
}

/** mm helper: treat values given in cm by the extractor defensively. */
export function mm(v: number | null | undefined): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return v;
}

/** Fleischner: average of long and short axis, rounded to nearest mm. */
export function averageDiameterMm(f: Finding): number | null {
  const long = mm(f.sizeMm);
  if (long === null) return null;
  const short = mm(f.sizeShortMm ?? null);
  if (short === null) return Math.round(long);
  return Math.round((long + short) / 2);
}

export const questionsForMissingSize = (what: string) => [
  `How big is the ${what}, in millimetres?`,
];

export function radiologistNote(f: Finding): string[] {
  return f.radiologistRecommendation
    ? [
        `Your radiologist wrote: "${f.radiologistRecommendation.trim()}". Their recommendation takes priority over this tool.`,
      ]
    : [];
}
