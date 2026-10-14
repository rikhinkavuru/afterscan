/**
 * Style perturbation: have a model rewrite each synthetic report as a
 * different radiologist would, preserving every fact. Labels are reused.
 */
import fs from "node:fs";
import path from "node:path";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { SynthCase } from "./generate-synthetic.mts";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const STYLES = [
  "terse, telegraphic, heavy abbreviations (RLL, w/o, neg), all caps section headers",
  "verbose academic style with long sentences and hedging language",
  "structured template with one organ per line and 'Unremarkable' entries, numbered impression",
  "dictated style with minor transcription quirks and run-on sentences",
];

const dir = path.join(import.meta.dirname, "data");
const cases: SynthCase[] = JSON.parse(fs.readFileSync(path.join(dir, "synthetic.json"), "utf8"));
const outPath = path.join(dir, "synthetic-paraphrased.json");
const done: SynthCase[] = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : [];
const doneIds = new Set(done.map((c) => c.id));

let i = 0;
for (const c of cases) {
  if (doneIds.has(c.id) || c.family === "not-report") continue;
  const style = STYLES[i++ % STYLES.length];
  const { text } = await generateText({
    model: anthropic("claude-sonnet-5-5"),
    system:
      "You rewrite radiology reports in a different radiologist's style. Preserve every clinical fact exactly: every measurement (you may switch mm/cm units but not values), laterality, location, descriptors, comparison statements, negations, and every recommendation. Do not add, drop, or soften any finding. Output only the rewritten report.",
    prompt: `Style: ${style}\n\nREPORT:\n${c.report}`,
    maxOutputTokens: 6000,
    providerOptions: { anthropic: { effort: "low" } },
  });
  done.push({ ...c, id: c.id.replace("syn-", "par-"), report: text.trim() });
  fs.writeFileSync(outPath, JSON.stringify(done, null, 1));
  process.stdout.write(`${c.id} `);
}
console.log(`\n${done.length} paraphrased ->`, outPath);
