import type { Finding, Plan, PatientInputs, ReportContext } from "./types";
import { planLung } from "./lung";
import { planAdrenal } from "./adrenal";
import { planKidney } from "./kidney";
import { planLiver } from "./liver";
import { planPancreas } from "./pancreas";
import { planThyroid } from "./thyroid";
import { makePlan, radiologistNote } from "./shared";

export * from "./types";
export { planLung, planAdrenal, planKidney, planLiver, planPancreas, planThyroid };

export const GUIDELINE_COVERAGE: Record<string, string> = {
  lung: "Fleischner Society 2017",
  adrenal: "ACR Incidental Adrenal Mass white paper 2017",
  kidney: "ACR Incidental Renal Mass white paper 2017 (Bosniak)",
  liver: "ACR Incidental Liver Lesion white paper 2017",
  pancreas: "ACR Incidental Pancreatic Cyst white paper 2017",
  thyroid: "ACR Incidental Thyroid Nodule white paper 2015 / ACR TI-RADS 2017",
};

export function planFinding(f: Finding, ctx: ReportContext, p: PatientInputs = {}): Plan {
  switch (f.organ) {
    case "lung":
      return planLung(f, ctx, p);
    case "adrenal":
      return planAdrenal(f, ctx, p);
    case "kidney":
      return planKidney(f, ctx, p);
    case "liver":
      return planLiver(f, ctx, p);
    case "pancreas":
      return planPancreas(f, ctx, p);
    case "thyroid":
      return planThyroid(f, ctx, p);
    default:
      return makePlan(
        f,
        { name: "Not covered", citation: "", url: "" },
        {
          status: "out-of-scope",
          urgency: "none",
          headline: `This tool has no guideline rules for ${f.organLabel ?? "this organ"}. Ask your doctor what follow-up the radiologist intended.`,
          guidelineText: "",
          rationale: [`Organ "${f.organLabel ?? f.organ}" not covered`],
          questions: [...radiologistNote(f), "What follow-up, if any, do you recommend for this finding, and who will arrange it?"],
        },
      );
  }
}

export function planAll(findings: Finding[], ctx: ReportContext, p: PatientInputs = {}): Plan[] {
  return findings.map((f) => planFinding(f, ctx, p));
}
