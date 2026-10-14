/**
 * ACR incidental thyroid nodule white paper (Hoang JK, et al. JACR 2015;12:143-150)
 * for nodules seen on CT, MRI, or non-thyroid ultrasound, and
 * ACR TI-RADS (Tessler FN, et al. JACR 2017;14:587-595) for nodules graded on
 * dedicated thyroid ultrasound.
 */
import type { Finding, Plan, PatientInputs, ReportContext, Guideline } from "./types";
import { insufficient, makePlan, mm, outOfScope, resolveAge, step, yes, radiologistNote } from "./shared";

export const ACR_THYROID: Guideline = {
  name: "ACR Incidental Thyroid Nodule white paper (2015) / ACR TI-RADS (2017)",
  citation:
    "Hoang JK, et al. Managing Incidental Thyroid Nodules Detected on Imaging: White Paper of the ACR Incidental Thyroid Findings Committee. J Am Coll Radiol 2015;12:143-150. Tessler FN, et al. ACR TI-RADS. J Am Coll Radiol 2017;14:587-595.",
  url: "https://doi.org/10.1016/j.jacr.2014.09.038",
};

export function planThyroid(f: Finding, ctx: ReportContext, p: PatientInputs): Plan {
  const rationale: string[] = [];
  const q = [...radiologistNote(f)];
  if (f.incidental === false)
    return outOfScope(f, ACR_THYROID, "This nodule appears to be the reason for the scan, so the incidental-finding rules don't apply.", [], rationale);
  if (p.limitedLifeExpectancy === true)
    return makePlan(f, ACR_THYROID, {
      status: "no-follow-up",
      headline: "The guideline does not recommend working up incidental thyroid nodules when other serious illness limits life expectancy.",
      guidelineText: "No further evaluation in patients with limited life expectancy or serious comorbidities.",
      rationale: [...rationale, "Limited life expectancy"],
      questions: ["Is any work-up of this thyroid nodule worthwhile for me?"],
    });

  // TI-RADS pathway (dedicated thyroid ultrasound)
  if (f.tiRads) {
    const size = mm(f.sizeMm);
    const tr = f.tiRads;
    if (tr <= 2)
      return makePlan(f, ACR_THYROID, {
        status: "no-follow-up",
        headline: `A TI-RADS ${tr} nodule is benign-appearing. No biopsy or follow-up is recommended.`,
        guidelineText: "TR1 and TR2: no FNA, no follow-up.",
        rationale: [...rationale, `TI-RADS ${tr}`],
        questions: ["Can you confirm this nodule needs no follow-up?"],
      });
    if (size === null) return insufficient(f, ACR_THYROID, ["nodule size"], ["How big is the thyroid nodule in millimetres?"], rationale);
    const fnaAt = tr === 3 ? 25 : tr === 4 ? 15 : 10;
    const followAt = tr === 3 ? 15 : tr === 4 ? 10 : 5;
    const years = tr === 3 ? [1, 3, 5] : tr === 4 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
    if (size >= fnaAt)
      return makePlan(f, ACR_THYROID, {
        status: "further-evaluation",
        urgency: "soon",
        headline: `A TI-RADS ${tr} nodule of ${size} mm meets the size for a needle biopsy (FNA).`,
        guidelineText: `TR${tr}: FNA if >= ${fnaAt / 10} cm.`,
        steps: [step("Ultrasound-guided fine-needle aspiration (FNA)", 0, 2)],
        rationale: [...rationale, `TI-RADS ${tr}, ${size} mm >= ${fnaAt} mm`],
        questions: [...q, "Who will do the biopsy, and when?"],
      });
    if (size >= followAt)
      return makePlan(f, ACR_THYROID, {
        status: "follow-up",
        headline: `A TI-RADS ${tr} nodule of ${size} mm is below the biopsy size but should be re-scanned with ultrasound to check for growth.`,
        guidelineText: `TR${tr}: follow-up ultrasound if >= ${followAt / 10} cm, at ${years.join(", ")} years.`,
        steps: years.map((y) => step("Thyroid ultrasound", y * 12, y * 12)),
        rationale: [...rationale, `TI-RADS ${tr}, ${size} mm, follow-up range`],
        questions: [...q, "Who will order the follow-up thyroid ultrasounds?"],
      });
    return makePlan(f, ACR_THYROID, {
      status: "no-follow-up",
      headline: `A TI-RADS ${tr} nodule of ${size} mm is below the size at which the guideline recommends biopsy or follow-up.`,
      guidelineText: `TR${tr}: no FNA or follow-up below ${followAt / 10} cm.`,
      rationale: [...rationale, `TI-RADS ${tr}, ${size} mm < ${followAt} mm`],
      questions: ["Can you confirm this small nodule needs no follow-up?"],
    });
  }

  // Incidental on CT / MRI / non-thyroid US / PET
  if (yes(f.petAvid))
    return makePlan(f, ACR_THYROID, {
      status: "further-evaluation",
      urgency: "soon",
      headline: "A thyroid nodule that lights up on a PET scan should have a dedicated ultrasound and a needle biopsy.",
      guidelineText: "Focal FDG-PET uptake in the thyroid: dedicated thyroid ultrasound and FNA.",
      steps: [step("Thyroid ultrasound and FNA", 0, 2)],
      rationale: [...rationale, "PET-avid"],
      questions: q,
    });
  if (yes(f.thyroidSuspicious))
    return makePlan(f, ACR_THYROID, {
      status: "further-evaluation",
      urgency: "soon",
      headline: "This thyroid nodule has suspicious features (invasion of nearby tissue or abnormal lymph nodes) and needs a dedicated ultrasound now.",
      guidelineText: "Suspicious features (local invasion, abnormal lymph nodes): dedicated thyroid ultrasound.",
      steps: [step("Thyroid ultrasound", 0, 1)],
      rationale: [...rationale, "Suspicious imaging features"],
      questions: q,
    });
  const size = mm(f.sizeMm);
  if (size === null) return insufficient(f, ACR_THYROID, ["nodule size"], ["How big is the thyroid nodule in millimetres?"], rationale);
  const age = resolveAge(ctx, p);
  const threshold = age === null ? null : age < 35 ? 10 : 15;
  if (threshold === null) {
    const needsUS = size >= 15 ? true : size >= 10 ? null : false;
    if (needsUS === true || needsUS === false)
      return needsUS
        ? usPlan(f, size, rationale, q, "Nodule >= 1.5 cm: dedicated thyroid ultrasound at any adult age.")
        : noPlan(f, size, rationale, "Nodule < 1 cm: no further evaluation at any adult age.");
    return makePlan(f, ACR_THYROID, {
      status: "follow-up",
      headline: "Whether this 1-1.5 cm thyroid nodule needs an ultrasound depends on age: yes if under 35, no if 35 or older. Enter your age, or ask your doctor.",
      guidelineText: "Age < 35: ultrasound if >= 1 cm. Age >= 35: ultrasound if >= 1.5 cm.",
      steps: [step("Thyroid ultrasound", 0, 3, { condition: "if you are under 35" })],
      rationale: [...rationale, `${size} mm, age unknown`],
      questions: [...q, "Do I need a thyroid ultrasound for this nodule?"],
    });
  }
  const ageLabel = threshold === 10 ? "< 35" : ">= 35";
  rationale.push(`Age ${age}: ultrasound threshold ${threshold} mm`);
  return size >= threshold
    ? usPlan(f, size, rationale, q, `Age ${ageLabel}, nodule >= ${threshold / 10} cm: dedicated thyroid ultrasound.`)
    : noPlan(f, size, rationale, `Age ${ageLabel}, nodule < ${threshold / 10} cm: no further evaluation.`);
}

const an = (n: number) => (/^(8|11|18|8\d)$/.test(String(n)) ? "An" : "A");

function usPlan(f: Finding, size: number, rationale: string[], q: string[], text: string): Plan {
  return makePlan(f, ACR_THYROID, {
    status: "further-evaluation",
    headline: `${an(size)} ${size} mm thyroid nodule found by chance is large enough that the guideline recommends a dedicated thyroid ultrasound to grade it.`,
    guidelineText: text,
    steps: [step("Thyroid ultrasound", 0, 3)],
    rationale: [...rationale, text],
    questions: [...q, "Can you order a dedicated thyroid ultrasound?"],
  });
}
function noPlan(f: Finding, size: number, rationale: string[], text: string): Plan {
  return makePlan(f, ACR_THYROID, {
    status: "no-follow-up",
    headline: `${an(size)} ${size} mm thyroid nodule found by chance, with no suspicious features, is below the size at which the guideline recommends any work-up.`,
    guidelineText: text,
    rationale: [...rationale, text],
    questions: ["Can you confirm this small thyroid nodule needs no follow-up?"],
  });
}
