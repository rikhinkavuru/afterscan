import { describe, it, expect } from "vitest";
import { locateQuote, postProcess } from "./extract";
import type { ExtractionWireT } from "./schema";

const report = `FINDINGS: There is a 7 mm solid nodule in the right lower lobe.\nIMPRESSION: 1. 7 mm RLL nodule. Recommend  follow-up CT in 6-12 months.`;

describe("locateQuote", () => {
  it("finds exact substrings", () => {
    expect(locateQuote(report, "7 mm solid nodule in the right lower lobe")).toEqual({ start: 21, end: 62 });
  });
  it("tolerates whitespace and case differences", () => {
    const s = locateQuote(report, "recommend follow-up ct in 6-12 months");
    expect(s).not.toBeNull();
    expect(report.slice(s!.start, s!.end)).toMatch(/Recommend  follow-up CT in 6-12 months/);
  });
  it("returns null for fabricated quotes", () => {
    expect(locateQuote(report, "a 2 cm mass in the liver was seen on this study today")).toBeNull();
  });
});

describe("postProcess", () => {
  const raw: ExtractionWireT = {
    isRadiologyReport: true,
    context: {
      modality: "CT", bodyRegion: "chest", contrast: "unknown", examReason: "", patientAgeYears: -1, patientSex: "unknown",
      knownCancer: "unknown", screeningExam: "unknown", immunocompromised: "unknown", cirrhosisOrHepaticRisk: "unknown", emphysema: "unknown",
      priorComparisonAvailable: "unknown", reportDate: "",
    },
    findings: [
      {
        organ: "lung", organLabel: "", kind: "nodule", description: "7 mm solid nodule RLL",
        sourceQuote: "7 mm solid nodule in the right lower lobe", sizeMm: 7, sizeShortMm: -1, multiplicity: "single", incidental: "unknown",
        stability: "unknown", stableMonths: -1, radiologistRecommendation: "Recommend follow-up CT in 6-12 months.",
        attenuation: "solid", solidComponentMm: -1, calcified: "unknown", benignCalcification: "unknown", perifissural: "unknown", spiculated: "unknown", upperLobe: "unknown",
        unenhancedHU: -999, macroscopicFat: "unknown", enhancement: "unknown", homogeneous: "unknown", washoutMeetsAdenoma: "unknown", explicitlyBenign: "unknown", bosniak: "none", tooSmallToCharacterize: "unknown",
        suspiciousFeatures: "unknown", flashFilling: "unknown", mainDuctCommunication: "unknown", worrisomeFeatures: "unknown", highRiskStigmata: "unknown", serousCystadenoma: "unknown",
        tiRads: 0, thyroidSuspicious: "unknown", petAvid: "unknown", confidence: 0.95,
      },
      {
        organ: "liver", organLabel: "", kind: "lesion", description: "invented", sourceQuote: "2 cm hypodense liver lesion", sizeMm: 0.7, sizeShortMm: -1,
        multiplicity: "single", incidental: "unknown", stability: "unknown", stableMonths: -1, radiologistRecommendation: "",
        attenuation: "unknown", solidComponentMm: -1, calcified: "unknown", benignCalcification: "unknown", perifissural: "unknown", spiculated: "unknown", upperLobe: "unknown",
        unenhancedHU: -999, macroscopicFat: "unknown", enhancement: "unknown", homogeneous: "unknown", washoutMeetsAdenoma: "unknown", explicitlyBenign: "unknown", bosniak: "none", tooSmallToCharacterize: "unknown",
        suspiciousFeatures: "unknown", flashFilling: "unknown", mainDuctCommunication: "unknown", worrisomeFeatures: "unknown", highRiskStigmata: "unknown", serousCystadenoma: "unknown",
        tiRads: 0, thyroidSuspicious: "unknown", petAvid: "unknown", confidence: 0.9,
      },
    ],
    excluded: [],
  };
  it("verifies quotes, flags unverifiable findings, and fixes cm-as-mm sizes", () => {
    const r = postProcess(report, raw, "test", 1);
    expect(r.findings[0].quoteVerified).toBe(true);
    expect(r.findings[0].flagged).toBe(false);
    expect(r.findings[1].quoteVerified).toBe(false);
    expect(r.findings[1].flagged).toBe(true);
    expect(r.findings[1].confidence).toBeLessThanOrEqual(0.5);
    expect(r.findings[1].sizeMm).toBe(7);
  });
});
