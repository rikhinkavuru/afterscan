# CodeTheCure 2026 — idea audit (2026-10-13)

## What we are optimizing for
- Prelim rubric /20: Pain 3, **Execution 10** ("works, polished, unique"), Feasibility+Impact 4, Alignment 3.
- Finals /25: innovation, uniqueness, impact, presentation. 5-min pitch + 4-min Q&A.
- Judges: SWEs at Microsoft/Amazon/PayPal/Meta/ServiceNow + 3 founders. No oncologists.
  => They score like a product demo: does it work when I click, is the architecture sane, is it fresh.
- Field: high school students, 3 weeks, heavy LLM ideation. Saturated space (what every LLM suggests):
  AI therapist chatbot, chemo side-effect tracker, Kaggle CNN scan classifier, report jargon explainer,
  caregiver coordination app, community forum, quiz/education game, trial matcher, UV/sunscreen app.
  The logistics doc literally lists the first batch => dozens of each.
- Deliverables: 300-word abstract, tryable demo (no login, must not break), public GitHub, 3-min video.

## Winning formula (derived)
1. One shocking, citable number in the first 10 seconds.
2. A 60-second tryable demo with a visible "wow" moment and graceful failure on garbage input.
3. Deterministic, auditable core (guidelines/rules with unit tests). LLM only where it is strong (parsing text), gated by confidence + abstention.
4. An evaluation table with real numbers. No high schooler ships this. SWE judges respect it instantly.
5. Unambiguous track fit. Pick the track where the competition is weakest *in execution*.

---

## GOLD: Incidental-finding follow-up guardian  (Track 1: Detection & Diagnosis)

**Pitch:** You get a CT for kidney stones. The report says "7 mm pulmonary nodule, follow-up CT recommended." Since the 21st Century Cures Act you read that report in your portal before your doctor does. Nobody calls. In safety-net cohorts ~39% of recommended nodule surveillance never happens and overall adherence is "as low as 40%". Some of those nodules are early lung cancer. This closes the loop.

**What it does (paste a radiology report, or load a sample):**
1. Plain-language translation of the report (patient-friendly, calm).
2. Extracts incidental findings into a schema (organ, size, attenuation, laterality, radiologist recommendation) with per-field confidence; abstains below threshold.
3. Deterministic guideline engine maps findings to follow-up: Fleischner 2017 (lung nodules), ACR Incidental Findings white papers (adrenal, renal/Bosniak, liver, pancreatic cyst, thyroid TI-RADS, ovarian). Each rule unit-tested; each output cites the rule.
4. Produces a dated follow-up plan + .ics calendar + SMS/email reminders + "questions for your doctor" list.
5. Tracker: "Was this scheduled? Done?" Nudges at the due date. Escalation copy for the patient to send to their clinic.
6. Scope awareness: detects screening context (Lung-RADS), known cancer, age < 35, immunocompromised => "outside this tool's scope, ask your oncologist" rather than guessing.

**Why it wins on the rubric**
- Pain (3/3): Cures Act + 39-60% lost follow-up + 78% of providers flooded with calls. Three citable numbers.
- Execution (10/10): works every time (rules), polished UI, unique vs the "explain my report" crowd because the product is the *follow-up loop*, not the translation.
- Feasibility/Impact (4/4): anyone with a CT; patient-facing today, SMART on FHIR tomorrow (stretch: demo against the public SMART Health IT sandbox reading DiagnosticReport resources => judges from Microsoft/Amazon will light up).
- Alignment (3/3): "flag risk earlier" verbatim.

**The rigor layer (our unfair advantage)**
- Eval corpus: ~150 reports: NIH Open-i Indiana chest X-ray reports (real, public, de-identified) + synthetic CT/US reports with hand labels. Report extraction precision/recall per field, guideline-mapping accuracy, abstention rate, and a "did it over-flag normal reports" false-alarm rate. Put the table in the README and the video.
- Confidence gating on extraction (conformal-style calibration on the eval set): "when unsure, it says so and routes to your doctor." One sentence judges will remember.

**Demo script (60 s):** Load messy sample report -> findings card appears with Fleischner citation -> dates + calendar -> paste a normal report -> "No follow-up recommended" (shows it does not cry wolf) -> paste nonsense -> graceful abstain. Then invite judges to paste their own.

