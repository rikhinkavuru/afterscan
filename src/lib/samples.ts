export interface Sample {
  id: string;
  title: string;
  blurb: string;
  patient: { ageYears?: number; smoking?: "never" | "former" | "current" | "unknown"; knownCancer?: boolean; cirrhosisOrHepaticRisk?: boolean; examDate?: string };
  report: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "kidney-stone-ct",
    title: "CT for a kidney stone, with a surprise in the lung",
    blurb: "The classic case: a 7 mm lung nodule nobody ordered the scan for.",
    patient: { ageYears: 52, smoking: "former", knownCancer: false, examDate: "2026-09-30" },
    report: `CT ABDOMEN AND PELVIS WITHOUT CONTRAST

CLINICAL INDICATION: 52-year-old male with acute right flank pain. Evaluate for urolithiasis.

TECHNIQUE: Non-contrast helical CT of the abdomen and pelvis was performed.

COMPARISON: None.

FINDINGS:
Lung bases: There is a 7 mm solid pulmonary nodule in the right lower lobe (series 2, image 14). No pleural effusion. Mild dependent atelectasis.

Liver: Normal size and attenuation. No focal hepatic lesion.
Gallbladder, spleen, pancreas, adrenal glands: Unremarkable.
Kidneys: 3 mm non-obstructing calculus in the lower pole of the right kidney. 2 mm obstructing calculus at the right ureterovesical junction with mild right hydroureteronephrosis. A 2.4 cm simple cyst arises from the upper pole of the left kidney (water attenuation, imperceptible wall).
Bladder: Unremarkable.
Bowel: No obstruction or inflammatory change.
Bones: No acute osseous abnormality.

IMPRESSION:
1. 2 mm obstructing right UVJ calculus with mild right hydroureteronephrosis.
2. 7 mm solid right lower lobe pulmonary nodule. Follow-up chest CT in 6-12 months is recommended per Fleischner Society guidelines.
3. Simple left renal cyst. No follow-up needed.`,
  },
  {
    id: "pneumonia-ct-adrenal",
    title: "Chest CT for pneumonia: ground-glass nodule and an adrenal nodule",
    blurb: "Two incidental findings, two different guidelines.",
    patient: { ageYears: 61, smoking: "current", knownCancer: false, examDate: "2026-10-02" },
    report: `CT CHEST WITH IV CONTRAST

HISTORY: 61-year-old female, cough and fever for 10 days, evaluate for pneumonia. 40 pack-year smoking history.

COMPARISON: Chest radiograph 10/01/2026. No prior CT.

FINDINGS:
Lungs: Patchy consolidation in the right middle lobe consistent with pneumonia. Centrilobular emphysema, upper lobe predominant. There is a 9 mm pure ground-glass nodule in the left upper lobe (series 4, image 88). No other nodules.
Pleura: No effusion or pneumothorax.
Mediastinum: No lymphadenopathy. Heart size normal. Coronary artery calcification.
Upper abdomen: A 2.5 cm well-circumscribed left adrenal nodule measures 28 HU on this contrast-enhanced study; no unenhanced images available for characterization. Liver, spleen and visualized kidneys are unremarkable.
Bones: Degenerative changes of the thoracic spine.

IMPRESSION:
1. Right middle lobe pneumonia.
2. 9 mm ground-glass nodule, left upper lobe.
3. 2.5 cm indeterminate left adrenal nodule. Dedicated adrenal protocol CT or MRI is suggested for characterization.
4. Emphysema.`,
  },
  {
    id: "appendicitis-ct",
    title: "CT for appendicitis: pancreatic cyst and a liver spot",
    blurb: "Pancreatic cysts need a decade-long plan. Liver spots usually need nothing.",
    patient: { ageYears: 58, smoking: "never", knownCancer: false, cirrhosisOrHepaticRisk: false, examDate: "2026-09-18" },
    report: `CT ABDOMEN/PELVIS WITH IV CONTRAST

INDICATION: 58-year-old female with right lower quadrant pain. Rule out appendicitis.

COMPARISON: None available.

FINDINGS:
Appendix: Normal caliber appendix without periappendiceal inflammation.
Liver: An 8 mm hypodense lesion in segment 6 is too small to characterize. No other focal lesion. No biliary dilatation.
Pancreas: A 1.2 cm unilocular cystic lesion in the pancreatic tail. No mural nodule or wall thickening. Main pancreatic duct is normal in caliber (2 mm). Communication with the main duct cannot be determined.
Adrenals, spleen, kidneys: Unremarkable.
Bowel: Sigmoid diverticulosis without diverticulitis.
Pelvis: Normal uterus and adnexa.
Bones: No acute abnormality.

IMPRESSION:
1. No evidence of appendicitis. Sigmoid diverticulosis.
2. 1.2 cm pancreatic tail cystic lesion, likely a side-branch IPMN. Recommend follow-up MRI/MRCP in 12 months.
3. 8 mm hypodense hepatic lesion, too small to characterize, statistically likely benign.`,
  },
  {
    id: "normal-cxr",
    title: "A normal chest X-ray",
    blurb: "Control case. The tool should find nothing to follow up.",
    patient: { ageYears: 45, smoking: "never" },
    report: `CHEST RADIOGRAPH, PA AND LATERAL

INDICATION: Pre-operative evaluation.

COMPARISON: None.

FINDINGS: The heart size and mediastinal contours are within normal limits. The lungs are clear. There are no nodules, masses, or infiltrates. No pleural effusion or pneumothorax. The osseous structures are unremarkable.

IMPRESSION: No acute cardiopulmonary abnormality.`,
  },
  {
    id: "granuloma-ct",
    title: "A calcified granuloma that needs nothing",
    blurb: "Control case: a benign finding the tool must not turn into a plan.",
    patient: { ageYears: 67, smoking: "former", knownCancer: false },
    report: `CT CHEST WITHOUT CONTRAST

INDICATION: Chronic cough.

COMPARISON: CT chest 03/14/2021.

FINDINGS: There is a 5 mm densely calcified granuloma in the right upper lobe, unchanged from 2021. No new or enlarging pulmonary nodules. No consolidation, effusion, or pneumothorax. Mediastinum and hilar regions are normal. Heart size is normal.

IMPRESSION: Stable 5 mm calcified granuloma, benign. No follow-up imaging is required. No acute abnormality.`,
  },
  {
    id: "screening-ldct",
    title: "A lung cancer screening scan (Lung-RADS)",
    blurb: "Control case: the Fleischner rules don't apply here, and the tool should say so.",
    patient: { ageYears: 63, smoking: "current" },
    report: `LOW-DOSE CT CHEST FOR LUNG CANCER SCREENING

INDICATION: Annual lung cancer screening. 63-year-old, current smoker, 45 pack-years.

COMPARISON: Baseline screening LDCT 2025.

FINDINGS: A 7 mm solid nodule in the right upper lobe is new since the prior examination. Mild emphysema. No lymphadenopathy. Coronary calcifications.

IMPRESSION: Lung-RADS category 4A. New 7 mm solid right upper lobe nodule. Recommend 3-month LDCT follow-up.`,
  },
  {
    id: "neck-ct-thyroid",
    title: "CT of the neck after a car accident: a thyroid nodule",
    blurb: "A 1.8 cm thyroid nodule found by chance at age 44.",
    patient: { ageYears: 44, smoking: "never", knownCancer: false, examDate: "2026-10-05" },
    report: `CT CERVICAL SPINE WITHOUT CONTRAST

INDICATION: Motor vehicle collision, neck pain.

FINDINGS: No fracture or malalignment of the cervical spine. Prevertebral soft tissues are normal. Incidental note is made of a 1.8 cm hypodense nodule in the right lobe of the thyroid gland. No cervical lymphadenopathy. Lung apices are clear.

IMPRESSION:
1. No acute cervical spine injury.
2. Incidental 1.8 cm right thyroid nodule. Non-emergent thyroid ultrasound could be considered.`,
  },
];
