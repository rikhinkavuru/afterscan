/**
 * Fleischner Society 2017 guidelines for incidental pulmonary nodules.
 * MacMahon H, et al. Radiology 2017;284(1):228-243.
 * https://doi.org/10.1148/radiol.2017161659
 *
 * Applies to: adults >= 35, incidental nodules on CT, not lung-cancer
 * screening (Lung-RADS), no known cancer, not immunocompromised.
 */
import type {
  Finding,
  Plan,
  PlanStep,
  PatientInputs,
  ReportContext,
  RiskLevel,
  Guideline,
} from "./types";
import {
  averageDiameterMm,
  insufficient,
  makePlan,
  outOfScope,
  resolve,
  resolveAge,
  step,
  yes,
  radiologistNote,
} from "./shared";

export const FLEISCHNER: Guideline = {
  name: "Fleischner Society 2017",
  citation:
    "MacMahon H, et al. Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images: From the Fleischner Society 2017. Radiology 2017;284:228-243.",
  url: "https://doi.org/10.1148/radiol.2017161659",
};

/**
 * Fleischner leaves the risk category to the clinician ("estimated risk of
 * cancer > 5%"), naming older age, heavy smoking, spiculation, upper-lobe
 * location, and family history as high-risk factors. We only call a patient
 * high risk when something explicit says so, low risk only when a never-smoker
 * has no listed features, and otherwise return both branches.
 */
export function lungRisk(
  f: Finding,
  ctx: ReportContext,
  p: PatientInputs,
): { risk: RiskLevel; why: string } {
  const highFactors: string[] = [];
  if (p.smoking === "current") highFactors.push("current smoker");
  if (yes(f.spiculated)) highFactors.push("spiculated margin");
  if (p.familyHistoryLungCancer) highFactors.push("family history of lung cancer");
  if (resolve(p.emphysema, ctx.emphysema) === true) highFactors.push("emphysema");
  if (highFactors.length)
    return { risk: "high", why: `High-risk factors: ${highFactors.join(", ")}.` };
  const age = resolveAge(ctx, p);
  if (p.smoking === "never" && !yes(f.upperLobe) && (age === null || age < 65))
    return { risk: "low", why: "Never-smoker with no listed high-risk features." };
  if (p.smoking === "never")
    return {
      risk: "unknown",
      why: "Never-smoker, but age or upper-lobe location may raise risk; your doctor decides the category.",
    };
  return {
    risk: "unknown",
    why: "Smoking history not given, so both risk branches are shown; your doctor decides the category.",
  };
}

type Branch = { steps: PlanStep[]; text: string; status: Plan["status"] };

function solidSingle(sz: number, risk: "low" | "high"): Branch {
  if (sz < 6) {
    return risk === "low"
      ? { steps: [], text: "Single solid nodule < 6 mm, low risk: no routine follow-up.", status: "no-follow-up" }
      : {
          steps: [step("CT chest", 12, 12, { optional: true })],
          text: "Single solid nodule < 6 mm, high risk: optional CT at 12 months.",
          status: "follow-up",
        };
  }
  if (sz <= 8) {
    return risk === "low"
      ? {
          steps: [step("CT chest", 6, 12), step("CT chest", 18, 24, { optional: true })],
          text: "Single solid nodule 6-8 mm, low risk: CT at 6-12 months, then consider CT at 18-24 months.",
          status: "follow-up",
        }
      : {
          steps: [step("CT chest", 6, 12), step("CT chest", 18, 24)],
          text: "Single solid nodule 6-8 mm, high risk: CT at 6-12 months, then CT at 18-24 months.",
          status: "follow-up",
        };
  }
  return {
    steps: [step("CT chest, PET/CT, or tissue sampling (your doctor chooses)", 3, 3)],
    text: "Single solid nodule > 8 mm: consider CT at 3 months, PET/CT, or tissue sampling.",
    status: "further-evaluation",
  };
}

