/**
 * Wire schema for the extractor. Anthropic strict structured outputs allow at
 * most 16 union-typed (nullable / anyOf) fields per schema, so this schema
 * uses no unions at all: "unknown" enum values and -1 numeric sentinels stand
 * in for null. `toFinding` / `toContext` map it onto the engine's types.
 */
import { z } from "zod";
import type { Finding, ReportContext, Tri } from "@/lib/engine/types";

const yn = z.enum(["yes", "no", "unknown"]);
const num = (desc: string) => z.number().describe(`${desc} Use -1 if not stated.`);
const str = (desc: string) => z.string().describe(`${desc} Use an empty string if none.`);

export const FindingWire = z.object({
  organ: z.enum(["lung", "adrenal", "kidney", "liver", "pancreas", "thyroid", "other"]),
  organLabel: str("Organ name when organ is 'other' (e.g. 'ovary', 'bone', 'lymph node')."),
  kind: z.enum(["nodule", "mass", "cyst", "lesion", "other"]),
  description: z.string().describe("One line in the report's own words, e.g. '7 mm solid nodule, right lower lobe'."),
  sourceQuote: z.string().describe("Exact, contiguous, verbatim substring of the report describing this finding. Copy characters exactly; never paraphrase."),
  sizeMm: num("Largest reported dimension in millimetres (convert cm to mm)."),
  sizeShortMm: num("Second, shorter dimension in mm when two are given."),
  multiplicity: z.enum(["single", "multiple", "unknown"]),
  incidental: yn.describe("yes if unrelated to the reason for the exam; no if the exam was ordered to evaluate it."),
  stability: z.enum(["new", "stable", "enlarging", "unknown"]).describe("Compared with prior imaging, if stated."),
  stableMonths: num("Months of documented stability when a comparison date is given."),
  radiologistRecommendation: str("The radiologist's follow-up recommendation for THIS finding, verbatim."),

  attenuation: z.enum(["solid", "ground-glass", "part-solid", "unknown"]).describe("Lung nodules only; 'unknown' for other organs."),
  solidComponentMm: num("Lung part-solid nodules: solid component size in mm."),
  calcified: yn,
  benignCalcification: yn.describe("Central, laminated, popcorn, or diffuse calcification, or 'calcified granuloma'."),
  perifissural: yn.describe("Lung: perifissural / intrapulmonary lymph node."),
  spiculated: yn,
  upperLobe: yn,

  unenhancedHU: z.number().describe("Attenuation in Hounsfield units on the unenhanced phase (may be negative for fat). Use -999 if not stated."),
  macroscopicFat: yn.describe("Contains macroscopic fat (adrenal myelolipoma, renal angiomyolipoma)."),
  enhancement: z.enum(["none", "present", "unknown"]),
  homogeneous: yn,
  washoutMeetsAdenoma: yn.describe("Adrenal washout APW >= 60% or RPW >= 40%."),
  explicitlyBenign: yn.describe("Radiologist explicitly characterises it as benign: simple cyst, hemangioma, FNH, granuloma, adenoma, angiomyolipoma."),
  bosniak: z.enum(["none", "I", "II", "IIF", "III", "IV"]),
  tooSmallToCharacterize: yn,

  suspiciousFeatures: yn.describe("Liver: ill-defined margins, heterogeneous, mural nodularity, thick septa, enhancement > 20 HU."),
  flashFilling: yn.describe("Liver: uniform arterial-phase hyperenhancement."),

  mainDuctCommunication: yn.describe("Pancreatic cyst communicates with the main pancreatic duct."),
  worrisomeFeatures: yn.describe("Pancreas: mural nodule, thickened wall, main duct >= 7 mm."),
  highRiskStigmata: yn.describe("Pancreas: obstructive jaundice, enhancing solid component, main duct >= 10 mm."),
  serousCystadenoma: yn,

  tiRads: z.number().int().min(0).max(5).describe("ACR TI-RADS level 1-5 when given on a dedicated thyroid ultrasound; 0 otherwise."),
  thyroidSuspicious: yn.describe("Thyroid: local invasion or abnormal cervical lymph nodes."),
  petAvid: yn,

  confidence: z.number().min(0).max(1).describe("Confidence that this is a real, non-negated finding read correctly."),
});

