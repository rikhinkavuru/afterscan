/**
 * ACR Incidental Findings Committee: incidental pancreatic cysts.
 * Megibow AJ, et al. J Am Coll Radiol 2017;14(7):911-923.
 * https://doi.org/10.1016/j.jacr.2017.03.010
 *
 * Follow-up imaging means contrast-enhanced MRI or pancreas-protocol CT.
 * Any mural nodule, wall thickening, main duct >= 7 mm, or jaundice prompts
 * immediate EUS/FNA and surgical evaluation regardless of size.
 */
import type { Finding, Plan, PatientInputs, PlanStep, ReportContext, Guideline } from "./types";
import { insufficient, makePlan, mm, outOfScope, resolveAge, step, yes, radiologistNote } from "./shared";

export const ACR_PANCREAS: Guideline = {
  name: "ACR Incidental Pancreatic Cyst white paper (2017)",
  citation:
    "Megibow AJ, et al. Management of Incidental Pancreatic Cysts: A White Paper of the ACR Incidental Findings Committee. J Am Coll Radiol 2017;14:911-923.",
  url: "https://doi.org/10.1016/j.jacr.2017.03.010",
};

const IMG = "MRI with contrast (or pancreas-protocol CT)";

/** Build a schedule from a list of (intervalMonths, count) phases. */
function schedule(phases: [number, number][], stopNote: string): PlanStep[] {
  const steps: PlanStep[] = [];
  let t = 0;
  for (const [interval, count] of phases)
    for (let i = 0; i < count; i++) {
      t += interval;
      steps.push(step(IMG, t, t));
    }
  if (steps.length) steps[steps.length - 1].condition = stopNote;
  return steps;
}

