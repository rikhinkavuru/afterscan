/**
 * Evaluation runner.
 *   npx tsx eval/run.ts --split synthetic --model claude-opus-5-5 --effort medium
 *   npx tsx eval/run.ts --split iu --model claude-sonnet-5-5
 *
 * Metrics
 *  - finding detection: precision / recall, matched by organ (+ size within 1 mm when both known)
 *  - field accuracy on matched findings: size, attenuation, bosniak, explicitlyBenign, multiplicity
 *  - quote verification rate
 *  - plan agreement: engine(status) on predicted finding == engine(status) on truth finding
 *  - negatives: false-alarm rate (any finding on a report that should have none)
 *  - latency and tokens
 */
import fs from "node:fs";
import path from "node:path";
import { extractReport } from "../src/lib/extract/extract.ts";
import { planFinding } from "../src/lib/engine/index.ts";
import type { Finding, ReportContext } from "../src/lib/engine/types.ts";
import type { SynthCase } from "./generate-synthetic.mts";

const arg = (k: string, d?: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const split = arg("split", "synthetic")!;
const model = arg("model", "claude-opus-5-5")!;
const effort = arg("effort", "medium") as "low" | "medium" | "high";
const limit = Number(arg("limit", "0"));
const concurrency = Number(arg("concurrency", "4"));

const dir = path.join(import.meta.dirname, "data");
const resultsDir = path.join(import.meta.dirname, "results");
fs.mkdirSync(resultsDir, { recursive: true });
const outPath = path.join(resultsDir, `${split}.${model}.${effort}.json`);

type IUCase = { id: string; report: string; label: { positive: boolean; benign: boolean; note?: string }; exclude?: boolean };

const cases: (SynthCase | IUCase)[] = JSON.parse(fs.readFileSync(path.join(dir, split === "iu" ? "iu-labeled.json" : `${split}.json`), "utf8"));
const eligible = cases.filter((c) => !("exclude" in c && c.exclude));
const todo = limit ? eligible.slice(0, limit) : eligible;
const prior: Record<string, unknown> = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")).perCase ?? {} : {};

const isSynth = (c: SynthCase | IUCase): c is SynthCase => "truth" in c;

async function runOne(c: SynthCase | IUCase) {
  if (prior[c.id]) return prior[c.id];
  const r = await extractReport(c.report, { model, effort });
  const ctx: ReportContext = r.context;
  const pred = r.findings.map((f) => ({ f, plan: planFinding(f, ctx, isSynth(c) ? c.patient : {}) }));
  let rec: Record<string, unknown> = { id: c.id, ms: r.ms, usage: r.usage, isReport: r.isRadiologyReport, nPred: r.findings.length, quoteVerified: r.findings.filter((f) => f.quoteVerified).length, flagged: r.findings.filter((f) => f.flagged).length };
  if (isSynth(c)) {
    const used = new Set<number>();
    const matches = c.truth.map((t) => {
      let best = -1;
      pred.forEach((p, i) => {
        if (used.has(i) || p.f.organ !== t.organ) return;
        const sizeOk = t.sizeMm === null || p.f.sizeMm === null || Math.abs((p.f.sizeMm ?? 0) - t.sizeMm) <= 1;
        if (sizeOk && best < 0) best = i;
      });
      if (best >= 0) used.add(best);
      return best;
    });
    const fields = matches.map((mi, ti) => {
      if (mi < 0) return null;
      const t = c.truth[ti];
      const p = pred[mi].f;
      const ctxTruth: ReportContext = { ...ctx, ...c.ctxHints };
      const truthFinding: Finding = { id: "t", description: "", sourceQuote: "", multiplicity: "single", incidental: true, stability: "unknown", confidence: 1, attenuation: "unknown", enhancement: "unknown", mainDuctCommunication: "unknown", ...t } as Finding;
      const expectedPlan = planFinding(truthFinding, ctxTruth, c.patient);
      const gotPlan = pred[mi].plan;
      return {
        size: t.sizeMm === null ? null : p.sizeMm !== null && Math.abs(p.sizeMm - t.sizeMm) <= 0.5,
        attenuation: t.attenuation ? (p.attenuation === t.attenuation || (t.attenuation === "solid" && (p.attenuation === "unknown" || !p.attenuation))) : null,
        bosniak: t.bosniak ? p.bosniak === t.bosniak : null,
        benign: t.explicitlyBenign ? p.explicitlyBenign === true : null,
        multiplicity: t.multiplicity ? p.multiplicity === t.multiplicity : null,
        planStatus: gotPlan.status === expectedPlan.status,
        planFirstStep: (gotPlan.steps[0]?.monthsFrom ?? null) === (expectedPlan.steps[0]?.monthsFrom ?? null),
        expectedStatus: expectedPlan.status,
        gotStatus: gotPlan.status,
      };
    });
    rec = { ...rec, nTruth: c.truth.length, matched: matches.filter((m) => m >= 0).length, spurious: pred.length - matches.filter((m) => m >= 0).length, fields, negative: c.negative, family: c.family };
  } else {
    const positive = r.findings.length > 0;
    const benignCalled = r.findings.length > 0 && pred.every((p) => p.plan.status === "no-follow-up" || p.plan.status === "out-of-scope");
    rec = { ...rec, label: c.label, predPositive: positive, predBenign: benignCalled, statuses: pred.map((p) => p.plan.status) };
  }
  return rec;
}

const perCase: Record<string, unknown> = { ...prior };
let idx = 0;
async function worker() {
  while (idx < todo.length) {
    const c = todo[idx++];
    try {
      perCase[c.id] = await runOne(c);
      process.stdout.write(".");
    } catch (e) {
      perCase[c.id] = { id: c.id, error: String(e) };
      process.stdout.write("x");
    }
    fs.writeFileSync(outPath, JSON.stringify({ split, model, effort, perCase }, null, 1));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

// ---- summary ----
const recs = todo.map((c) => perCase[c.id] as Record<string, unknown>).filter((r) => !r.error);
const errors = todo.length - recs.length;
const summary: Record<string, unknown> = { split, model, effort, n: todo.length, errors };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
summary.latencyMsMean = Math.round(mean(recs.map((r) => r.ms as number)));
summary.latencyMsP90 = [...recs.map((r) => r.ms as number)].sort((a, b) => a - b)[Math.floor(recs.length * 0.9)] ?? null;
summary.outputTokensMean = Math.round(mean(recs.map((r) => ((r.usage as { outputTokens?: number })?.outputTokens ?? 0))));
if (split !== "iu") {
  const pos = recs.filter((r) => !(r.negative as boolean));
  const neg = recs.filter((r) => r.negative as boolean);
  const tp = pos.reduce((a, r) => a + (r.matched as number), 0);
  const nTruth = pos.reduce((a, r) => a + (r.nTruth as number), 0);
  const nPred = recs.reduce((a, r) => a + (r.nPred as number), 0);
  const fields = pos.flatMap((r) => (r.fields as (Record<string, boolean | null> | null)[]).filter(Boolean) as Record<string, boolean | null>[]);
  const acc = (k: string) => { const xs = fields.map((f) => f[k]).filter((v) => v !== null) as boolean[]; return xs.length ? { acc: +(xs.filter(Boolean).length / xs.length).toFixed(3), n: xs.length } : null; };
  summary.findingRecall = +(tp / nTruth).toFixed(3);
  summary.findingPrecision = +(tp / nPred).toFixed(3);
  summary.quoteVerifiedRate = +(recs.reduce((a, r) => a + (r.quoteVerified as number), 0) / nPred).toFixed(3);
  summary.size = acc("size");
  summary.attenuation = acc("attenuation");
  summary.bosniak = acc("bosniak");
  summary.explicitlyBenign = acc("benign");
  summary.multiplicity = acc("multiplicity");
  summary.planStatusAgreement = acc("planStatus");
  summary.planFirstStepAgreement = acc("planFirstStep");
  summary.negatives = { n: neg.length, falseAlarms: neg.filter((r) => (r.nPred as number) > 0).length, notReportFlagged: neg.filter((r) => r.isReport === false).length };
  const byFam: Record<string, { n: number; planOk: number; planN: number }> = {};
  for (const r of pos) {
    const fam = r.family as string;
    byFam[fam] ??= { n: 0, planOk: 0, planN: 0 };
    byFam[fam].n++;
    for (const f of (r.fields as (Record<string, boolean | null> | null)[])) if (f) { byFam[fam].planN++; if (f.planStatus) byFam[fam].planOk++; }
  }
  summary.byFamily = byFam;
  summary.disagreements = pos.flatMap((r) => ((r.fields as (Record<string, unknown> | null)[]).filter((f) => f && !f.planStatus).map((f) => ({ id: r.id, expected: f!.expectedStatus, got: f!.gotStatus }))));
} else {
  const lab = recs as { label: { positive: boolean; benign: boolean }; predPositive: boolean; predBenign: boolean; statuses: string[] }[];
  const tp = lab.filter((r) => r.label.positive && r.predPositive).length;
  const fp = lab.filter((r) => !r.label.positive && r.predPositive).length;
  const fn = lab.filter((r) => r.label.positive && !r.predPositive).length;
  const tn = lab.filter((r) => !r.label.positive && !r.predPositive).length;
  summary.positiveMention = { tp, fp, fn, tn, precision: +(tp / (tp + fp || 1)).toFixed(3), recall: +(tp / (tp + fn || 1)).toFixed(3) };
  const benignCases = lab.filter((r) => r.label.positive && r.label.benign);
  summary.benignHandled = { n: benignCases.length, noPlanIssued: benignCases.filter((r) => r.predBenign || !r.predPositive).length };
  summary.anyFollowUpOnRealXray = lab.filter((r) => r.statuses.some((s) => s === "follow-up" || s === "further-evaluation" || s === "refer")).map((r) => r);
}
fs.writeFileSync(outPath, JSON.stringify({ split, model, effort, summary, perCase }, null, 1));
console.log("\n" + JSON.stringify(summary, null, 1));
