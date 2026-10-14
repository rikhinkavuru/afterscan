/**
 * ACR Incidental Findings Committee: incidental renal mass on CT.
 * Herts BR, et al. J Am Coll Radiol 2018;15(2):264-273 (online 2017).
 * https://doi.org/10.1016/j.jacr.2017.04.028
 * Bosniak classification per Table 2 of the same paper.
 */
import type { Finding, Plan, PatientInputs, ReportContext, Guideline } from "./types";
import { insufficient, makePlan, mm, outOfScope, resolve, resolveAge, step, yes, no, radiologistNote } from "./shared";

export const ACR_RENAL: Guideline = {
  name: "ACR Incidental Renal Mass white paper (2017)",
  citation:
    "Herts BR, et al. Management of the Incidental Renal Mass on CT: A White Paper of the ACR Incidental Findings Committee. J Am Coll Radiol 2018;15:264-273.",
  url: "https://doi.org/10.1016/j.jacr.2017.04.028",
};

const IIF_STEPS = [
  step("CT or MRI of the kidneys, without and with contrast", 6, 6),
  step("CT or MRI of the kidneys, without and with contrast", 12, 12),
  step("CT or MRI of the kidneys", 24, 24),
  step("CT or MRI of the kidneys", 36, 36),
  step("CT or MRI of the kidneys", 48, 48),
  step("CT or MRI of the kidneys", 60, 60),
];

