# Evaluation

Generated 2026-10-14 by `npx tsx eval/report.mts`. Raw per-case records are in `eval/results/`.

## How the splits were built

- **synthetic**: `eval/generate-synthetic.mts`, seeded, 123 reports. Each finding carries structured ground truth; the expected plan is what the engine produces from that truth, so plan agreement isolates the reader's errors.
- **synthetic-paraphrased**: the same reports rewritten by claude-sonnet-5-5 in four radiologist styles with all facts preserved (`eval/paraphrase.mts`); labels reused.
- **iu**: 70 real, de-identified NIH Open-i Indiana University chest X-ray reports mentioning a nodule or mass, hand-labelled (`eval/data/iu-labeled.json`): is a non-negated finding present, and is it clearly benign (calcified granuloma). Two hedged reports were excluded and are marked in the file.

## Reading accuracy (synthetic splits)

| split | model | effort | recall | precision | quote verified | size | attenuation | Bosniak | benign flag | multiplicity | plan status agreement | first-step agreement | false alarms on negatives | non-reports flagged | mean latency | p90 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| synthetic-paraphrased | claude-opus-5-5 | medium | 100.0% | 100.0% | 100.0% | 100.0% (n=119) | 100.0% (n=41) | 100.0% (n=19) | 100.0% (n=31) | 100.0% (n=26) | 99.2% (n=119) | 99.2% (n=119) | 0/12 | 0/2 | 6.3 s | 8.8 s |
| synthetic-paraphrased | claude-sonnet-5-5 | medium | 100.0% | 100.0% | 100.0% | 100.0% (n=119) | 100.0% (n=41) | 100.0% (n=19) | 100.0% (n=31) | 100.0% (n=26) | 98.3% (n=119) | 98.3% (n=119) | 0/12 | 0/2 | 4.5 s | 6.2 s |
| synthetic | claude-opus-5-5 | medium | 100.0% | 100.0% | 100.0% | 100.0% (n=119) | 100.0% (n=41) | 100.0% (n=19) | 100.0% (n=31) | 100.0% (n=26) | 99.2% (n=119) | 99.2% (n=119) | 0/14 | 2/2 | 6.2 s | 8.8 s |
| synthetic | claude-sonnet-5-5 | medium | 100.0% | 100.0% | 100.0% | 100.0% (n=119) | 100.0% (n=41) | 100.0% (n=19) | 100.0% (n=31) | 100.0% (n=26) | 99.2% (n=119) | 99.2% (n=119) | 0/14 | 2/2 | 4.2 s | 5.7 s |

## Real chest X-ray reports (iu)

The task on real reports is narrower, because chest X-rays cannot size nodules for Fleischner: did the reader find the non-negated nodule/mass mention, and did the engine avoid issuing a follow-up plan for clearly benign calcified granulomas?

| model | effort | positive-mention precision | recall | tp/fp/fn/tn | benign granulomas: no plan issued | X-ray reports given a follow-up plan | mean latency |
|---|---|---|---|---|---|---|---|
| claude-opus-5-5 | medium | 100.0% | 94.9% | 37/0/2/31 | 17/17 | 0 | 5.2 s |
| claude-sonnet-5-5 | medium | 97.4% | 97.4% | 38/1/1/30 | 17/17 | 0 | 3.5 s |

## Disagreements

Every case where the plan computed from the reader's output differs from the plan computed from ground truth:

- **synthetic-paraphrased / claude-opus-5-5 / medium**: par-109 (expected no-follow-up, got follow-up)
- **synthetic-paraphrased / claude-sonnet-5-5 / medium**: par-041 (expected follow-up, got further-evaluation); par-109 (expected no-follow-up, got follow-up)
- **synthetic / claude-opus-5-5 / medium**: syn-109 (expected no-follow-up, got follow-up)
- **synthetic / claude-sonnet-5-5 / medium**: syn-109 (expected no-follow-up, got follow-up)

## Per-family plan agreement (synthetic, by model)

| family | synthetic-paraphrased/opus-5-5 | synthetic-paraphrased/sonnet-5-5 | synthetic/opus-5-5 | synthetic/sonnet-5-5 |
|---|---|---|---|---|
| adrenal | 14/14 | 13/14 | 14/14 | 14/14 |
| kidney-IIF | 2/2 | 2/2 | 2/2 | 2/2 |
| kidney-simple | 9/9 | 9/9 | 9/9 | 9/9 |
| kidney-solid | 2/2 | 2/2 | 2/2 | 2/2 |
| kidney-solid-small | 2/2 | 2/2 | 2/2 | 2/2 |
| kidney-tstc | 1/1 | 1/1 | 1/1 | 1/1 |
| liver-cyst | 2/2 | 2/2 | 2/2 | 2/2 |
| liver-hemangioma | 2/2 | 2/2 | 2/2 | 2/2 |
| liver-indeterminate | 3/3 | 3/3 | 3/3 | 3/3 |
| liver-indeterminate-large | 2/2 | 2/2 | 2/2 | 2/2 |
| liver-tstc | 3/3 | 3/3 | 3/3 | 3/3 |
| lung | 26/26 | 26/26 | 26/26 | 26/26 |
| lung-benign | 6/6 | 6/6 | 6/6 | 6/6 |
| lung-cancer-hx | 3/3 | 3/3 | 3/3 | 3/3 |
| lung-screening | 4/4 | 4/4 | 4/4 | 4/4 |
| multi | 17/18 | 17/18 | 17/18 | 17/18 |
| pancreas | 12/12 | 12/12 | 12/12 | 12/12 |
| thyroid | 8/8 | 8/8 | 8/8 | 8/8 |

## Caveats

- Synthetic reports are written by the same author as the engine; they test coverage of the rule space and the reader's handling of units, negation, multiplicity and distractors, not the full variety of real reports. The paraphrased split adds style variance; the real split adds real variety but only for chest X-rays.
- The real split cannot score plan correctness because chest X-ray nodules are out of Fleischner's scope by design; it scores whether the reader finds the mention and whether benign granulomas are left alone.
- Latency includes the model's internal reasoning (thinking is always on for these models); the UI streams the plain-English explanation in parallel so the wait is shorter than it looks here.
