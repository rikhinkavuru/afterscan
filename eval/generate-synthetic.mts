/**
 * Deterministic synthetic report generator with ground truth.
 *
 * Every case carries the structured truth for each finding and the patient
 * context. Expected plan status is derived by running the engine on the truth,
 * so "plan agreement" measures the extractor's downstream effect only.
 */
import fs from "node:fs";
import path from "node:path";
import { planFinding } from "../src/lib/engine/index.ts";
import type { Finding, PatientInputs, ReportContext } from "../src/lib/engine/types.ts";

// ---- seeded RNG ----
let seed = 20261014;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;

export interface TruthFinding extends Partial<Finding> {
  organ: Finding["organ"];
  kind: Finding["kind"];
  sizeMm: number | null;
}
export interface SynthCase {
  id: string;
  family: string;
  report: string;
  patient: PatientInputs;
  truth: TruthFinding[];
  /** Expected plan status per truth finding, from the engine. */
  expected: { status: string; firstStepMonths: number | null }[];
  /** True when the report must yield zero findings. */
  negative: boolean;
  ctxHints: Partial<ReportContext>;
}

const fmtSize = (mm: number): string => {
  const style = pick(["mm", "cm", "cm2"]);
  if (style === "mm" || mm < 10) return `${mm} mm`;
  if (style === "cm") return `${(mm / 10).toFixed(1)} cm`;
  return `${(mm / 10).toFixed(1)} x ${((mm - 1) / 10).toFixed(1)} cm`;
};
const lobe = () => pick(["right upper lobe", "right middle lobe", "right lower lobe", "left upper lobe", "lingula", "left lower lobe"]);
const series = () => (chance(0.6) ? ` (series ${pick([2, 3, 4, 5])}, image ${Math.floor(20 + rnd() * 120)})` : "");

const header = (exam: string, indication: string, age: number, sex: string, comparison = "None.") =>
  `${exam}\n\n${pick(["CLINICAL INDICATION", "INDICATION", "HISTORY", "REASON FOR EXAM"])}: ${age}-year-old ${sex}. ${indication}\n\n${pick(["COMPARISON", "PRIOR STUDIES"])}: ${comparison}\n\nFINDINGS:\n`;

const DISTRACTORS = [
  "No pleural effusion or pneumothorax.",
  "Mild dependent atelectasis at the lung bases.",
  "No focal hepatic lesion.",
  "The gallbladder is unremarkable. No biliary ductal dilatation.",
  "Adrenal glands are normal.",
  "No hydronephrosis.",
  "Sigmoid diverticulosis without evidence of diverticulitis.",
  "Degenerative changes of the lumbar spine.",
  "No lymphadenopathy.",
  "Heart size is normal. Coronary artery calcifications.",
  "The pancreas is unremarkable.",
  "No free fluid or free air.",
  "Spleen is normal in size.",
  "No suspicious osseous lesion.",
];
const filler = (n: number) => Array.from({ length: n }, () => pick(DISTRACTORS)).filter((v, i, a) => a.indexOf(v) === i).join(" ");

const cases: SynthCase[] = [];
let n = 0;
const push = (c: Omit<SynthCase, "expected" | "id">) => {
  n++;
  const ctx: ReportContext = {
    modality: "CT", bodyRegion: null, contrast: "unknown", examReason: null, patientAgeYears: c.patient.ageYears ?? null, patientSex: "unknown",
    knownCancer: null, screeningExam: null, immunocompromised: null, cirrhosisOrHepaticRisk: null, emphysema: null, priorComparisonAvailable: null, reportDate: null,
    ...c.ctxHints,
  };
  const expected = c.truth.map((t, i) => {
    const f: Finding = {
      id: `t${i}`, description: "", sourceQuote: "", multiplicity: "single", incidental: true, stability: "unknown", confidence: 1,
      attenuation: "unknown", enhancement: "unknown", mainDuctCommunication: "unknown", ...t,
    } as Finding;
    const p = planFinding(f, ctx, c.patient);
    return { status: p.status, firstStepMonths: p.steps[0]?.monthsFrom ?? null };
  });
  cases.push({ id: `syn-${String(n).padStart(3, "0")}`, ...c, expected });
};