export function planKidney(f: Finding, ctx: ReportContext, p: PatientInputs): Plan {
  const rationale: string[] = [];
  const age = resolveAge(ctx, p);
  if (age !== null && age < 18) return outOfScope(f, ACR_RENAL, "These rules are for adults.", [], rationale);
  const cancer = resolve(p.knownCancer, ctx.knownCancer);
  if (cancer === true)
    return outOfScope(
      f,
      ACR_RENAL,
      "These rules exclude people with a cancer that can spread to the kidney (for example lung cancer, lymphoma, melanoma). Your oncology team decides.",
      ["Could this kidney finding be related to my cancer, and what imaging do you want next?"],
      rationale,
    );
  if (f.incidental === false)
    return outOfScope(f, ACR_RENAL, "This mass appears to be the reason for the scan, so the incidental-finding rules don't apply.", [], rationale);

  const size = mm(f.sizeMm);
  const q = [...radiologistNote(f)];

  // Fat-containing: angiomyolipoma pathway (Fig 5)
  if (yes(f.macroscopicFat)) {
    if (yes(f.calcified))
      return makePlan(f, ACR_RENAL, {
        status: "further-evaluation",
        urgency: "soon",
        headline: "A fat-containing kidney mass with calcification is treated as a possible kidney cancer and needs a dedicated CT or MRI now.",
        guidelineText: "Fat-containing mass with calcification: suspected renal cell carcinoma; CT or MRI without and with IV contrast.",
        steps: [step("CT or MRI of the kidneys, without and with contrast", 0, 2)],
        rationale: [...rationale, "Macroscopic fat + calcification"],
        questions: q,
      });
    if (size !== null && size >= 40)
      return makePlan(f, ACR_RENAL, {
        status: "refer",
        urgency: "soon",
        headline: "This is a benign fatty tumour (angiomyolipoma), but at 4 cm or more it can bleed, so a urologist should see you about preventive treatment.",
        guidelineText: "Angiomyolipoma >= 4 cm: refer for management (potential for clinical symptoms).",
        steps: [step("Urology referral", 0, 2)],
        rationale: [...rationale, `AML ${size} mm >= 40 mm`],
        questions: q,
      });
    if (f.multiplicity === "multiple" || f.stability === "enlarging")
      return makePlan(f, ACR_RENAL, {
        status: "refer",
        headline: "Multiple or growing angiomyolipomas are benign but are usually followed by a urologist.",
        guidelineText: "Multiple AMLs or growth on old studies: refer for management.",
        steps: [step("Urology referral", 0, 3)],
        rationale: [...rationale, "AML multiple or growing"],
        questions: q,
      });
    return makePlan(f, ACR_RENAL, {
      status: "no-follow-up",
      headline: "This is a small benign fatty tumour of the kidney (angiomyolipoma). Under 4 cm with no symptoms, it needs no further work-up.",
      guidelineText: "Solitary angiomyolipoma < 4 cm without symptoms: no further work-up.",
      rationale: [...rationale, "Solitary AML < 40 mm"],
      questions: ["Can you confirm this is an angiomyolipoma that needs no follow-up?"],
    });
  }

  // Explicitly benign or Bosniak I/II
  if (f.bosniak === "I" || f.bosniak === "II" || yes(f.explicitlyBenign) || (f.kind === "cyst" && yes(f.homogeneous) && (f.enhancement === "none" || f.enhancement === "unknown") && !f.bosniak))
    return makePlan(f, ACR_RENAL, {
      status: "no-follow-up",
      headline: "This is a simple (or minimally complex) kidney cyst. These are benign and need no follow-up.",
      guidelineText: "Bosniak I or II cystic mass: benign; no further work-up.",
      rationale: [...rationale, f.bosniak ? `Bosniak ${f.bosniak}` : "Simple cyst described"],
      questions: ["Just to confirm: this is a simple cyst that needs no follow-up?"],
    });

  if (f.bosniak === "IIF")
    return makePlan(f, ACR_RENAL, {
      status: "follow-up",
      headline: "A Bosniak IIF cyst is usually benign but has a few complex features, so the guideline follows it with scans at 6 and 12 months, then yearly for 5 years.",
      guidelineText: "Bosniak IIF: CT or MRI without and with contrast at 6 and 12 months, then yearly for 5 years; refer if morphology changes.",
      steps: IIF_STEPS,
      rationale: [...rationale, "Bosniak IIF"],
      questions: [...q, "Who will order the 6-month and 12-month follow-up scans?"],
    });

  if (f.bosniak === "III" || f.bosniak === "IV")
    return makePlan(f, ACR_RENAL, {
      status: "refer",
      urgency: "prompt",
      headline: `A Bosniak ${f.bosniak} cystic mass has a real chance of being a kidney cancer and should be seen by a urologist.`,
      guidelineText: "Bosniak III or IV: refer for management.",
      steps: [step("Urology referral", 0, 1)],
      rationale: [...rationale, `Bosniak ${f.bosniak}`],
      questions: q,
    });

  // Too small to characterize
  if (yes(f.tooSmallToCharacterize)) {
    if (yes(f.homogeneous) && (f.unenhancedHU === null || f.unenhancedHU === undefined || f.unenhancedHU <= 20 || f.unenhancedHU >= 70))
      return makePlan(f, ACR_RENAL, {
        status: "no-follow-up",
        headline: "This spot is too small to measure precisely but looks like a tiny benign cyst. No further work-up is needed.",
        guidelineText: "Too small to characterize, homogeneous, visually much lower or higher than kidney tissue: likely benign cyst; no further work-up.",
        rationale: [...rationale, "TSTC, homogeneous"],
        questions: ["Can you confirm this tiny kidney spot is a benign cyst?"],
      });
    return makePlan(f, ACR_RENAL, {
      status: "follow-up",
      headline: "This spot is too small to characterise on this scan, so the guideline suggests an MRI (preferred) or CT in 6-12 months to settle it.",
      guidelineText: "Too small to characterize, inconclusive: MRI (preferred) or CT without and with contrast within 6-12 months.",
      steps: [step("MRI (preferred) or CT of the kidneys, without and with contrast", 6, 12)],
      rationale: [...rationale, "TSTC, inconclusive"],
      questions: [...q, "Should the follow-up be an MRI or a CT?"],
    });
  }

  // Non-contrast or contrast-only attenuation rules for homogeneous masses
  if (yes(f.homogeneous) && f.unenhancedHU !== null && f.unenhancedHU !== undefined) {
    const hu = f.unenhancedHU;
    if (hu >= -10 && hu <= 20)
      return makePlan(f, ACR_RENAL, {
        status: "no-follow-up",
        headline: "A uniform kidney lesion with water density is a simple cyst. No follow-up is needed.",
        guidelineText: "Homogeneous, -10 to 20 HU: likely benign cyst; no further work-up.",
        rationale: [...rationale, `Homogeneous ${hu} HU`],
        questions: ["Can you confirm this is a simple cyst?"],
      });
    if (hu >= 70 && ctx.contrast === "without")
      return makePlan(f, ACR_RENAL, {
        status: "no-follow-up",
        headline: "A uniform, dense kidney lesion on a non-contrast scan is a cyst with old blood or protein in it. It is benign and needs no follow-up.",
        guidelineText: "Homogeneous >= 70 HU on unenhanced CT: hemorrhagic or proteinaceous cyst; no further work-up.",
        rationale: [...rationale, `Homogeneous ${hu} HU unenhanced`],
        questions: ["Can you confirm this is a benign hyperdense cyst?"],
      });
    return makePlan(f, ACR_RENAL, {
      status: "further-evaluation",
      urgency: "soon",
      headline: "This kidney lesion couldn't be fully characterised on this scan. The guideline recommends a dedicated CT or MRI without and with contrast.",
      guidelineText: "Homogeneous 21-69 HU unenhanced (or > 20 HU on contrast-only CT): indeterminate; CT or MRI without and with contrast.",
      steps: [step("CT or MRI of the kidneys, without and with contrast", 0, 3)],
      rationale: [...rationale, `Homogeneous ${hu} HU, indeterminate`],
      questions: q,
    });
  }
  if (no(f.homogeneous) && f.enhancement !== "present" && !f.kind.match(/mass/) && size === null)
    return makePlan(f, ACR_RENAL, {
      status: "further-evaluation",
      urgency: "soon",
      headline: "This kidney lesion has mixed features and needs a dedicated CT or MRI without and with contrast to characterise it.",
      guidelineText: "Heterogeneous mass: indeterminate; CT or MRI without and with contrast.",
      steps: [step("CT or MRI of the kidneys, without and with contrast", 0, 3)],
      rationale: [...rationale, "Heterogeneous, not characterised"],
      questions: q,
    });

  // Solid mass pathway (Fig 4)
  if (f.kind === "mass" || f.enhancement === "present" || no(f.homogeneous)) {
    if (size === null)
      return insufficient(f, ACR_RENAL, ["mass size"], ["How big is the kidney mass, and is it solid or cystic?"], rationale);
    if (size < 10)
      return makePlan(f, ACR_RENAL, {
        status: "follow-up",
        headline: "A solid kidney mass under 1 cm is followed rather than treated: a scan at 6-12 months, then yearly for 5 years, to check it is not growing.",
        guidelineText: "Solid mass < 1 cm: follow-up MRI (preferred) or CT without and with contrast beginning at 6-12 months, then yearly for 5 years.",
        steps: [step("MRI (preferred) or CT of the kidneys, without and with contrast", 6, 12), ...IIF_STEPS.slice(2)],
        rationale: [...rationale, `Solid ${size} mm < 10 mm`],
        questions: [...q, "Who will order the 6-12 month follow-up scan?"],
      });
    if (size <= 40)
      return makePlan(f, ACR_RENAL, {
        status: "refer",
        urgency: "prompt",
        headline: "A solid kidney mass of 1-4 cm is treated as a small kidney tumour until proven otherwise. A urologist should see you; a biopsy may be considered.",
        guidelineText: "Solid mass 1.0-4.0 cm: small renal neoplasm; refer for management; consider biopsy.",
        steps: [step("Urology referral", 0, 1)],
        rationale: [...rationale, `Solid ${size} mm, 10-40 mm`],
        questions: q,
      });
    return makePlan(f, ACR_RENAL, {
      status: "refer",
      urgency: "prompt",
      headline: "A solid kidney mass over 4 cm is treated as a kidney tumour and needs a urologist promptly.",
      guidelineText: "Solid mass > 4.0 cm: renal neoplasm; refer for management.",
      steps: [step("Urology referral", 0, 1)],
      rationale: [...rationale, `Solid ${size} mm > 40 mm`],
      questions: q,
    });
  }

  // Cyst described without Bosniak, without features
  if (f.kind === "cyst")
    return insufficient(
      f,
      ACR_RENAL,
      ["Bosniak category or cyst features"],
      ["Is this a simple cyst (Bosniak I or II), or does it have septa, calcification, or a solid part?"],
      rationale,
    );

  return insufficient(f, ACR_RENAL, ["lesion characterisation"], ["Is this kidney lesion a simple cyst, a complex cyst, or a solid mass?"], rationale);
}
