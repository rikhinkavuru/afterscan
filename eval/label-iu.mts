/**
 * Real-report split: NIH Open-i Indiana University chest X-ray reports that
 * mention a nodule or mass. Produces a candidate file with a regex-suggested
 * label that is then reviewed by hand (see iu-labeled.json).
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "data");
const raw = JSON.parse(fs.readFileSync(path.join(dir, "iu-reports-raw.json"), "utf8")) as { nodule_or_mass: string[] };
const neg = /\b(no|without|negative for|free of|absence of)\b[^.]{0,60}\b(nodul|mass)/i;
const benign = /calcifi|granuloma/i;
const out = raw.nodule_or_mass.map((report, i) => {
  const sentences = report.split(/(?<=\.)\s+/);
  const positiveSentences = sentences.filter((s) => /nodul|mass/i.test(s) && !neg.test(s));
  return {
    id: `iu-${String(i + 1).padStart(3, "0")}`,
    report,
    suggested: { positive: positiveSentences.length > 0, benign: positiveSentences.some((s) => benign.test(s)), sentences: positiveSentences },
  };
});
fs.writeFileSync(path.join(dir, "iu-candidates.json"), JSON.stringify(out, null, 1));
console.log(out.length, "candidates; suggested positive:", out.filter((o) => o.suggested.positive).length);
