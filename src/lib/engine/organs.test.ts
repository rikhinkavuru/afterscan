import { describe, it, expect } from "vitest";
import { planAdrenal } from "./adrenal";
import { planKidney } from "./kidney";
import { planLiver } from "./liver";
import { planPancreas } from "./pancreas";
import { planThyroid } from "./thyroid";
import { planFinding } from "./index";
import { baseCtx, baseFinding } from "./test-fixtures";

const ctx = baseCtx({ modality: "CT", bodyRegion: "abdomen" });
const months = (p: { steps: { monthsFrom: number }[] }) => p.steps.map((s) => s.monthsFrom);

describe("ACR adrenal 2017", () => {
  const ad = (o: Partial<Parameters<typeof baseFinding>[0]> = {}) => baseFinding({ organ: "adrenal", kind: "mass", ...o });
  it("< 1 cm: no follow-up", () => expect(planAdrenal(ad({ sizeMm: 8 }), ctx, {}).status).toBe("no-follow-up"));
  it("<= 10 HU unenhanced = adenoma: no follow-up at any size", () =>
    expect(planAdrenal(ad({ sizeMm: 35, unenhancedHU: 4 }), ctx, {}).status).toBe("no-follow-up"));
  it("macroscopic fat = myelolipoma: no follow-up", () =>
    expect(planAdrenal(ad({ sizeMm: 30, macroscopicFat: true }), ctx, {}).status).toBe("no-follow-up"));
  it("no enhancement = cyst/hemorrhage: no follow-up", () =>
    expect(planAdrenal(ad({ sizeMm: 25, enhancement: "none" }), ctx, {}).status).toBe("no-follow-up"));
  it("stable >= 1 year: no follow-up", () =>
    expect(planAdrenal(ad({ sizeMm: 25, stability: "stable", stableMonths: 14 }), ctx, {}).status).toBe("no-follow-up"));
  it("1-2 cm, no prior, no cancer: optional 12-month adrenal CT", () => {
    const p = planAdrenal(ad({ sizeMm: 15 }), ctx, { knownCancer: false });
    expect(p.status).toBe("follow-up");
    expect(p.steps).toEqual([expect.objectContaining({ monthsFrom: 12, optional: true })]);
  });
  it("2-4 cm, no prior, no cancer: adrenal CT now", () => {
    const p = planAdrenal(ad({ sizeMm: 28 }), ctx, { knownCancer: false });
    expect(p.status).toBe("further-evaluation");
    expect(p.steps[0].monthsFrom).toBe(0);
  });
  it("1-4 cm with cancer history: adrenal CT now", () =>
    expect(planAdrenal(ad({ sizeMm: 15 }), ctx, { knownCancer: true }).status).toBe("further-evaluation"));
  it("new/enlarging without cancer: adrenal CT or resection; with cancer: biopsy/PET", () => {
    expect(planAdrenal(ad({ sizeMm: 22, stability: "enlarging" }), ctx, { knownCancer: false }).status).toBe("further-evaluation");
    expect(planAdrenal(ad({ sizeMm: 22, stability: "new" }), ctx, { knownCancer: true }).urgency).toBe("prompt");
  });
  it(">= 4 cm: resection (no cancer) or biopsy/PET (cancer)", () => {
    expect(planAdrenal(ad({ sizeMm: 45 }), ctx, { knownCancer: false }).status).toBe("refer");
    expect(planAdrenal(ad({ sizeMm: 45 }), ctx, { knownCancer: true }).status).toBe("further-evaluation");
  });
  it("always asks about hormone testing", () =>
    expect(planAdrenal(ad({ sizeMm: 15 }), ctx, {}).questions.join(" ")).toMatch(/hormone/));
  it("size missing: insufficient data", () => expect(planAdrenal(ad({ sizeMm: null }), ctx, {}).status).toBe("insufficient-data"));
});

