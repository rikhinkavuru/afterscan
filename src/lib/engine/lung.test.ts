import { describe, it, expect } from "vitest";
import { planLung } from "./lung";
import { baseCtx, baseFinding } from "./test-fixtures";

const ctx = baseCtx({ modality: "CT" });

const nodule = (over: Partial<Parameters<typeof baseFinding>[0]> = {}) =>
  baseFinding({ organ: "lung", kind: "nodule", attenuation: "solid", ...over });

describe("Fleischner 2017: scope", () => {
  it("screening exams are out of scope (Lung-RADS)", () => {
    const p = planLung(nodule({ sizeMm: 7 }), baseCtx({ screeningExam: true }), {});
    expect(p.status).toBe("out-of-scope");
    expect(p.headline).toMatch(/Lung-RADS/);
  });
  it("known cancer is out of scope", () => {
    expect(planLung(nodule({ sizeMm: 7 }), ctx, { knownCancer: true }).status).toBe("out-of-scope");
    expect(planLung(nodule({ sizeMm: 7 }), baseCtx({ knownCancer: true }), {}).status).toBe("out-of-scope");
  });
  it("immunocompromised is out of scope", () => {
    expect(planLung(nodule({ sizeMm: 7 }), ctx, { immunocompromised: true }).status).toBe("out-of-scope");
  });
  it("age under 35 is out of scope; 35 is in scope", () => {
    expect(planLung(nodule({ sizeMm: 7 }), ctx, { ageYears: 34, smoking: "never" }).status).toBe("out-of-scope");
    expect(planLung(nodule({ sizeMm: 7 }), ctx, { ageYears: 35, smoking: "never" }).status).toBe("follow-up");
  });
  it("chest X-ray cannot be sized: out of scope with a CT question", () => {
    const p = planLung(nodule({ sizeMm: 10 }), baseCtx({ modality: "XR" }), {});
    expect(p.status).toBe("out-of-scope");
    expect(p.questions[0]).toMatch(/CT/);
  });
  it("patient inputs override the report", () => {
    const p = planLung(nodule({ sizeMm: 7 }), baseCtx({ knownCancer: true }), { knownCancer: false, smoking: "never" });
    expect(p.status).toBe("follow-up");
  });
});

describe("Fleischner 2017: benign endings", () => {
  it("benign calcification needs no follow-up regardless of size", () => {
    const p = planLung(nodule({ sizeMm: 12, benignCalcification: true }), ctx, { smoking: "current" });
    expect(p.status).toBe("no-follow-up");
  });
  it("stable calcified nodule needs no follow-up", () => {
    expect(planLung(nodule({ sizeMm: 5, calcified: true, stability: "stable" }), ctx, {}).status).toBe("no-follow-up");
  });
  it("typical perifissural nodule needs no follow-up even when > 6 mm", () => {
    expect(planLung(nodule({ sizeMm: 7, perifissural: true }), ctx, { smoking: "current" }).status).toBe("no-follow-up");
  });
  it("calcified granuloma on a chest X-ray is benign, not out of scope", () => {
    expect(planLung(nodule({ sizeMm: 5, calcified: true, benignCalcification: true }), baseCtx({ modality: "XR" }), {}).status).toBe("no-follow-up");
  });
  it("solid nodule stable >= 24 months is benign", () => {
    expect(planLung(nodule({ sizeMm: 9, stability: "stable", stableMonths: 30 }), ctx, {}).status).toBe("no-follow-up");
    expect(planLung(nodule({ sizeMm: 9, stability: "stable", stableMonths: 12 }), ctx, { smoking: "never" }).status).toBe("further-evaluation");
  });
});

