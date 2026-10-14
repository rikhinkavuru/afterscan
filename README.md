# Afterscan

**The scan found something else. Here is what the guidelines say to do about it.**

Afterscan reads a radiology report a patient has pasted from their portal, explains it in plain English, pulls out the incidental findings (the lung nodule on a kidney-stone CT, the adrenal nodule on a chest CT), and turns the published follow-up guideline for each one into dated steps the patient can put on a calendar, print, or track in their browser.

Built for the CodeTheCure Hackathon 2026, Detection & Diagnosis track. Live demo: https://afterscan.vercel.app

## The problem

Scans ordered for one reason routinely turn up something unrelated. Radiologists describe these incidental findings and often recommend follow-up. Then the loop breaks: the doctor who ordered the scan was treating the kidney stone, and nobody owns the nodule.

- In a safety-net cohort of 551 patients with a recommended incidental lung-nodule follow-up, 39% had no documented surveillance at all; only 28% completed it on time ([PMC7757426](https://pmc.ncbi.nlm.nih.gov/articles/PMC7757426)).
- Reviews put adherence to recommended nodule follow-up "as low as 40%".
- Since the 21st Century Cures Act (2021), patients see the signed report in their portal immediately, usually before anyone explains it; 78% of surveyed providers report patient calls about report findings.

Some of the nodules that are never followed up are early lung cancers. The follow-up window exists precisely to find out which.

## What it does

1. **Read.** The report goes once to a language model with a strict, union-free JSON schema. Every finding must carry an exact quote from the report. The server verifies each quote against the text; a finding whose quote cannot be found is down-weighted and flagged. The model also lists what it saw and deliberately set aside (negated sentences, non-focal findings), so the read is auditable.
2. **Apply the rulebook.** Nothing about the plan comes from the model. Each finding goes through a deterministic engine that encodes the published guideline for its organ. Every branch is a unit test, and each card shows the rule that fired.
3. **Make it stick.** Windows become dates from the scan date, exported as an `.ics` calendar with reminders, printed, or kept as a checklist in the browser. Nothing is stored server-side.
4. **Know its limits.** The engine refuses when a guideline does not apply (lung cancer screening scans, known cancer, age under 35 for lung nodules, weakened immune system) and asks for what is missing when the report lacks a size or feature the rule needs.

## Guidelines encoded

| Organ | Source | Branches |
|---|---|---|
| Lung | Fleischner Society 2017 (MacMahon et al., Radiology 2017;284:228) | solid single/multiple x 3 sizes x 2 risk levels; ground-glass; part-solid with solid-component rule; multiple subsolid; benign calcification, perifissural, 2-year stability; scope gates |
| Adrenal | ACR Incidental Findings Committee 2017 (Mayo-Smith, JACR 2017;14:1038) | < 1 cm; diagnostic benign features (≤ 10 HU, macroscopic fat, no enhancement, washout, calcification); stability ≥ 1 yr; 1-2 cm / 2-4 cm / ≥ 4 cm with and without cancer history; new or enlarging |
| Kidney | ACR 2017 (Herts, JACR 2018;15:264) + Bosniak | Bosniak I/II/IIF/III/IV; solid < 1 / 1-4 / > 4 cm; too-small-to-characterize; attenuation rules for non-contrast and contrast-only CT; fat-containing (angiomyolipoma) pathway |
| Liver | ACR 2017 (Gore, JACR 2017;14:1429) | low/high-risk patient x < 1 / 1-1.5 / > 1.5 cm x benign / suspicious / flash-filling features |
| Pancreas | ACR 2017 (Megibow, JACR 2017;14:911) | all four charts: < 1.5 cm by age, 1.5-2.5 cm with/without duct communication, > 2.5 cm, age ≥ 80; worrisome features and high-risk stigmata |
| Thyroid | ACR 2015 (Hoang, JACR 2015;12:143) + ACR TI-RADS 2017 | incidental on CT/MRI by age (< 35: 1 cm, ≥ 35: 1.5 cm), suspicious features, PET-avid; TI-RADS FNA and follow-up thresholds |

The rule tables were transcribed from the primary papers (flowchart figures), not from secondary summaries. See `src/lib/engine/*.ts`; each file cites its source and each rule has a test in `src/lib/engine/*.test.ts`.

## Evaluation

See [docs/EVAL.md](docs/EVAL.md) for the full tables. Three splits:

- **synthetic** (123 reports): template-generated with known ground truth per finding, covering every organ and every scope gate, plus 14 negatives (normal reports, negated mentions, non-reports).
- **synthetic-paraphrased** (121 reports): the same facts rewritten by a model in four radiologist styles (telegraphic, verbose, templated, dictated), labels reused.
- **iu** (70 real reports): NIH Open-i Indiana University chest X-ray reports that mention a nodule or mass, hand-labelled for whether a non-negated finding is present and whether it is clearly benign (calcified granuloma).

Because the plan is computed by the engine from the extracted structure, "plan agreement" measures whether an extraction error would have changed what the patient is told.

## Running it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
npm test                     # engine, extraction post-processing, dates, calendar
npx tsx eval/generate-synthetic.mts
npx tsx eval/run.mts --split synthetic --model claude-opus-5-5 --effort medium
```

Environment: `ANTHROPIC_API_KEY` (required), `EXTRACT_MODEL` (default `claude-opus-5-5`), `EXTRACT_EFFORT` (default `medium`), `EXPLAIN_MODEL` (default `claude-sonnet-5-5`).

## Architecture

```
src/lib/engine/        deterministic guideline engine (pure TypeScript, 69 unit tests)
  lung.ts adrenal.ts kidney.ts liver.ts pancreas.ts thyroid.ts  one file per guideline
  index.ts             dispatcher
src/lib/extract/       LLM extraction: union-free wire schema, prompt, quote verification, confidence gate
src/lib/dates.ts       windows -> dates (month arithmetic with end-of-month clamping)
src/lib/ics.ts         RFC 5545 calendar export with alarms
src/lib/tracker.ts     browser-only follow-up checklist (localStorage, external store)
src/app/api/analyze    POST report + patient answers -> findings + plans
src/app/api/explain    POST report -> streamed plain-English explanation
src/components/        Analyzer, ReportInput, Results, HighlightedReport, FindingCard, PlanTimeline, Explanation
eval/                  synthetic generator, paraphraser, real-report labels, runner
```

Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, Vercel AI SDK 7 with the Anthropic provider, Zod, Vitest. Deployed on Vercel.

## What it is not

Afterscan is not medical advice and does not diagnose. Guidelines are written for clinicians and allow judgment; the right answer for a given patient may differ from the guideline branch. The product is the question list and the date, so that the conversation with the care team happens and the follow-up is not forgotten.

## Limitations

- Six organ systems. Findings elsewhere (ovary, breast, bone, lymph nodes) are surfaced with the radiologist's own recommendation but no guideline plan.
- The reader is a language model. Quote verification catches fabricated findings; it does not catch a misread size. The evaluation reports how often that happens.
- Risk categories (Fleischner high/low; liver high/low) depend on facts the report may not contain. When unknown, both branches are shown and the patient is told to ask.
- Chest X-ray reports are out of scope for Fleischner (which requires CT); the tool says so and suggests asking about a CT.
- English-language reports only.

## Data and sources

- NIH Open-i Indiana University Chest X-ray Collection (Demner-Fushman et al., JAMIA 2016), via the Hugging Face mirror `ayyuce/Indiana_University_Chest_X-ray_Collection`. De-identified; used only for evaluation of report reading.
- Guideline citations are in each engine file.