**Stress test (skeptical judge)**
- "Just ChatGPT with a prompt?" -> No. The guideline engine is code with tests; the LLM only fills a schema and is confidence-gated; here is the eval table.
- "Doctors do this already." -> 39% none / up to 60% not completed; ED-ordered scans are the classic leak: ordering doctor never sees the result.
- "Medical advice liability?" -> Quotes the published guideline, never diagnoses, always ends in "confirm with your doctor" + the question list. Scope detector refuses out-of-scope cases.
- "Can I try it?" -> Yes, no login, sample buttons, works on phone.
- "Why not EHR integration?" -> Roadmap slide: SMART on FHIR; optional live sandbox demo.
- Failure modes: LLM extraction hallucinating a size -> gated + highlighted source span in the report (click to verify). Report formats vary -> eval set covers it.

**Build sketch:** Next.js on Vercel; Claude via AI Gateway with structured output for extraction + translation; guideline engine as pure TS module with 100+ unit tests; Resend for email, Twilio/Resend SMS optional; .ics generation; no PHI stored (client-side by default, optional local encrypted save). 

---

## SILVER: Hereditary cancer risk interviewer + live pedigree  (Track 3: Prevention & Education)

**Pitch:** 1 in 279 people carry Lynch syndrome; ~98% do not know. Carriers of BRCA/Lynch face up to 80% lifetime risk of cancers that are *preventable or catchable early* with screening, yet primary care almost never takes a proper family history. This tool takes one in five minutes.

**What it does:** Conversational family-history interview (voice or text) -> draws the pedigree live on screen (strong visual) -> checks against published genetic-testing referral criteria (USPSTF BRCA, NCCN-derived Lynch/BRCA criteria, Amsterdam/Bethesda) + implements validated risk models (NCI Gail/BCRAT, PREMM5) and **verifies its outputs against the official NCI calculator** in tests -> outputs a one-page letter for the doctor + genetic-counselor finder + screening plan.

**Why it could beat gold:** 100% deterministic (zero demo risk), stunning live pedigree, Prevention track is probably weakest in execution (quiz apps). Weaknesses: less dramatic hook than "lost nodule", "quiz" perception if the UI is lazy, NCCN text is copyrighted (use public summaries + cite).

---

## BRONZE: Copay/fund matcher for financial toxicity  (Track 2: Patient Experience & Support)

**Pitch:** Cancer patients are 2.5x more likely to go bankrupt, and bankrupt patients have a 79% higher risk of death (HR 1.79, Ramsey 2016 JCO). Foundation copay funds (HealthWell, PAN/PAF, etc.) open and close daily; patients never hear.

**What it does:** diagnosis + insurance type + state + income -> eligible funds with live open/closed status, the Medicare rule (manufacturer copay cards are banned for Medicare; foundations are allowed), application prep, SMS alert when a fund opens.

**Why third:** Highest impact per user, PayPal judge will love it, but execution risk: PAN merged with PAF in 2026 and is rebuilding its portal; scrapers can go stale on judging day; the "AI" is thin; hard to produce an eval table. Strong if you accept the data-ops risk.

---

## Honorable mentions (good, not gold)
- **PRO-CTCAE symptom monitoring with nurse-triage rules.** Basch 2017 JAMA: weekly symptom reporting -> median OS 31.2 vs 26.0 months. Best number in oncology software. Killed by saturation: judges will see 15 symptom trackers; survival benefit needs clinic-side response.
- **Chemo fever line (phone/SMS triage).** Febrile neutropenia: mortality rises ~7.6% per hour of antibiotic delay. Live phone demo in the video is dramatic. Killed by liability optics with SWE judges and LLM triage reliability.
- **Childhood-cancer survivor screening planner.** COG long-term follow-up guidelines are public and rule-based (anthracycline dose -> echo cadence; chest RT -> breast MRI at 25). Same "guideline exists, follow-up doesn't" thesis as gold; narrower audience. Great second product in the same engine later.
- **Tumor genomics report -> OncoKB evidence levels + trials.** Impressive integration, but narrow audience and too close to "explain my report".

## Rejected (with reason)
- Kaggle CNN scan classifier (Multi Cancer Dataset): known leakage/duplicate issues; demo breaks on real images; 30 other teams.
- Cervical Cancer Risk Classification (UCI): target leakage via Hinselmann/Schiller/Citology columns; tabular, unimpressive demo.
- AI therapist / companion chatbot: saturated, unsafe, judges distrust.
- Community platform: needs users to demo; empty forum on judging day.
- Report jargon explainer alone: commodity; every team with an API key.

## Decision
Build GOLD. Keep SILVER as the fallback if the team prefers Prevention track. Both share a "guideline engine + plan + reminders" core, so a late pivot is cheap.
Next: lock scope, write the eval corpus first (it drives everything), then the engine, then UI, then video. Preliminary doc feedback due Oct 20.