describe("ACR renal 2017 / Bosniak", () => {
  const k = (o: Partial<Parameters<typeof baseFinding>[0]> = {}) => baseFinding({ organ: "kidney", kind: "cyst", ...o });
  it("Bosniak I/II: no follow-up", () => {
    expect(planKidney(k({ bosniak: "I", sizeMm: 30 }), ctx, {}).status).toBe("no-follow-up");
    expect(planKidney(k({ bosniak: "II", sizeMm: 30 }), ctx, {}).status).toBe("no-follow-up");
  });
  it("simple cyst wording: no follow-up", () =>
    expect(planKidney(k({ explicitlyBenign: true, sizeMm: 22 }), ctx, {}).status).toBe("no-follow-up"));
  it("Bosniak IIF: 6, 12, then yearly to 5 years", () => {
    const p = planKidney(k({ bosniak: "IIF", sizeMm: 30 }), ctx, {});
    expect(p.status).toBe("follow-up");
    expect(months(p)).toEqual([6, 12, 24, 36, 48, 60]);
  });
  it("Bosniak III/IV: refer promptly", () => {
    expect(planKidney(k({ bosniak: "III" }), ctx, {}).status).toBe("refer");
    expect(planKidney(k({ bosniak: "IV" }), ctx, {}).urgency).toBe("prompt");
  });
  it("solid < 1 cm: follow-up at 6-12 then yearly to 5", () => {
    const p = planKidney(k({ kind: "mass", sizeMm: 8 }), ctx, {});
    expect(p.status).toBe("follow-up");
    expect(months(p)).toEqual([6, 24, 36, 48, 60]);
  });
  it("solid 1-4 cm and > 4 cm: refer", () => {
    expect(planKidney(k({ kind: "mass", sizeMm: 25 }), ctx, {}).status).toBe("refer");
    expect(planKidney(k({ kind: "mass", sizeMm: 55 }), ctx, {}).status).toBe("refer");
  });
  it("homogeneous -10..20 HU: benign cyst; 21-69 HU: indeterminate; >= 70 HU unenhanced: hyperdense cyst", () => {
    expect(planKidney(k({ homogeneous: true, unenhancedHU: 5, kind: "lesion" }), ctx, {}).status).toBe("no-follow-up");
    expect(planKidney(k({ homogeneous: true, unenhancedHU: 40, kind: "lesion" }), ctx, {}).status).toBe("further-evaluation");
    expect(planKidney(k({ homogeneous: true, unenhancedHU: 75, kind: "lesion" }), baseCtx({ contrast: "without" }), {}).status).toBe("no-follow-up");
  });
  it("too small to characterize: homogeneous = benign; inconclusive = MRI 6-12 months", () => {
    expect(planKidney(k({ tooSmallToCharacterize: true, homogeneous: true, kind: "lesion" }), ctx, {}).status).toBe("no-follow-up");
    const p = planKidney(k({ tooSmallToCharacterize: true, kind: "lesion" }), ctx, {});
    expect(p.status).toBe("follow-up");
    expect(p.steps[0]).toMatchObject({ monthsFrom: 6, monthsTo: 12 });
  });
  it("angiomyolipoma: < 4 cm none; >= 4 cm refer; with calcification = suspected RCC", () => {
    expect(planKidney(k({ macroscopicFat: true, sizeMm: 20, kind: "mass" }), ctx, {}).status).toBe("no-follow-up");
    expect(planKidney(k({ macroscopicFat: true, sizeMm: 45, kind: "mass" }), ctx, {}).status).toBe("refer");
    expect(planKidney(k({ macroscopicFat: true, calcified: true, sizeMm: 20, kind: "mass" }), ctx, {}).status).toBe("further-evaluation");
  });
  it("cancer that spreads to the kidney is out of scope", () =>
    expect(planKidney(k({ bosniak: "IIF" }), ctx, { knownCancer: true }).status).toBe("out-of-scope"));
  it("cyst without any features: insufficient data", () =>
    expect(planKidney(k({ sizeMm: 20 }), ctx, {}).status).toBe("insufficient-data"));
});