// ---------- LUNG (Fleischner) ----------
for (let i = 0; i < 26; i++) {
  const age = 36 + Math.floor(rnd() * 45);
  const sex = pick(["male", "female"]);
  const smoking = pick(["never", "former", "current", "unknown"] as const);
  const att = pick(["solid", "solid", "solid", "ground-glass", "part-solid"] as const);
  const size = pick([3, 4, 5, 6, 7, 8, 9, 11, 14]);
  const multiple = chance(0.25);
  const solidComp = att === "part-solid" ? pick([3, 4, 7]) : null;
  const attWord = att === "solid" ? pick(["solid", ""]) : att === "ground-glass" ? pick(["ground-glass", "ground glass", "pure ground-glass"]) : pick(["part-solid", "subsolid"]);
  const rec = chance(0.5);
  const where = lobe();
  const noduleSentence = multiple
    ? `There are multiple ${attWord} pulmonary nodules, the largest measuring ${fmtSize(size)} in the ${where}${series()}.`
    : `There is a ${fmtSize(size)} ${attWord} ${pick(["pulmonary nodule", "nodule"])} in the ${where}${series()}.`;
  const compSentence = att === "part-solid" ? ` The solid component measures ${solidComp} mm.` : "";
  const exam = pick(["CT ABDOMEN AND PELVIS WITH CONTRAST", "CT CHEST WITHOUT CONTRAST", "CT ABDOMEN WITHOUT CONTRAST"]);
  const indication = pick(["Right lower quadrant pain.", "Evaluate for pulmonary embolism.", "Flank pain, rule out stone.", "Abdominal pain.", "Shortness of breath."]);
  const report =
    header(exam, indication, age, sex) +
    `${exam.includes("CHEST") ? "Lungs" : "Lung bases"}: ${noduleSentence}${compSentence} ${pick(["No other pulmonary nodules.", "Otherwise clear lungs.", "No consolidation."])}\n` +
    `${filler(3)}\n\nIMPRESSION:\n1. ${pick(["No acute abnormality.", "Findings as above."])}\n2. ${multiple ? "Multiple" : ""} ${fmtSize(size)} ${attWord} ${where} ${multiple ? "nodules" : "nodule"}.${rec ? ` ${pick(["Recommend follow-up chest CT in 6-12 months per Fleischner Society guidelines.", "Follow-up CT chest in 3-6 months is suggested.", "Non-emergent CT chest follow-up recommended."])}` : ""}`;
  push({
    family: "lung",
    report,
    patient: { ageYears: age, smoking, knownCancer: false },
    truth: [{ organ: "lung", kind: "nodule", sizeMm: size, attenuation: att, multiplicity: multiple ? "multiple" : "single", solidComponentMm: solidComp, upperLobe: where.includes("upper") ? true : null }],
    negative: false,
    ctxHints: { modality: "CT", knownCancer: false },
  });
}
// lung: benign calcified granuloma, stable
for (let i = 0; i < 6; i++) {
  const age = 45 + Math.floor(rnd() * 35);
  const size = pick([3, 4, 5, 6, 8]);
  const report =
    header("CT CHEST WITHOUT CONTRAST", "Chronic cough.", age, pick(["male", "female"]), `CT chest ${pick(["2019", "2021", "2022"])}.`) +
    `Lungs: ${pick([`A ${size} mm calcified granuloma in the ${lobe()} is unchanged.`, `Stable ${size} mm densely calcified nodule in the ${lobe()}, consistent with a granuloma.`, `${size} mm calcified ${lobe()} nodule, unchanged from prior, benign.`])} No new or enlarging nodules. ${filler(2)}\n\nIMPRESSION:\nStable calcified granuloma. No follow-up required.`;
  push({ family: "lung-benign", report, patient: { ageYears: age, smoking: pick(["former", "current"]) }, truth: [{ organ: "lung", kind: "nodule", sizeMm: size, calcified: true, benignCalcification: true, explicitlyBenign: true, stability: "stable" }], negative: false, ctxHints: { modality: "CT" } });
}
// lung: screening (out of scope)
for (let i = 0; i < 4; i++) {
  const age = 55 + Math.floor(rnd() * 20);
  const size = pick([5, 7, 9]);
  const report = `LOW-DOSE CT CHEST, LUNG CANCER SCREENING\n\nINDICATION: Annual lung cancer screening. ${age}-year-old, ${pick(["current", "former"])} smoker, ${30 + Math.floor(rnd() * 30)} pack-years.\n\nCOMPARISON: Prior screening CT.\n\nFINDINGS: ${size} mm solid nodule in the ${lobe()}, ${pick(["new", "unchanged"])}. ${filler(2)}\n\nIMPRESSION: Lung-RADS ${pick(["2", "3", "4A"])}. ${pick(["Continue annual screening.", "6-month LDCT recommended.", "3-month LDCT recommended."])}`;
  push({ family: "lung-screening", report, patient: { ageYears: age, smoking: "current" }, truth: [{ organ: "lung", kind: "nodule", sizeMm: size, attenuation: "solid" }], negative: false, ctxHints: { modality: "CT", screeningExam: true } });
}
// lung: known cancer (out of scope)
for (let i = 0; i < 3; i++) {
  const age = 50 + Math.floor(rnd() * 30);
  const size = pick([6, 8, 12]);
  const report = header("CT CHEST WITH CONTRAST", `History of ${pick(["colon cancer", "melanoma", "breast carcinoma"])}, restaging.`, age, pick(["male", "female"]), "CT 6 months ago.") + `Lungs: New ${size} mm solid nodule in the ${lobe()}. ${filler(2)}\n\nIMPRESSION: New ${size} mm pulmonary nodule, concerning for metastasis in this patient with known malignancy.`;
  push({ family: "lung-cancer-hx", report, patient: { ageYears: age }, truth: [{ organ: "lung", kind: "nodule", sizeMm: size, attenuation: "solid", stability: "new" }], negative: false, ctxHints: { modality: "CT", knownCancer: true } });
}