function solidMultiple(sz: number, risk: "low" | "high"): Branch {
  if (sz < 6) {
    return risk === "low"
      ? { steps: [], text: "Multiple solid nodules < 6 mm, low risk: no routine follow-up.", status: "no-follow-up" }
      : {
          steps: [step("CT chest", 12, 12, { optional: true })],
          text: "Multiple solid nodules < 6 mm, high risk: optional CT at 12 months.",
          status: "follow-up",
        };
  }
  // 6-8 mm and > 8 mm share the same multiple-nodule rows.
  return risk === "low"
    ? {
        steps: [step("CT chest", 3, 6), step("CT chest", 18, 24, { optional: true })],
        text: `Multiple solid nodules ${sz <= 8 ? "6-8 mm" : "> 8 mm"}, low risk: CT at 3-6 months, then consider CT at 18-24 months.`,
        status: "follow-up",
      }
    : {
        steps: [step("CT chest", 3, 6), step("CT chest", 18, 24)],
        text: `Multiple solid nodules ${sz <= 8 ? "6-8 mm" : "> 8 mm"}, high risk: CT at 3-6 months, then CT at 18-24 months.`,
        status: "follow-up",
      };
}

function groundGlassSingle(sz: number): Branch {
  if (sz < 6)
    return { steps: [], text: "Single ground-glass nodule < 6 mm: no routine follow-up.", status: "no-follow-up" };
  return {
    steps: [
      step("CT chest", 6, 12, { condition: "to confirm the nodule is still there" }),
      step("CT chest", 24, 24, { condition: "if it persists" }),
      step("CT chest", 48, 48, { condition: "if it persists" }),
      step("CT chest", 60, 60, { condition: "if it persists" }),
    ],
    text: "Single ground-glass nodule >= 6 mm: CT at 6-12 months to confirm persistence, then CT every 2 years until 5 years.",
    status: "follow-up",
  };
}

function partSolidSingle(sz: number, solidMm: number | null): Branch {
  if (sz < 6)
    return { steps: [], text: "Single part-solid nodule < 6 mm: no routine follow-up.", status: "no-follow-up" };
  if (solidMm !== null && solidMm >= 6)
    return {
      steps: [step("Further evaluation (PET/CT or tissue sampling; your doctor chooses)", 0, 3)],
      text: "Persistent part-solid nodule with a solid component >= 6 mm is considered highly suspicious and warrants further evaluation.",
      status: "further-evaluation",
    };
  return {
    steps: [
      step("CT chest", 3, 6, { condition: "to confirm the nodule is still there" }),
      step("CT chest", 12, 12, { condition: "annually if it persists and the solid part stays < 6 mm" }),
      step("CT chest", 24, 24, { condition: "annually if it persists" }),
      step("CT chest", 36, 36, { condition: "annually if it persists" }),
      step("CT chest", 48, 48, { condition: "annually if it persists" }),
      step("CT chest", 60, 60, { condition: "annually if it persists" }),
    ],
    text: "Single part-solid nodule >= 6 mm: CT at 3-6 months to confirm persistence; if unchanged and the solid component remains < 6 mm, annual CT for 5 years.",
    status: "follow-up",
  };
}

function subsolidMultiple(sz: number, risk: RiskLevel): Branch {
  if (sz < 6)
    return {
      steps: [
        step("CT chest", 3, 6),
        ...(risk === "low"
          ? []
          : [
              step("CT chest", 24, 24, { optional: true, condition: "if stable (high-risk patients)" }),
              step("CT chest", 48, 48, { optional: true, condition: "if stable (high-risk patients)" }),
            ]),
      ],
      text: "Multiple subsolid nodules < 6 mm: CT at 3-6 months; if stable, consider CT at 2 and 4 years in high-risk patients.",
      status: "follow-up",
    };
  return {
    steps: [step("CT chest", 3, 6, { condition: "then management follows the most suspicious nodule" })],
    text: "Multiple subsolid nodules >= 6 mm: CT at 3-6 months; subsequent management based on the most suspicious nodule(s).",
    status: "follow-up",
  };
}