describe("ACR liver 2017", () => {
  const l = (o: Partial<Parameters<typeof baseFinding>[0]> = {}) => baseFinding({ organ: "liver", kind: "lesion", ...o });
  const low = { knownCancer: false, cirrhosisOrHepaticRisk: false } as const;
  const high = { knownCancer: true } as const;
  it("explicitly benign (cyst/hemangioma): none", () =>
    expect(planLiver(l({ sizeMm: 30, explicitlyBenign: true }), ctx, {}).status).toBe("no-follow-up"));
  it("< 1 cm: low risk none; high risk MRI 3-6 months; unknown shows both", () => {
    expect(planLiver(l({ sizeMm: 7 }), ctx, low).status).toBe("no-follow-up");
    const h = planLiver(l({ sizeMm: 7 }), ctx, high);
    expect(h.status).toBe("follow-up");
    expect(h.steps[0]).toMatchObject({ monthsFrom: 3, monthsTo: 6 });
    expect(planLiver(l({ sizeMm: 7 }), ctx, {}).branches).toHaveLength(2);
  });
  it("1-1.5 cm: benign features none; suspicious MRI now; flash-filling low none / high MRI", () => {
    expect(planLiver(l({ sizeMm: 12, homogeneous: true, unenhancedHU: 8 }), ctx, low).status).toBe("no-follow-up");
    expect(planLiver(l({ sizeMm: 12, suspiciousFeatures: true }), ctx, low).status).toBe("further-evaluation");
    expect(planLiver(l({ sizeMm: 12, flashFilling: true }), ctx, low).status).toBe("no-follow-up");
    expect(planLiver(l({ sizeMm: 12, flashFilling: true }), ctx, high).status).toBe("further-evaluation");
  });
  it("1-1.5 cm uncharacterised: prompt MRI (principle 5)", () =>
    expect(planLiver(l({ sizeMm: 12 }), ctx, low).status).toBe("further-evaluation"));
  it("> 1.5 cm: benign none; not benign low risk MRI; high risk MRI or biopsy (prompt)", () => {
    expect(planLiver(l({ sizeMm: 20, homogeneous: true, unenhancedHU: 10 }), ctx, low).status).toBe("no-follow-up");
    expect(planLiver(l({ sizeMm: 20 }), ctx, low).status).toBe("further-evaluation");
    const h = planLiver(l({ sizeMm: 20 }), ctx, high);
    expect(h.urgency).toBe("prompt");
    expect(h.steps[0].what).toMatch(/biopsy/i);
  });
  it("cirrhosis from the report makes the patient high risk", () =>
    expect(planLiver(l({ sizeMm: 7 }), baseCtx({ cirrhosisOrHepaticRisk: true }), {}).status).toBe("follow-up"));
});

describe("ACR pancreas 2017", () => {
  const pc = (o: Partial<Parameters<typeof baseFinding>[0]> = {}) => baseFinding({ organ: "pancreas", kind: "cyst", ...o });
  it("worrisome features: immediate EUS/FNA + surgery regardless of size", () => {
    const p = planPancreas(pc({ sizeMm: 9, worrisomeFeatures: true }), ctx, { ageYears: 50 });
    expect(p.status).toBe("refer");
    expect(p.urgency).toBe("prompt");
  });
  it("< 1.5 cm, age < 65: yearly x5 then q2y x2", () => {
    const p = planPancreas(pc({ sizeMm: 10 }), ctx, { ageYears: 50 });
    expect(months(p)).toEqual([12, 24, 36, 48, 60, 84, 108]);
  });
  it("< 1.5 cm, age 65-79: q2y x5", () =>
    expect(months(planPancreas(pc({ sizeMm: 10 }), ctx, { ageYears: 70 }))).toEqual([24, 48, 72, 96, 120]));
  it("1.5-1.9 cm with duct communication: yearly x5 then q2y x2", () =>
    expect(months(planPancreas(pc({ sizeMm: 17, mainDuctCommunication: "yes" }), ctx, { ageYears: 50 }))).toEqual([12, 24, 36, 48, 60, 84, 108]));
  it("2.0-2.5 cm (or duct unknown 1.5-2.5): q6mo x4, q1y x2, q2y x3", () => {
    const expected = [6, 12, 18, 24, 36, 48, 72, 96, 120];
    expect(months(planPancreas(pc({ sizeMm: 22, mainDuctCommunication: "yes" }), ctx, { ageYears: 50 }))).toEqual(expected);
    expect(months(planPancreas(pc({ sizeMm: 17 }), ctx, { ageYears: 50 }))).toEqual(expected);
  });
  it("> 2.5 cm: EUS/FNA or 6-monthly imaging", () => {
    const p = planPancreas(pc({ sizeMm: 30 }), ctx, { ageYears: 50 });
    expect(p.status).toBe("further-evaluation");
    expect(p.steps[0].what).toMatch(/EUS/);
  });
  it("age >= 80: q2y x2 then stop", () =>
    expect(months(planPancreas(pc({ sizeMm: 20 }), ctx, { ageYears: 82 }))).toEqual([24, 48]));
  it("serous cystadenoma > 4 cm: surgical consult; smaller: none", () => {
    expect(planPancreas(pc({ sizeMm: 45, serousCystadenoma: true }), ctx, { ageYears: 60 }).status).toBe("refer");
    expect(planPancreas(pc({ sizeMm: 30, serousCystadenoma: true }), ctx, { ageYears: 60 }).status).toBe("no-follow-up");
  });
  it("age missing: insufficient data, age from report counts", () => {
    expect(planPancreas(pc({ sizeMm: 10 }), ctx, {}).status).toBe("insufficient-data");
    expect(planPancreas(pc({ sizeMm: 10 }), baseCtx({ patientAgeYears: 50 }), {}).status).toBe("follow-up");
  });
});