// ---------- ADRENAL ----------
for (let i = 0; i < 14; i++) {
  const age = 40 + Math.floor(rnd() * 40);
  const size = pick([8, 12, 15, 18, 22, 28, 35, 45]);
  const hu = pick([null, null, 4, 8, 15, 25, 35]);
  const contrast = pick(["with", "without"] as const);
  const side = pick(["left", "right"]);
  const stable = chance(0.2);
  const huText = hu === null ? "" : contrast === "without" ? ` measuring ${hu} HU` : ` measuring ${hu + 30} HU on this contrast-enhanced study`;
  const report =
    header(`CT ABDOMEN AND PELVIS ${contrast === "with" ? "WITH" : "WITHOUT"} CONTRAST`, pick(["Abdominal pain.", "Flank pain.", "Trauma."]), age, pick(["male", "female"]), stable ? "CT 2 years ago." : "None.") +
    `Adrenals: ${fmtSize(size)} ${pick(["nodule", "well-circumscribed nodule", "mass"])} in the ${side} adrenal gland${huText}${stable ? ", unchanged from the prior examination" : ""}. ${filler(3)}\n\nIMPRESSION:\n${fmtSize(size)} ${side} adrenal ${hu !== null && hu <= 10 && contrast === "without" ? "nodule with imaging features of a lipid-rich adenoma." : stable ? "nodule, stable for 2 years, benign." : "nodule, indeterminate."}${!stable && (hu === null || hu > 10) ? " Dedicated adrenal protocol CT could be performed for further characterization." : ""}`;
  const unenhancedHU = contrast === "without" ? hu : null;
  push({
    family: "adrenal",
    report,
    patient: { ageYears: age, knownCancer: false },
    truth: [{ organ: "adrenal", kind: "nodule", sizeMm: size, unenhancedHU, stability: stable ? "stable" : "unknown", stableMonths: stable ? 24 : null, explicitlyBenign: stable || (unenhancedHU !== null && unenhancedHU <= 10) ? true : null }],
    negative: false,
    ctxHints: { modality: "CT", contrast, knownCancer: false },
  });
}