export function planLung(f: Finding, ctx: ReportContext, p: PatientInputs): Plan {
  const rationale: string[] = [];
  const age = resolveAge(ctx, p);
  const knownCancer = resolve(p.knownCancer, ctx.knownCancer);
  const immuno = resolve(p.immunocompromised, ctx.immunocompromised);

  // ---- scope gates (Fleischner exclusion criteria) ----
  if (yes(ctx.screeningExam))
    return outOfScope(
      f,
      FLEISCHNER,
      "This looks like a lung cancer screening scan. Screening nodules are managed with Lung-RADS, not these rules.",
      ["Which Lung-RADS category did this scan get, and when is my next screening CT?"],
      rationale,
    );
  if (knownCancer === true)
    return outOfScope(
      f,
      FLEISCHNER,
      "These rules are for people without a known cancer. With a cancer history, your oncology team decides how to handle a new lung nodule.",
      ["Could this nodule be related to my cancer, and what imaging do you want next?"],
      rationale,
    );
  if (immuno === true)
    return outOfScope(
      f,
      FLEISCHNER,
      "These rules don't apply to people with a weakened immune system, where a nodule is more often infection.",
      ["Given my immune status, how should this nodule be followed?"],
      rationale,
    );
  if (age !== null && age < 35)
    return outOfScope(
      f,
      FLEISCHNER,
      "The Fleischner rules are written for adults 35 and older. Under 35, lung cancer is rare and your doctor individualises follow-up.",
      ["Does this nodule need any follow-up at my age?"],
      rationale,
    );
  if (f.incidental === false)
    return outOfScope(
      f,
      FLEISCHNER,
      "This nodule seems to be the reason for the scan rather than an incidental finding, so the incidental-nodule rules don't apply.",
      [],
      rationale,
    );

  // ---- benign patterns that end follow-up ----
  if (yes(f.benignCalcification) || (yes(f.calcified) && f.stability === "stable"))
    return makePlan(f, FLEISCHNER, {
      status: "no-follow-up",
      urgency: "none",
      headline: "A calcified nodule like this is almost always an old, healed scar (granuloma). No follow-up is needed.",
      guidelineText:
        "Nodules with a benign pattern of calcification are considered benign and do not require follow-up.",
      rationale: [...rationale, "Benign calcification pattern / stable calcified nodule"],
      questions: ["Just to confirm: this calcified nodule is benign and needs no follow-up?"],
    });
  if (yes(f.perifissural) && f.attenuation !== "ground-glass" && f.attenuation !== "part-solid")
    return makePlan(f, FLEISCHNER, {
      status: "no-follow-up",
      urgency: "none",
      headline: "A typical perifissural nodule is a tiny lymph node, which is benign. No follow-up is needed.",
      guidelineText:
        "Perifissural nodules with characteristic morphology do not require follow-up, even when larger than 6 mm.",
      rationale: [...rationale, "Typical perifissural nodule"],
      questions: ["Is this a typical perifissural (lymph-node) nodule that needs no follow-up?"],
    });
  if (f.stability === "stable" && (f.stableMonths ?? 0) >= 24 && (f.attenuation === "solid" || f.attenuation === "unknown"))
    return makePlan(f, FLEISCHNER, {
      status: "no-follow-up",
      urgency: "none",
      headline: "A solid nodule that hasn't changed in 2 years or more is considered benign. No further follow-up is needed.",
      guidelineText: "A solid nodule stable for 2 years is generally regarded as benign.",
      rationale: [...rationale, `Solid nodule stable ${f.stableMonths} months`],
      questions: ["This nodule has been stable for over two years; does that mean we can stop following it?"],
    });

  // ---- modality gate (after the benign endings: a calcified granuloma is benign on any modality) ----
  if (ctx.modality === "XR")
    return outOfScope(
      f,
      FLEISCHNER,
      "This is an X-ray. The Fleischner rules need a CT, which measures nodules precisely. A non-calcified nodule seen on X-ray is usually clarified with a CT.",
      ["Do I need a CT scan to look at this nodule more closely?"],
      rationale,
    );

  // ---- size ----
  const sz = averageDiameterMm(f);
  if (sz === null)
    return insufficient(
      f,
      FLEISCHNER,
      ["nodule size in mm"],
      ["How big is the nodule in millimetres, and is it solid or ground-glass?"],
      rationale,
    );
  rationale.push(`Average diameter ${sz} mm (Fleischner: mean of long and short axis, rounded)`);

  const attenuation = f.attenuation === "unknown" || !f.attenuation ? "solid" : f.attenuation;
  if (!f.attenuation || f.attenuation === "unknown")
    rationale.push("Attenuation not stated; a nodule described without qualifier is treated as solid");
  const multiple = f.multiplicity === "multiple";
  rationale.push(multiple ? "Multiple nodules" : "Single nodule");

  const { risk, why } = lungRisk(f, ctx, p);
  rationale.push(why);

  const questions = [
    ...radiologistNote(f),
    "Which risk category do you consider me, low or high, for this nodule?",
    "When should my next scan be, and who will order it?",
  ];

  const headlineFor = (b: Branch) =>
    b.status === "no-follow-up"
      ? "The guideline says no routine follow-up is needed for a nodule like this."
      : b.status === "further-evaluation"
        ? "A nodule this size needs a closer look soon rather than a long wait."
        : "The guideline recommends a follow-up CT to make sure this nodule is not changing.";

  if (attenuation === "solid") {
    const branchFor = (r: "low" | "high") => (multiple ? solidMultiple(sz, r) : solidSingle(sz, r));
    if (risk === "unknown") {
      const low = branchFor("low");
      const high = branchFor("high");
      const worst = high.status === "no-follow-up" ? low : high;
      return makePlan(f, FLEISCHNER, {
        status: worst.status,
        headline: headlineFor(worst) + " The exact schedule depends on your risk category, so both are shown.",
        guidelineText: `${low.text} ${high.text}`,
        steps: high.steps,
        branches: [
          { label: "If low risk", risk: "low", steps: low.steps, guidelineText: low.text },
          { label: "If high risk", risk: "high", steps: high.steps, guidelineText: high.text },
        ],
        rationale: [...rationale, "Risk unknown: both branches returned, schedule shows the high-risk branch"],
        questions,
      });
    }
    const b = branchFor(risk);
    return makePlan(f, FLEISCHNER, {
      status: b.status,
      headline: headlineFor(b),
      guidelineText: b.text,
      steps: b.steps,
      rationale: [...rationale, `Branch: solid, ${multiple ? "multiple" : "single"}, ${risk} risk, ${sz} mm`],
      questions,
    });
  }

  // subsolid
  const b = multiple
    ? subsolidMultiple(sz, risk)
    : attenuation === "ground-glass"
      ? groundGlassSingle(sz)
      : partSolidSingle(sz, f.solidComponentMm ?? null);
  return makePlan(f, FLEISCHNER, {
    status: b.status,
    headline:
      b.status === "no-follow-up"
        ? "The guideline says no routine follow-up is needed for a subsolid nodule this small."
        : b.status === "further-evaluation"
          ? "This nodule has features the guideline treats as suspicious, so it needs a closer look."
          : "Subsolid nodules grow slowly, so the guideline asks for a confirming CT and then spaced-out checks over 5 years.",
    guidelineText: b.text,
    steps: b.steps,
    rationale: [...rationale, `Branch: ${attenuation}, ${multiple ? "multiple" : "single"}, ${sz} mm`],
    questions: [
      ...radiologistNote(f),
      "Is this ground-glass or part-solid, and how big is the solid part?",
      "When should the confirming CT be, and who will order it?",
    ],
  });
}
