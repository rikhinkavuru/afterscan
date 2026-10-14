/**
 * ACR Incidental Findings Committee: incidental adrenal masses.
 * Mayo-Smith WW, et al. J Am Coll Radiol 2017;14(8):1038-1044.
 * https://doi.org/10.1016/j.jacr.2017.05.001
 *
 * Applies to adults (>= 18), asymptomatic, imaged for an unrelated reason.
 */
import type { Finding, Plan, PatientInputs, ReportContext, Guideline } from "./types";
import { insufficient, makePlan, mm, outOfScope, resolve, resolveAge, step, yes, radiologistNote } from "./shared";

export const ACR_ADRENAL: Guideline = {
  name: "ACR Incidental Adrenal Mass white paper (2017)",
  citation:
    "Mayo-Smith WW, et al. Management of Incidental Adrenal Masses: A White Paper of the ACR Incidental Findings Committee. J Am Coll Radiol 2017;14:1038-1044.",
  url: "https://doi.org/10.1016/j.jacr.2017.05.001",
};

const HORMONE_Q =
  "Should I have blood or urine tests to check whether this adrenal mass makes hormones?";

export function planAdrenal(f: Finding, ctx: ReportContext, p: PatientInputs): Plan {
  const rationale: string[] = [];
  const age = resolveAge(ctx, p);
  if (age !== null && age < 18)
    return outOfScope(f, ACR_ADRENAL, "These rules are for adults.", [], rationale);
  if (f.incidental === false)
    return outOfScope(f, ACR_ADRENAL, "This mass appears to be the reason for the scan, so the incidental-finding rules don't apply.", [], rationale);

  const size = mm(f.sizeMm);
  const cancer = resolve(p.knownCancer, ctx.knownCancer);

  // < 1 cm: "need not be pursued"
  if (size !== null && size < 10)
    return makePlan(f, ACR_ADRENAL, {
      status: "no-follow-up",
      headline: "An adrenal nodule under 1 cm generally does not need any further work-up.",
      guidelineText: "An incidental adrenal mass that is < 1 cm in the short axis need not be pursued.",
      rationale: [...rationale, `Size ${size} mm < 10 mm`],
      questions: ["Can you confirm this small adrenal nodule needs no follow-up?"],
    });

  // Diagnostic benign features
  const benignWhy: string[] = [];
  if (yes(f.macroscopicFat)) benignWhy.push("macroscopic fat (myelolipoma)");
  if (f.enhancement === "none") benignWhy.push("no enhancement (cyst or old bleed)");
  if (f.unenhancedHU !== null && f.unenhancedHU !== undefined && f.unenhancedHU <= 10) benignWhy.push(`unenhanced density ${f.unenhancedHU} HU (<= 10 HU = lipid-rich adenoma)`);
  if (yes(f.washoutMeetsAdenoma)) benignWhy.push("washout meets adenoma criteria");
  if (yes(f.explicitlyBenign)) benignWhy.push("radiologist characterised it as benign");
  if (yes(f.benignCalcification) || (yes(f.calcified) && f.stability === "stable")) benignWhy.push("benign calcification");
  if (benignWhy.length)
    return makePlan(f, ACR_ADRENAL, {
      status: "no-follow-up",
      headline: "The scan shows features that identify this as a benign adrenal mass, so no further imaging is needed.",
      guidelineText:
        "Masses with diagnostic benign features (myelolipoma, no enhancement, calcification, <= 10 HU, or signal drop on chemical-shift MRI) need no follow-up.",
      rationale: [...rationale, `Benign features: ${benignWhy.join("; ")}`],
      questions: [HORMONE_Q],
    });

  if (size === null)
    return insufficient(f, ACR_ADRENAL, ["mass size"], ["How big is the adrenal mass, and did the scan measure its density?", HORMONE_Q], rationale);

  // Stable >= 1 year on prior imaging = benign
  if (f.stability === "stable" && (f.stableMonths ?? 0) >= 12)
    return makePlan(f, ACR_ADRENAL, {
      status: "no-follow-up",
      headline: "An adrenal mass that has been stable for a year or more is considered benign. No further imaging is needed.",
      guidelineText: "If the mass has been stable for 1 year or longer, it is very likely benign and requires no additional imaging.",
      rationale: [...rationale, `Stable ${f.stableMonths} months`],
      questions: [HORMONE_Q],
    });

  const q = [...radiologistNote(f), HORMONE_Q];

  if (size >= 40) {
    return cancer === true
      ? makePlan(f, ACR_ADRENAL, {
          status: "further-evaluation",
          urgency: "prompt",
          headline: "An adrenal mass of 4 cm or more with a cancer history needs tissue sampling or a PET/CT to rule out spread.",
          guidelineText: ">= 4 cm with a cancer history: consider biopsy or PET/CT.",
          steps: [step("Biopsy or PET/CT (your oncologist chooses)", 0, 1)],
          rationale: [...rationale, `Size ${size} mm >= 40 mm; cancer history`],
          questions: q,
        })
      : makePlan(f, ACR_ADRENAL, {
          status: "refer",
          urgency: "prompt",
          headline: "An adrenal mass of 4 cm or more is usually removed surgically because of the risk of adrenal cancer. This needs a specialist soon.",
          guidelineText: ">= 4 cm with no cancer history: consider surgical resection.",
          steps: [step("Referral to endocrine or adrenal surgery", 0, 1)],
          rationale: [...rationale, `Size ${size} mm >= 40 mm; no cancer history`],
          questions: q,
        });
  }

  // 1 to < 4 cm, indeterminate
  if (f.stability === "new" || f.stability === "enlarging") {
    return cancer === true
      ? makePlan(f, ACR_ADRENAL, {
          status: "further-evaluation",
          urgency: "prompt",
          headline: "A new or growing adrenal mass with a cancer history needs biopsy or PET/CT to check for spread.",
          guidelineText: "New or enlarging, with cancer history: consider biopsy or PET/CT.",
          steps: [step("Biopsy or PET/CT (your oncologist chooses)", 0, 1)],
          rationale: [...rationale, `${size} mm, ${f.stability}, cancer history`],
          questions: q,
        })
      : makePlan(f, ACR_ADRENAL, {
          status: "further-evaluation",
          urgency: "soon",
          headline: "A new or growing adrenal mass needs a dedicated adrenal CT or a surgical opinion.",
          guidelineText: "New or enlarging, no cancer history: consider follow-up adrenal CT or resection.",
          steps: [step("Dedicated adrenal-protocol CT (or surgical consultation)", 0, 3)],
          rationale: [...rationale, `${size} mm, ${f.stability}, no cancer history`],
          questions: q,
        });
  }

  if (cancer === true)
    return makePlan(f, ACR_ADRENAL, {
      status: "further-evaluation",
      urgency: "soon",
      headline: "With a cancer history, an uncharacterised adrenal mass should get a dedicated adrenal CT to tell adenoma from spread.",
      guidelineText: "No prior imaging, cancer history, isolated mass: adrenal CT (washout); PET/CT or biopsy if still indeterminate.",
      steps: [step("Dedicated adrenal-protocol CT (or chemical-shift MRI)", 0, 2)],
      rationale: [...rationale, `${size} mm, no prior stability, cancer history`],
      questions: q,
    });

  if (size < 20)
    return makePlan(f, ACR_ADRENAL, {
      status: "follow-up",
      headline: "A 1-2 cm adrenal mass without benign features is probably benign. The guideline suggests one follow-up adrenal CT at 12 months to confirm it is not growing.",
      guidelineText: "1-2 cm, no prior imaging, no cancer history: probably benign; consider 12-month follow-up adrenal CT.",
      steps: [step("Adrenal-protocol CT", 12, 12, { optional: true })],
      rationale: [...rationale, `${size} mm, 10-19 mm, no prior imaging, no cancer history`],
      questions: q,
    });

  return makePlan(f, ACR_ADRENAL, {
    status: "further-evaluation",
    urgency: "soon",
    headline: "A 2-4 cm adrenal mass without benign features should be characterised now with a dedicated adrenal CT (or MRI).",
    guidelineText: "> 2 cm and < 4 cm, no prior imaging, no cancer history: dedicated adrenal CT at the time of discovery.",
    steps: [step("Dedicated adrenal-protocol CT (or chemical-shift MRI)", 0, 3)],
    rationale: [...rationale, `${size} mm, 20-39 mm, no prior imaging, no cancer history`],
    questions: q,
  });
}