// ---------- KIDNEY ----------
for (let i = 0; i < 16; i++) {
  const age = 35 + Math.floor(rnd() * 45);
  const kind = pick(["simple", "simple", "IIF", "III", "solid-small", "solid", "tstc"]);
  const size = kind === "solid-small" ? pick([6, 8, 9]) : kind === "tstc" ? pick([4, 5]) : pick([12, 18, 24, 31, 45]);
  const side = pick(["left", "right"]);
  let sentence: string;
  let truth: TruthFinding;
  if (kind === "simple") {
    sentence = pick([`A ${fmtSize(size)} simple cyst arises from the ${pick(["upper", "lower"])} pole of the ${side} kidney.`, `${fmtSize(size)} ${side} renal cyst with water attenuation and imperceptible wall, Bosniak I.`]);
    truth = { organ: "kidney", kind: "cyst", sizeMm: size, bosniak: "I", explicitlyBenign: true };
  } else if (kind === "IIF") {
    sentence = `A ${fmtSize(size)} complex cyst in the ${side} kidney contains multiple thin septa with minimal wall thickening, Bosniak IIF.`;
    truth = { organ: "kidney", kind: "cyst", sizeMm: size, bosniak: "IIF" };
  } else if (kind === "III") {
    sentence = `A ${fmtSize(size)} cystic lesion in the ${side} kidney demonstrates thickened irregular enhancing septa, Bosniak III.`;
    truth = { organ: "kidney", kind: "cyst", sizeMm: size, bosniak: "III" };
  } else if (kind === "tstc") {
    sentence = `A ${size} mm hypodensity in the ${side} kidney is too small to characterize, statistically likely a cyst.`;
    truth = { organ: "kidney", kind: "lesion", sizeMm: size, tooSmallToCharacterize: true, homogeneous: true };
  } else {
    sentence = `A ${fmtSize(size)} enhancing solid mass arises from the ${side} kidney.`;
    truth = { organ: "kidney", kind: "mass", sizeMm: size, enhancement: "present" };
  }
  const report = header("CT ABDOMEN AND PELVIS WITH CONTRAST", pick(["Abdominal pain.", "Hematuria work-up declined; evaluate for appendicitis.", "Trauma."]), age, pick(["male", "female"])) + `Kidneys: ${sentence} ${filler(3)}\n\nIMPRESSION:\n${kind === "simple" ? "Simple renal cyst, no follow-up needed." : kind === "solid" || kind === "III" ? "Renal lesion, urology referral recommended." : kind === "IIF" ? "Bosniak IIF cyst; follow-up imaging recommended." : "Findings as above."}`;
  push({ family: `kidney-${kind}`, report, patient: { ageYears: age, knownCancer: false }, truth: [truth], negative: false, ctxHints: { modality: "CT", contrast: "with", knownCancer: false } });
}

// ---------- LIVER ----------
for (let i = 0; i < 12; i++) {
  const age = 35 + Math.floor(rnd() * 45);
  const kind = pick(["cyst", "tstc", "hemangioma", "indeterminate", "indeterminate-large"]);
  const size = kind === "tstc" ? pick([5, 7, 9]) : kind === "indeterminate" ? pick([11, 13, 15]) : kind === "indeterminate-large" ? pick([18, 22, 30]) : pick([8, 14, 25]);
  const seg = pick(["segment 2", "segment 4", "segment 6", "segment 7", "the right hepatic lobe"]);
  let sentence: string;
  let truth: TruthFinding;
  if (kind === "cyst") { sentence = `A ${fmtSize(size)} simple hepatic cyst in ${seg}.`; truth = { organ: "liver", kind: "cyst", sizeMm: size, explicitlyBenign: true }; }
  else if (kind === "tstc") { sentence = `A ${size} mm hypodense lesion in ${seg} is too small to characterize.`; truth = { organ: "liver", kind: "lesion", sizeMm: size, tooSmallToCharacterize: true }; }
  else if (kind === "hemangioma") { sentence = `A ${fmtSize(size)} lesion in ${seg} shows peripheral nodular enhancement with progressive fill-in, typical of a hemangioma.`; truth = { organ: "liver", kind: "lesion", sizeMm: size, explicitlyBenign: true }; }
  else { sentence = `A ${fmtSize(size)} ill-defined hypodense lesion in ${seg} is indeterminate.`; truth = { organ: "liver", kind: "lesion", sizeMm: size, suspiciousFeatures: true }; }
  const cirr = chance(0.2);
  const report = header("CT ABDOMEN AND PELVIS WITH CONTRAST", pick(["Abdominal pain.", "Rule out appendicitis.", "Nausea."]), age, pick(["male", "female"])) + `Liver: ${cirr ? "Nodular hepatic contour consistent with cirrhosis. " : ""}${sentence} ${filler(3)}\n\nIMPRESSION:\n${kind === "indeterminate" || kind === "indeterminate-large" ? "Indeterminate hepatic lesion; MRI recommended for further characterization." : "Benign-appearing hepatic lesion."}`;
  push({ family: `liver-${kind}`, report, patient: { ageYears: age, knownCancer: false, cirrhosisOrHepaticRisk: cirr }, truth: [truth], negative: false, ctxHints: { modality: "CT", contrast: "with", knownCancer: false, cirrhosisOrHepaticRisk: cirr } });
}

