/**
 * ACR Incidental Findings Committee: incidental liver lesions on CT.
 * Gore RM, et al. J Am Coll Radiol 2017;14(11):1429-1437.
 * https://doi.org/10.1016/j.jacr.2017.07.018
 */
import type { Finding, Plan, PatientInputs, ReportContext, Guideline, RiskLevel } from "./types";
import { insufficient, makePlan, mm, outOfScope, resolve, resolveAge, step, yes, radiologistNote } from "./shared";

export const ACR_LIVER: Guideline = {
  name: "ACR Incidental Liver Lesion white paper (2017)",
  citation:
    "Gore RM, et al. Management of Incidental Liver Lesions on CT: A White Paper of the ACR Incidental Findings Committee. J Am Coll Radiol 2017;14:1429-1437.",
  url: "https://doi.org/10.1016/j.jacr.2017.07.018",
};

/** High risk = known malignancy that spreads to the liver, cirrhosis, or hepatic risk factors. */
export function liverRisk(ctx: ReportContext, p: PatientInputs): RiskLevel {
  const cancer = resolve(p.knownCancer, ctx.knownCancer);
  const hepatic = resolve(p.cirrhosisOrHepaticRisk, ctx.cirrhosisOrHepaticRisk);
  if (cancer === true || hepatic === true) return "high";
  if (cancer === false && hepatic === false) return "low";
  return "unknown";
}