export function planPancreas(f: Finding, ctx: ReportContext, p: PatientInputs): Plan {
  const rationale: string[] = [];
  const age = resolveAge(ctx, p);
  if (age !== null && age < 18) return outOfScope(f, ACR_PANCREAS, "These rules are for adults.", [], rationale);
  if (f.incidental === false)
    return outOfScope(f, ACR_PANCREAS, "This cyst appears to be the reason for the scan, so the incidental-finding rules don't apply.", [], rationale);
  const q = [...radiologistNote(f)];

  if (yes(f.highRiskStigmata) || yes(f.worrisomeFeatures))
    return makePlan(f, ACR_PANCREAS, {
      status: "refer",
      urgency: "prompt",
      headline: "This cyst has features (a nodule, thick wall, or a widened duct) that the guideline says need an endoscopic ultrasound and a surgeon's opinion promptly, whatever its size.",
      guidelineText:
        "Any mural nodule, wall thickening, main pancreatic duct >= 7 mm, or obstructive jaundice should prompt immediate EUS/FNA and surgical evaluation regardless of size or growth.",
      steps: [step("Endoscopic ultrasound with fluid sampling (EUS/FNA) and surgical consultation", 0, 1)],
      rationale: [...rationale, "Worrisome features or high-risk stigmata present"],
      questions: [...q, "Which gastroenterologist or pancreatic surgeon should I see, and how soon?"],
    });

  const size = mm(f.sizeMm);
  if (size === null)
    return insufficient(f, ACR_PANCREAS, ["cyst size"], ["How big is the pancreatic cyst, and does it connect to the main duct?"], rationale);
  if (age === null)
    return insufficient(
      f,
      ACR_PANCREAS,
      ["patient age"],
      ["The schedule depends on age. Enter your age above and run again, or ask: how often should this cyst be re-scanned?"],
      [...rationale, `${size} mm cyst; age needed to pick the chart`],
    );
  rationale.push(`Cyst ${size} mm, age ${age}`);

  if (age >= 80) {
    if (size <= 25)
      return makePlan(f, ACR_PANCREAS, {
        status: "follow-up",
        headline: "At 80 or older, a cyst of 2.5 cm or less is re-scanned every 2 years twice; if stable, follow-up stops. Your overall health and wishes guide whether to do this at all.",
        guidelineText: "Age >= 80, cyst <= 2.5 cm: reimage every 2 years x 2; stop if stable.",
        steps: schedule([[24, 2]], "stop if stable"),
        rationale: [...rationale, "Chart 4, <= 2.5 cm"],
        questions: [...q, "Given my overall health, is follow-up of this cyst worthwhile?"],
      });
    if (yes(f.serousCystadenoma))
      return makePlan(f, ACR_PANCREAS, {
        status: "no-follow-up",
        headline: "A serous cystadenoma is benign. Over 4 cm a surgeon may discuss removal; otherwise no follow-up is needed.",
        guidelineText: "Serous cystadenoma: benign; surgical consultation if > 4 cm.",
        steps: size > 40 ? [step("Surgical consultation", 0, 3)] : [],
        rationale: [...rationale, "Serous cystadenoma"],
        questions: q,
      });
    return makePlan(f, ACR_PANCREAS, {
      status: "follow-up",
      headline: "At 80 or older, a cyst over 2.5 cm without worrying features is re-scanned every 2 years twice, if you would want treatment should it change.",
      guidelineText: "Age >= 80, cyst > 2.5 cm, low risk by imaging: reimage every 2 years x 2; stop if stable. High-risk features: EUS/FNA + surgical consultation.",
      steps: schedule([[24, 2]], "stop if stable"),
      rationale: [...rationale, "Chart 4, > 2.5 cm, low risk by imaging"],
      questions: [...q, "Given my overall health, is follow-up of this cyst worthwhile?"],
    });
  }

  if (size < 15) {
    if (age < 65)
      return makePlan(f, ACR_PANCREAS, {
        status: "follow-up",
        headline: "Small pancreatic cysts are common and usually harmless, but the guideline watches them: a scan every year for 5 years, then every 2 years twice. Follow-up stops after about 9-10 years if nothing changes.",
        guidelineText: "< 1.5 cm, age < 65: reimage yearly x 5; if stable, every 2 years x 2; stop if stable over a minimum of 9 years. Growth (100% for < 5 mm, 50% for 5-15 mm) triggers yearly imaging or EUS/FNA.",
        steps: schedule([[12, 5], [24, 2]], "stop if stable over 9+ years"),
        rationale: [...rationale, "Chart 1, < 1.5 cm, age < 65"],
        questions: [...q, "Who will order the yearly pancreas MRI, and will it be MRI or CT?"],
      });
    return makePlan(f, ACR_PANCREAS, {
      status: "follow-up",
      headline: "Small pancreatic cysts are common and usually harmless. At 65-79 the guideline re-scans every 2 years for 10 years and stops if nothing changes.",
      guidelineText: "< 1.5 cm, age 65-79: reimage every 2 years x 5; stop if stable over 10 years.",
      steps: schedule([[24, 5]], "stop if stable over 10 years"),
      rationale: [...rationale, "Chart 1, < 1.5 cm, age 65-79"],
      questions: [...q, "Who will order the follow-up pancreas MRI every 2 years?"],
    });
  }

  if (size <= 25) {
    const duct = f.mainDuctCommunication ?? "unknown";
    if (duct === "yes" && size < 20)
      return makePlan(f, ACR_PANCREAS, {
        status: "follow-up",
        headline: "A 1.5-2 cm cyst connected to the pancreatic duct (a branch-duct IPMN) is watched yearly for 5 years, then every 2 years twice. An endoscopic ultrasound is an alternative your doctor may offer.",
        guidelineText: "1.5-1.9 cm with main duct communication: reimage yearly x 5, then every 2 years x 2; stop if stable over 9 years. EUS/FNA may be performed instead.",
        steps: schedule([[12, 5], [24, 2]], "stop if stable over 9 years"),
        rationale: [...rationale, "Chart 2A, 1.5-1.9 cm, duct communication"],
        questions: [...q, "Would you recommend an endoscopic ultrasound now, or imaging follow-up?"],
      });
    return makePlan(f, ACR_PANCREAS, {
      status: "follow-up",
      headline: "A 1.5-2.5 cm cyst is watched closely at first (every 6 months for 2 years), then yearly, then every 2 years, for about 10 years. An endoscopic ultrasound is an alternative your doctor may offer.",
      guidelineText:
        duct === "yes"
          ? "2.0-2.5 cm with main duct communication: reimage every 6 months x 4, then yearly x 2, then every 2 years x 3; stop if stable over 10 years. EUS/FNA may be performed instead."
          : "1.5-2.5 cm, main duct communication absent or undetermined: reimage every 6 months x 4, then yearly x 2, then every 2 years x 3; stop if stable over 10 years. EUS/FNA may be performed instead.",
      steps: schedule([[6, 4], [12, 2], [24, 3]], "stop if stable over 10 years"),
      rationale: [...rationale, `Chart 2${duct === "yes" ? "A" : "B"}, ${size} mm`],
      questions: [...q, "Would you recommend an endoscopic ultrasound now, or imaging follow-up?"],
    });
  }

  // > 2.5 cm
  if (yes(f.serousCystadenoma))
    return makePlan(f, ACR_PANCREAS, {
      status: size > 40 ? "refer" : "no-follow-up",
      headline: "A serous cystadenoma is benign. Over 4 cm a surgeon may discuss removal; otherwise no follow-up is needed.",
      guidelineText: "Serous cystadenoma: benign; surgical consultation for consideration of resection if > 4 cm.",
      steps: size > 40 ? [step("Surgical consultation", 0, 3)] : [],
      rationale: [...rationale, "Chart 3, serous cystadenoma"],
      questions: q,
    });
  return makePlan(f, ACR_PANCREAS, {
    status: "further-evaluation",
    urgency: "soon",
    headline: "A pancreatic cyst over 2.5 cm is usually sampled with an endoscopic ultrasound. If it has no worrying features, close imaging follow-up (every 6 months at first) is the alternative.",
    guidelineText:
      "> 2.5 cm: immediate EUS/FNA is performed in many centers. Low risk by imaging: reimage every 6 months x 4, then yearly x 2, then every 2 years x 3; stop if stable over 10 years.",
    steps: [step("Endoscopic ultrasound with fluid sampling (EUS/FNA), or start 6-monthly imaging", 0, 6), ...schedule([[6, 4], [12, 2], [24, 3]], "stop if stable over 10 years").slice(1)],
    rationale: [...rationale, "Chart 3, > 2.5 cm, low risk by imaging"],
    questions: [...q, "Should this cyst be sampled with an endoscopic ultrasound, or followed with scans?"],
  });
}