// ---------- PANCREAS ----------
for (let i = 0; i < 12; i++) {
  const age = 40 + Math.floor(rnd() * 45);
  const size = pick([6, 9, 12, 14, 17, 21, 24, 28, 35]);
  const worrisome = chance(0.2);
  const duct = pick(["yes", "no", "unknown"] as const);
  const loc = pick(["head", "body", "tail", "uncinate process"]);
  const ductText = duct === "yes" ? " which appears to communicate with the main pancreatic duct" : duct === "no" ? ", without communication with the main pancreatic duct" : "";
  const worrisomeText = worrisome ? ` There is an enhancing mural nodule within the cyst and the main pancreatic duct measures ${pick([8, 9])} mm.` : " No mural nodule or wall thickening. The main pancreatic duct is normal in caliber.";
  const report = header("MRI ABDOMEN WITH AND WITHOUT CONTRAST", pick(["Abdominal pain.", "Follow-up of renal cyst.", "Elevated liver enzymes."]), age, pick(["male", "female"])) + `Pancreas: A ${fmtSize(size)} unilocular cystic lesion in the pancreatic ${loc}${ductText}.${worrisomeText} ${filler(2)}\n\nIMPRESSION:\n${fmtSize(size)} pancreatic ${loc} cyst${worrisome ? " with worrisome features; EUS recommended." : ", likely side-branch IPMN."}`;
  push({ family: "pancreas", report, patient: { ageYears: age, knownCancer: false }, truth: [{ organ: "pancreas", kind: "cyst", sizeMm: size, mainDuctCommunication: duct, worrisomeFeatures: worrisome ? true : false }], negative: false, ctxHints: { modality: "MRI", contrast: "both", knownCancer: false } });
}

// ---------- THYROID ----------
for (let i = 0; i < 8; i++) {
  const age = 25 + Math.floor(rnd() * 55);
  const size = pick([6, 9, 11, 14, 16, 22]);
  const side = pick(["left", "right"]);
  const report = header(pick(["CT CERVICAL SPINE WITHOUT CONTRAST", "CT NECK WITH CONTRAST", "CT CHEST WITH CONTRAST"]), pick(["Neck pain after fall.", "Dysphagia.", "Chest pain."]), age, pick(["male", "female"])) + `Thyroid: Incidental ${fmtSize(size)} hypodense nodule in the ${side} thyroid lobe. No cervical lymphadenopathy. ${filler(2)}\n\nIMPRESSION:\nIncidental ${side} thyroid nodule.${size >= 15 ? " Thyroid ultrasound could be considered." : ""}`;
  push({ family: "thyroid", report, patient: { ageYears: age }, truth: [{ organ: "thyroid", kind: "nodule", sizeMm: size }], negative: false, ctxHints: { modality: "CT" } });
}