export const ContextWire = z.object({
  modality: z.enum(["CT", "MRI", "US", "XR", "PET", "unknown"]),
  bodyRegion: str("Body region scanned."),
  contrast: z.enum(["with", "without", "both", "unknown"]),
  examReason: str("Clinical indication / reason for exam, verbatim."),
  patientAgeYears: num("Patient age in years."),
  patientSex: z.enum(["female", "male", "unknown"]),
  knownCancer: yn.describe("This patient has a current or prior malignancy (family history does not count)."),
  screeningExam: yn.describe("Lung cancer screening / low-dose screening CT / Lung-RADS."),
  immunocompromised: yn,
  cirrhosisOrHepaticRisk: yn.describe("Cirrhosis, hepatitis, hemochromatosis, or other chronic liver disease."),
  emphysema: yn,
  priorComparisonAvailable: yn,
  reportDate: str("ISO date YYYY-MM-DD if the report carries a date."),
});

export const ExtractionWire = z.object({
  isRadiologyReport: z.boolean().describe("false if the text is not an imaging report at all."),
  context: ContextWire,
  findings: z.array(FindingWire),
  excluded: z.array(
    z.object({
      quote: z.string(),
      reason: z.enum(["negated", "not-focal", "benign-normal-variant", "not-in-covered-organ", "duplicate"]),
    }),
  ).describe("Mentions you saw and deliberately did not extract, for the audit trail."),
});

export type ExtractionWireT = z.infer<typeof ExtractionWire>;
export type FindingWireT = z.infer<typeof FindingWire>;

const tri = (v: "yes" | "no" | "unknown"): Tri => (v === "yes" ? true : v === "no" ? false : null);
const n = (v: number): number | null => (v < 0 ? null : v);
const s = (v: string): string | null => (v.trim() ? v : null);

export function toFinding(w: FindingWireT, id: string): Finding {
  return {
    id,
    organ: w.organ,
    organLabel: s(w.organLabel),
    kind: w.kind,
    description: w.description,
    sourceQuote: w.sourceQuote,
    sizeMm: n(w.sizeMm),
    sizeShortMm: n(w.sizeShortMm),
    multiplicity: w.multiplicity,
    incidental: tri(w.incidental),
    stability: w.stability,
    stableMonths: n(w.stableMonths),
    radiologistRecommendation: s(w.radiologistRecommendation),
    attenuation: w.attenuation,
    solidComponentMm: n(w.solidComponentMm),
    calcified: tri(w.calcified),
    benignCalcification: tri(w.benignCalcification),
    perifissural: tri(w.perifissural),
    spiculated: tri(w.spiculated),
    upperLobe: tri(w.upperLobe),
    unenhancedHU: w.unenhancedHU <= -500 ? null : w.unenhancedHU,
    macroscopicFat: tri(w.macroscopicFat),
    enhancement: w.enhancement,
    homogeneous: tri(w.homogeneous),
    washoutMeetsAdenoma: tri(w.washoutMeetsAdenoma),
    explicitlyBenign: tri(w.explicitlyBenign),
    bosniak: w.bosniak === "none" ? null : w.bosniak,
    tooSmallToCharacterize: tri(w.tooSmallToCharacterize),
    suspiciousFeatures: tri(w.suspiciousFeatures),
    flashFilling: tri(w.flashFilling),
    mainDuctCommunication: w.mainDuctCommunication,
    worrisomeFeatures: tri(w.worrisomeFeatures),
    highRiskStigmata: tri(w.highRiskStigmata),
    serousCystadenoma: tri(w.serousCystadenoma),
    tiRads: w.tiRads >= 1 && w.tiRads <= 5 ? (w.tiRads as 1 | 2 | 3 | 4 | 5) : null,
    thyroidSuspicious: tri(w.thyroidSuspicious),
    petAvid: tri(w.petAvid),
    confidence: w.confidence,
  };
}

export function toContext(w: z.infer<typeof ContextWire>): ReportContext {
  return {
    modality: w.modality,
    bodyRegion: s(w.bodyRegion),
    contrast: w.contrast,
    examReason: s(w.examReason),
    patientAgeYears: n(w.patientAgeYears),
    patientSex: w.patientSex,
    knownCancer: tri(w.knownCancer),
    screeningExam: tri(w.screeningExam),
    immunocompromised: tri(w.immunocompromised),
    cirrhosisOrHepaticRisk: tri(w.cirrhosisOrHepaticRisk),
    emphysema: tri(w.emphysema),
    priorComparisonAvailable: tri(w.priorComparisonAvailable),
    reportDate: s(w.reportDate),
  };
}
