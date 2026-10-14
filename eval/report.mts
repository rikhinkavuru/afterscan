/** Aggregate eval/results/*.json into docs/EVAL.md. */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "results");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const rows: Record<string, unknown>[] = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (j.summary) rows.push(j.summary);
}
const pct = (v: { acc: number; n: number } | number | null | undefined) =>
  v == null ? "–" : typeof v === "number" ? `${(v * 100).toFixed(1)}%` : `${(v.acc * 100).toFixed(1)}% (n=${v.n})`;

let md = `# Evaluation\n\nGenerated ${new Date().toISOString().slice(0, 10)} by \`npx tsx eval/report.mts\`. Raw per-case records are in \`eval/results/\`.\n\n`;
md += `## How the splits were built\n\n- **synthetic**: \`eval/generate-synthetic.mts\`, seeded, 123 reports. Each finding carries structured ground truth; the expected plan is what the engine produces from that truth, so plan agreement isolates the reader's errors.\n- **synthetic-paraphrased**: the same reports rewritten by claude-sonnet-5-5 in four radiologist styles with all facts preserved (\`eval/paraphrase.mts\`); labels reused.\n- **iu**: 70 real, de-identified NIH Open-i Indiana University chest X-ray reports mentioning a nodule or mass, hand-labelled (\`eval/data/iu-labeled.json\`): is a non-negated finding present, and is it clearly benign (calcified granuloma). Two hedged reports were excluded and are marked in the file.\n\n`;

md += `## Reading accuracy (synthetic splits)\n\n| split | model | effort | recall | precision | quote verified | size | attenuation | Bosniak | benign flag | multiplicity | plan status agreement | first-step agreement | false alarms on negatives | non-reports flagged | mean latency | p90 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows.filter((r) => r.split !== "iu")) {
  const neg = r.negatives as { n: number; falseAlarms: number; notReportFlagged: number };
  md += `| ${r.split} | ${r.model} | ${r.effort} | ${pct(r.findingRecall as number)} | ${pct(r.findingPrecision as number)} | ${pct(r.quoteVerifiedRate as number)} | ${pct(r.size as never)} | ${pct(r.attenuation as never)} | ${pct(r.bosniak as never)} | ${pct(r.explicitlyBenign as never)} | ${pct(r.multiplicity as never)} | ${pct(r.planStatusAgreement as never)} | ${pct(r.planFirstStepAgreement as never)} | ${neg.falseAlarms}/${neg.n} | ${neg.notReportFlagged}/2 | ${((r.latencyMsMean as number) / 1000).toFixed(1)} s | ${((r.latencyMsP90 as number) / 1000).toFixed(1)} s |\n`;
}
md += `\n## Real chest X-ray reports (iu)\n\nThe task on real reports is narrower, because chest X-rays cannot size nodules for Fleischner: did the reader find the non-negated nodule/mass mention, and did the engine avoid issuing a follow-up plan for clearly benign calcified granulomas?\n\n| model | effort | positive-mention precision | recall | tp/fp/fn/tn | benign granulomas: no plan issued | X-ray reports given a follow-up plan | mean latency |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of rows.filter((r) => r.split === "iu")) {
  const pm = r.positiveMention as { tp: number; fp: number; fn: number; tn: number; precision: number; recall: number };
  const b = r.benignHandled as { n: number; noPlanIssued: number };
  const any = r.anyFollowUpOnRealXray as unknown[];
  md += `| ${r.model} | ${r.effort} | ${pct(pm.precision)} | ${pct(pm.recall)} | ${pm.tp}/${pm.fp}/${pm.fn}/${pm.tn} | ${b.noPlanIssued}/${b.n} | ${any.length} | ${((r.latencyMsMean as number) / 1000).toFixed(1)} s |\n`;
}
md += `\n## Disagreements\n\nEvery case where the plan computed from the reader's output differs from the plan computed from ground truth:\n\n`;
for (const r of rows.filter((r) => r.split !== "iu")) {
  const d = r.disagreements as { id: string; expected: string; got: string }[];
  md += `- **${r.split} / ${r.model} / ${r.effort}**: ${d.length === 0 ? "none" : d.map((x) => `${x.id} (expected ${x.expected}, got ${x.got})`).join("; ")}\n`;
}
md += `\n## Per-family plan agreement (synthetic, by model)\n\n| family | ${rows.filter((r) => r.split !== "iu").map((r) => `${r.split}/${(r.model as string).replace("claude-", "")}`).join(" | ")} |\n|---|${rows.filter((r) => r.split !== "iu").map(() => "---").join("|")}|\n`;
const fams = new Set<string>();
for (const r of rows.filter((r) => r.split !== "iu")) for (const k of Object.keys(r.byFamily as object)) fams.add(k);
for (const fam of [...fams].sort()) {
  md += `| ${fam} | ${rows.filter((r) => r.split !== "iu").map((r) => { const v = (r.byFamily as Record<string, { planOk: number; planN: number }>)[fam]; return v ? `${v.planOk}/${v.planN}` : "–"; }).join(" | ")} |\n`;
}
md += `\n## Caveats\n\n- Synthetic reports are written by the same author as the engine; they test coverage of the rule space and the reader's handling of units, negation, multiplicity and distractors, not the full variety of real reports. The paraphrased split adds style variance; the real split adds real variety but only for chest X-rays.\n- The real split cannot score plan correctness because chest X-ray nodules are out of Fleischner's scope by design; it scores whether the reader finds the mention and whether benign granulomas are left alone.\n- Latency includes the model's internal reasoning (thinking is always on for these models); the UI streams the plain-English explanation in parallel so the wait is shorter than it looks here.\n`;
fs.writeFileSync(path.join(import.meta.dirname, "..", "docs", "EVAL.md"), md);
console.log(md);