// ---------- MULTI-FINDING ----------
for (let i = 0; i < 8; i++) {
  const age = 45 + Math.floor(rnd() * 35);
  const lungSize = pick([4, 6, 7, 9]);
  const cystSize = pick([15, 22, 30]);
  const adr = chance(0.5);
  const adrSize = pick([12, 18, 25]);
  const report = header("CT ABDOMEN AND PELVIS WITHOUT CONTRAST", "Flank pain, evaluate for stone.", age, pick(["male", "female"])) +
    `Lung bases: ${lungSize} mm solid nodule in the ${lobe()}. No effusion.\nLiver: No focal lesion.\nAdrenals: ${adr ? `${fmtSize(adrSize)} left adrenal nodule measuring ${pick([5, 20])} HU.` : "Normal."}\nKidneys: ${fmtSize(cystSize)} simple cyst in the ${pick(["left", "right"])} kidney. No calculus or hydronephrosis.\n${filler(2)}\n\nIMPRESSION:\n1. No urolithiasis.\n2. ${lungSize} mm pulmonary nodule.\n3. Simple renal cyst.${adr ? `\n4. ${fmtSize(adrSize)} adrenal nodule.` : ""}`;
  const truth: TruthFinding[] = [
    { organ: "lung", kind: "nodule", sizeMm: lungSize, attenuation: "solid" },
    { organ: "kidney", kind: "cyst", sizeMm: cystSize, bosniak: "I", explicitlyBenign: true },
  ];
  if (adr) truth.push({ organ: "adrenal", kind: "nodule", sizeMm: adrSize, unenhancedHU: report.includes("5 HU") ? 5 : 20 });
  push({ family: "multi", report, patient: { ageYears: age, smoking: pick(["never", "current"]), knownCancer: false }, truth, negative: false, ctxHints: { modality: "CT", contrast: "without", knownCancer: false } });
}

// ---------- NEGATIVES ----------
const NEG = [
  (age: number) => header("CT CHEST WITH CONTRAST", "Chest pain.", age, "female") + "Lungs: No pulmonary nodules or masses. No consolidation. " + filler(3) + "\n\nIMPRESSION: No acute cardiopulmonary abnormality.",
  (age: number) => header("CT ABDOMEN AND PELVIS WITH CONTRAST", "Abdominal pain.", age, "male") + "Liver: No focal hepatic lesion. Pancreas: Unremarkable, no cystic lesion. Adrenals: Normal. Kidneys: No renal mass or cyst. " + filler(3) + "\n\nIMPRESSION: Normal examination.",
  (age: number) => `CHEST RADIOGRAPH, PA AND LATERAL\n\nINDICATION: ${age}-year-old. Cough.\n\nFINDINGS: The lungs are clear. There is no nodule, mass, or infiltrate. Heart size normal. No effusion.\n\nIMPRESSION: Normal chest.`,
  (age: number) => header("CT ABDOMEN WITHOUT CONTRAST", "Flank pain.", age, "female") + "Lung bases: Clear, without nodule. Kidneys: 4 mm nonobstructing stone in the left lower pole; no mass. Adrenals: No nodule. " + filler(3) + "\n\nIMPRESSION: Nephrolithiasis without obstruction.",
  (age: number) => header("MRI BRAIN WITH AND WITHOUT CONTRAST", "Headache.", age, "male") + "No intracranial mass, hemorrhage, or infarct. Ventricles are normal. Mild mucosal thickening of the maxillary sinuses.\n\nIMPRESSION: Normal MRI of the brain.",
  (age: number) => header("CT CHEST WITHOUT CONTRAST", "Shortness of breath.", age, "male", "CT 2020.") + "Lungs: Centrilobular emphysema. No nodules, masses, or interstitial lung disease. Previously noted 4 mm right upper lobe nodule has resolved. " + filler(2) + "\n\nIMPRESSION: Emphysema. No pulmonary nodules.",
];
for (let i = 0; i < 12; i++) {
  const age = 30 + Math.floor(rnd() * 50);
  push({ family: "negative", report: NEG[i % NEG.length](age), patient: { ageYears: age }, truth: [], negative: true, ctxHints: {} });
}

// ---------- NOT A REPORT ----------
push({ family: "not-report", report: "Preheat the oven to 220C. Toss the potatoes in olive oil, salt, and rosemary, then roast for 35 minutes until golden, turning once halfway through.", patient: {}, truth: [], negative: true, ctxHints: {} });
push({ family: "not-report", report: "CBC: WBC 6.2, Hgb 13.9, Plt 240. BMP: Na 139, K 4.1, Cr 0.9. Lipids: LDL 131. Note: patient reports no new symptoms; continue current medications and recheck in 6 months.", patient: {}, truth: [], negative: true, ctxHints: {} });

const out = path.join(import.meta.dirname, "data", "synthetic.json");
fs.writeFileSync(out, JSON.stringify(cases, null, 1));
const fam = cases.reduce<Record<string, number>>((a, c) => ((a[c.family] = (a[c.family] ?? 0) + 1), a), {});
console.log(`${cases.length} cases ->`, out);
console.log(fam);
