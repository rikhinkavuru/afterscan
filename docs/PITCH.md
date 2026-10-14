# Finals pitch (5 min + 4 min Q&A)

1. **Hook (30 s).** Kidney-stone CT, 7 mm nodule, nobody calls. 39% no surveillance; 28% on time. Cures Act: patient reads it first.
2. **Problem framing (45 s).** Incidental findings are a hand-off failure, not a knowledge failure: the guideline exists, the owner doesn't. Patients are the only constant across every hand-off.
3. **Live walkthrough (2 min).** Hero case → both findings → risk toggle → rule trail → calendar → tracker. Then the four "it says no" cases in 20 seconds.
4. **Architecture (45 s).** Reader vs rulebook. Union-free schema, quote verification, confidence gate; deterministic engine, 69 tests, six guidelines from primary sources; dates/ics/tracker; nothing stored.
5. **Evidence (45 s).** Eval table: recall, precision, quote verification, false alarms, plan agreement across three splits; real-report results.
6. **Impact and path (15 s).** Patient-facing today; SMART on FHIR tomorrow so the plan reads straight from the portal; clinic-side nodule-clinic dashboards.

## Likely Q&A

- *Isn't this just ChatGPT?* The plan never comes from the model. Show the engine test file and a rule trail.
- *Liability?* Quotes a published guideline, never diagnoses, every card ends in "ask your doctor". Radiologist's own recommendation is shown first and labelled as taking priority.
- *What if the model misreads a size?* Quote verification catches fabrication; the eval measures misreads (size accuracy, plan agreement). Flagged findings tell the patient to check.
- *Why these six organs?* They are the organs with consensus incidental-finding guidelines; they cover most CT/MRI incidentalomas.
- *Why not integrate with the EHR?* Patient-side first because that needs no permission. SMART on FHIR DiagnosticReport is the next step and the engine is unchanged.
- *How did you validate the rules?* Transcribed from the flowchart figures in the primary papers; each box is a unit test; boundaries (6/8 mm, 1/1.5 cm) tested explicitly.