describe("Fleischner 2017: single solid nodules", () => {
  it("< 6 mm low risk: no follow-up", () => {
    const p = planLung(nodule({ sizeMm: 5 }), ctx, { smoking: "never", ageYears: 50 });
    expect(p.status).toBe("no-follow-up");
    expect(p.steps).toHaveLength(0);
  });
  it("< 6 mm high risk: optional CT at 12 months", () => {
    const p = planLung(nodule({ sizeMm: 5 }), ctx, { smoking: "current" });
    expect(p.status).toBe("follow-up");
    expect(p.steps).toEqual([expect.objectContaining({ monthsFrom: 12, monthsTo: 12, optional: true })]);
  });
  it("6-8 mm low risk: CT 6-12 then consider 18-24", () => {
    const p = planLung(nodule({ sizeMm: 7 }), ctx, { smoking: "never", ageYears: 50 });
    expect(p.steps.map((s) => [s.monthsFrom, s.monthsTo, !!s.optional])).toEqual([
      [6, 12, false],
      [18, 24, true],
    ]);
  });
  it("6-8 mm high risk: CT 6-12 then 18-24 (not optional)", () => {
    const p = planLung(nodule({ sizeMm: 8 }), ctx, { smoking: "current" });
    expect(p.steps.map((s) => [s.monthsFrom, s.monthsTo, !!s.optional])).toEqual([
      [6, 12, false],
      [18, 24, false],
    ]);
  });
  it("> 8 mm: further evaluation at 3 months (both risks)", () => {
    for (const smoking of ["never", "current"] as const) {
      const p = planLung(nodule({ sizeMm: 9 }), ctx, { smoking, ageYears: 50 });
      expect(p.status).toBe("further-evaluation");
      expect(p.steps[0].monthsFrom).toBe(3);
    }
  });
  it("boundaries: 6 and 8 are inside 6-8; 8.4 rounds to 8; 8.5 rounds to 9", () => {
    expect(planLung(nodule({ sizeMm: 6 }), ctx, { smoking: "never", ageYears: 50 }).steps[0].monthsFrom).toBe(6);
    expect(planLung(nodule({ sizeMm: 8 }), ctx, { smoking: "never", ageYears: 50 }).steps[0].monthsFrom).toBe(6);
    expect(planLung(nodule({ sizeMm: 8.4 }), ctx, { smoking: "never", ageYears: 50 }).status).toBe("follow-up");
    expect(planLung(nodule({ sizeMm: 8.5 }), ctx, { smoking: "never", ageYears: 50 }).status).toBe("further-evaluation");
  });
  it("average diameter: 9 x 5 mm averages to 7 mm", () => {
    const p = planLung(nodule({ sizeMm: 9, sizeShortMm: 5 }), ctx, { smoking: "never", ageYears: 50 });
    expect(p.status).toBe("follow-up");
    expect(p.rationale[0]).toMatch(/7 mm/);
  });
  it("unknown risk returns both branches and schedules the high-risk one", () => {
    const p = planLung(nodule({ sizeMm: 7 }), ctx, {});
    expect(p.branches).toHaveLength(2);
    expect(p.steps[1].optional).toBeFalsy();
  });
  it("missing size is insufficient data with a size question", () => {
    const p = planLung(nodule({ sizeMm: null }), ctx, {});
    expect(p.status).toBe("insufficient-data");
    expect(p.questions[0]).toMatch(/millimetres/);
  });
  it("spiculation forces high risk", () => {
    const p = planLung(nodule({ sizeMm: 5, spiculated: true }), ctx, { smoking: "never", ageYears: 40 });
    expect(p.status).toBe("follow-up");
  });
});

describe("Fleischner 2017: multiple solid nodules", () => {
  it("< 6 mm low: none; high: optional 12", () => {
    expect(planLung(nodule({ sizeMm: 4, multiplicity: "multiple" }), ctx, { smoking: "never", ageYears: 50 }).status).toBe("no-follow-up");
    expect(planLung(nodule({ sizeMm: 4, multiplicity: "multiple" }), ctx, { smoking: "current" }).steps[0]).toMatchObject({ monthsFrom: 12, optional: true });
  });
  it("6-8 mm and > 8 mm: CT 3-6 then 18-24", () => {
    for (const sz of [7, 12]) {
      const low = planLung(nodule({ sizeMm: sz, multiplicity: "multiple" }), ctx, { smoking: "never", ageYears: 50 });
      expect(low.steps.map((s) => [s.monthsFrom, s.monthsTo, !!s.optional])).toEqual([[3, 6, false], [18, 24, true]]);
      const high = planLung(nodule({ sizeMm: sz, multiplicity: "multiple" }), ctx, { smoking: "current" });
      expect(high.steps.map((s) => [s.monthsFrom, s.monthsTo, !!s.optional])).toEqual([[3, 6, false], [18, 24, false]]);
    }
  });
});

describe("Fleischner 2017: subsolid nodules", () => {
  it("single GGN < 6: none; >= 6: CT 6-12 then every 2 years to 5", () => {
    expect(planLung(nodule({ sizeMm: 5, attenuation: "ground-glass" }), ctx, {}).status).toBe("no-follow-up");
    const p = planLung(nodule({ sizeMm: 8, attenuation: "ground-glass" }), ctx, {});
    expect(p.steps.map((s) => s.monthsFrom)).toEqual([6, 24, 48, 60]);
  });
  it("single part-solid >= 6 with solid part < 6: CT 3-6 then annual to 5 years", () => {
    const p = planLung(nodule({ sizeMm: 10, attenuation: "part-solid", solidComponentMm: 4 }), ctx, {});
    expect(p.status).toBe("follow-up");
    expect(p.steps.map((s) => s.monthsFrom)).toEqual([3, 12, 24, 36, 48, 60]);
  });
  it("part-solid with solid component >= 6 mm is highly suspicious", () => {
    const p = planLung(nodule({ sizeMm: 12, attenuation: "part-solid", solidComponentMm: 7 }), ctx, {});
    expect(p.status).toBe("further-evaluation");
  });
  it("multiple subsolid < 6: CT 3-6 (+2y/4y optional in high risk); >= 6: CT 3-6", () => {
    const low = planLung(nodule({ sizeMm: 4, attenuation: "ground-glass", multiplicity: "multiple" }), ctx, { smoking: "never", ageYears: 50 });
    expect(low.steps.map((s) => s.monthsFrom)).toEqual([3]);
    const high = planLung(nodule({ sizeMm: 4, attenuation: "ground-glass", multiplicity: "multiple" }), ctx, { smoking: "current" });
    expect(high.steps.map((s) => s.monthsFrom)).toEqual([3, 24, 48]);
    const big = planLung(nodule({ sizeMm: 9, attenuation: "ground-glass", multiplicity: "multiple" }), ctx, {});
    expect(big.steps.map((s) => s.monthsFrom)).toEqual([3]);
  });
});