describe("ACR thyroid 2015 / TI-RADS 2017", () => {
  const t = (o: Partial<Parameters<typeof baseFinding>[0]> = {}) => baseFinding({ organ: "thyroid", kind: "nodule", ...o });
  it("incidental on CT: < 35 threshold 10 mm; >= 35 threshold 15 mm", () => {
    expect(planThyroid(t({ sizeMm: 12 }), ctx, { ageYears: 30 }).status).toBe("further-evaluation");
    expect(planThyroid(t({ sizeMm: 12 }), ctx, { ageYears: 50 }).status).toBe("no-follow-up");
    expect(planThyroid(t({ sizeMm: 16 }), ctx, { ageYears: 50 }).status).toBe("further-evaluation");
    expect(planThyroid(t({ sizeMm: 9 }), ctx, { ageYears: 30 }).status).toBe("no-follow-up");
  });
  it("age unknown: >= 15 US, < 10 none, 10-14 asks", () => {
    expect(planThyroid(t({ sizeMm: 16 }), ctx, {}).status).toBe("further-evaluation");
    expect(planThyroid(t({ sizeMm: 8 }), ctx, {}).status).toBe("no-follow-up");
    expect(planThyroid(t({ sizeMm: 12 }), ctx, {}).questions.join(" ")).toMatch(/ultrasound/);
  });
  it("suspicious features or PET-avid: ultrasound now", () => {
    expect(planThyroid(t({ sizeMm: 6, thyroidSuspicious: true }), ctx, {}).status).toBe("further-evaluation");
    expect(planThyroid(t({ sizeMm: 6, petAvid: true }), ctx, {}).steps[0].what).toMatch(/FNA/);
  });
  it("TI-RADS: TR3 FNA >= 25, follow >= 15 at 1,3,5; TR4 FNA >= 15 follow >= 10; TR5 FNA >= 10 follow >= 5 yearly", () => {
    expect(planThyroid(t({ tiRads: 3, sizeMm: 26 }), ctx, {}).status).toBe("further-evaluation");
    expect(months(planThyroid(t({ tiRads: 3, sizeMm: 18 }), ctx, {}))).toEqual([12, 36, 60]);
    expect(planThyroid(t({ tiRads: 3, sizeMm: 12 }), ctx, {}).status).toBe("no-follow-up");
    expect(planThyroid(t({ tiRads: 4, sizeMm: 15 }), ctx, {}).status).toBe("further-evaluation");
    expect(months(planThyroid(t({ tiRads: 4, sizeMm: 11 }), ctx, {}))).toEqual([12, 24, 36, 60]);
    expect(months(planThyroid(t({ tiRads: 5, sizeMm: 7 }), ctx, {}))).toEqual([12, 24, 36, 48, 60]);
    expect(planThyroid(t({ tiRads: 2, sizeMm: 40 }), ctx, {}).status).toBe("no-follow-up");
  });
});

describe("dispatcher", () => {
  it("routes by organ and handles uncovered organs", () => {
    expect(planFinding(baseFinding({ organ: "lung", sizeMm: 7, attenuation: "solid" }), ctx, { smoking: "never", ageYears: 50 }).guideline.name).toMatch(/Fleischner/);
    const o = planFinding(baseFinding({ organ: "other", organLabel: "ovary" }), ctx, {});
    expect(o.status).toBe("out-of-scope");
    expect(o.headline).toMatch(/ovary/);
  });
});