export function planLiver(f: Finding, ctx: ReportContext, p: PatientInputs): Plan {
  const rationale: string[] = [];
  const age = resolveAge(ctx, p);
  if (age !== null && age < 18) return outOfScope(f, ACR_LIVER, "These rules are for adults.", [], rationale);
  if (f.incidental === false)
    return outOfScope(f, ACR_LIVER, "This lesion appears to be the reason for the scan, so the incidental-finding rules don't apply.", [], rationale);

  const size = mm(f.sizeMm);
  const q = [...radiologistNote(f)];

  if (yes(f.explicitlyBenign))
    return makePlan(f, ACR_LIVER, {
      status: "no-follow-up",
      headline: "The radiologist identified this as a benign liver lesion (such as a simple cyst or hemangioma). No follow-up is needed.",
      guidelineText: "Lesions with distinctly benign imaging features (cyst, hemangioma, FNH, focal fat) need no follow-up regardless of patient risk.",
      rationale: [...rationale, "Explicitly benign"],
      questions: ["Can you confirm this is a benign liver lesion that needs no follow-up?"],
    });

  const risk = liverRisk(ctx, p);
  rationale.push(`Patient risk: ${risk}`);
  if (size === null)
    return insufficient(f, ACR_LIVER, ["lesion size"], ["How big is the liver lesion, and did it look like a simple cyst?"], rationale);

  const benign = yes(f.explicitlyBenign) || (f.unenhancedHU !== null && f.unenhancedHU !== undefined && f.unenhancedHU <= 20 && yes(f.homogeneous) && !yes(f.suspiciousFeatures));
  const suspicious = yes(f.suspiciousFeatures);
  const flash = yes(f.flashFilling);

  if (size < 10) {
    if (risk === "high")
      return makePlan(f, ACR_LIVER, {
        status: "follow-up",
        headline: "Small liver spots are usually benign, but because of your liver or cancer history the guideline asks for an MRI in 3-6 months to make sure it is not growing.",
        guidelineText: "< 1 cm, high-risk patient: follow-up MRI in 3-6 months.",
        steps: [step("MRI of the liver", 3, 6)],
        rationale: [...rationale, `${size} mm < 10 mm, high risk`],
        questions: [...q, "Who will order the 3-6 month liver MRI?"],
      });
    if (risk === "low")
      return makePlan(f, ACR_LIVER, {
        status: "no-follow-up",
        headline: "A liver spot under 1 cm in someone without liver disease or cancer is considered benign. No follow-up is needed.",
        guidelineText: "< 1 cm, low-risk patient: benign; no further follow-up.",
        rationale: [...rationale, `${size} mm < 10 mm, low risk`],
        questions: ["Can you confirm this tiny liver spot needs no follow-up?"],
      });
    return makePlan(f, ACR_LIVER, {
      status: "follow-up",
      headline: "A liver spot under 1 cm is benign in most people. If you have cirrhosis, hepatitis, or a cancer that can spread to the liver, an MRI in 3-6 months is advised; otherwise nothing is needed.",
      guidelineText: "< 1 cm: low risk, no follow-up; high risk, MRI in 3-6 months.",
      steps: [step("MRI of the liver", 3, 6, { condition: "only if you are high risk" })],
      branches: [
        { label: "If low risk", risk: "low", steps: [], guidelineText: "< 1 cm, low-risk: no follow-up." },
        { label: "If high risk", risk: "high", steps: [step("MRI of the liver", 3, 6)], guidelineText: "< 1 cm, high-risk: MRI in 3-6 months." },
      ],
      rationale: [...rationale, `${size} mm < 10 mm, risk unknown`],
      questions: [...q, "Do I count as high risk for liver lesions (cirrhosis, hepatitis, or a cancer that spreads to the liver)?"],
    });
  }

  if (benign)
    return makePlan(f, ACR_LIVER, {
      status: "no-follow-up",
      headline: "This liver lesion has benign features (low density, sharp edges), so no follow-up is needed.",
      guidelineText: ">= 1 cm with benign imaging features: benign; no further follow-up.",
      rationale: [...rationale, `${size} mm, benign features`],
      questions: ["Can you confirm this liver lesion is a benign cyst?"],
    });

  const mriNow = (why: string, headline: string) =>
    makePlan(f, ACR_LIVER, {
      status: "further-evaluation",
      urgency: "soon",
      headline,
      guidelineText: why,
      steps: [step("MRI of the liver with contrast", 0, 2)],
      rationale: [...rationale, why],
      questions: [...q, "When can the liver MRI be scheduled?"],
    });

  if (size <= 15) {
    if (suspicious) return mriNow("1.0-1.5 cm with suspicious features: prompt MRI.", "This liver lesion has features the guideline treats as suspicious, so an MRI is advised now.");
    if (flash) {
      if (risk === "low")
        return makePlan(f, ACR_LIVER, {
          status: "no-follow-up",
          headline: "A small bright-filling liver lesion in a low-risk person is almost always a benign hemangioma. No follow-up is needed.",
          guidelineText: "1.0-1.5 cm flash-filling, low-risk: benign; no further follow-up.",
          rationale: [...rationale, `${size} mm flash-filling, low risk`],
          questions: ["Can you confirm this is a hemangioma?"],
        });
      if (risk === "high") return mriNow("1.0-1.5 cm flash-filling, high-risk: prompt MRI.", "A bright-filling liver lesion needs an MRI now because of your liver or cancer history.");
      return mriNow("1.0-1.5 cm flash-filling: no follow-up if low risk; prompt MRI if high risk.", "A bright-filling liver lesion is benign in low-risk people but needs an MRI if you have liver disease or cancer. Ask which applies to you.");
    }
    // features not stated
    return mriNow(
      "1.0-1.5 cm without stated benign features: when imaging cannot establish benign vs suspicious features, prompt MRI is advised.",
      "This 1-1.5 cm liver lesion wasn't fully characterised on CT. The guideline advises an MRI to settle whether it is benign.",
    );
  }

  // > 1.5 cm
  if (risk === "high" && (suspicious || flash || !benign))
    return makePlan(f, ACR_LIVER, {
      status: "further-evaluation",
      urgency: "prompt",
      headline: "A liver lesion over 1.5 cm without benign features, in someone with liver disease or cancer, needs an MRI now and possibly a biopsy.",
      guidelineText: "> 1.5 cm, high-risk, suspicious or flash-filling or uncharacterised: MRI now or biopsy.",
      steps: [step("MRI of the liver with contrast (biopsy if your doctor advises)", 0, 1)],
      rationale: [...rationale, `${size} mm > 15 mm, high risk, not benign`],
      questions: [...q, "Do you want an MRI first, or a biopsy?"],
    });
  return mriNow(
    "> 1.5 cm, suspicious, flash-filling, or uncharacterised: prompt MRI.",
    "A liver lesion over 1.5 cm that isn't clearly benign should have an MRI to characterise it.",
  );
}
