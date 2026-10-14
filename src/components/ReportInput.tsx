"use client";

import type { PatientInputs } from "@/lib/engine/types";
import type { Sample } from "@/lib/samples";

export function ReportInput(props: {
  report: string;
  setReport: (v: string) => void;
  patient: PatientInputs;
  setPatient: (p: PatientInputs) => void;
  onRun: () => void;
  busy: boolean;
  samples: Sample[];
  activeSample: string | null;
  onSample: (id: string) => void;
}) {
  const { report, setReport, patient, setPatient, onRun, busy, samples, activeSample, onSample } = props;
  const set = <K extends keyof PatientInputs>(k: K, v: PatientInputs[K]) => setPatient({ ...patient, [k]: v });
  const tooShort = report.trim().length < 20;

  return (
    <div className="card p-5 md:p-6">
      <label htmlFor="report" className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">Your radiology report</span>
        <span className="text-xs text-ink-3">Paste the whole thing, headings and all</span>
      </label>
      <textarea
        id="report"
        value={report}
        onChange={(e) => setReport(e.target.value)}
        placeholder={"FINDINGS: ...\nIMPRESSION: ..."}
        spellCheck={false}
        className="field report-text mt-2 h-56 resize-y"
      />

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Or try a sample</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {samples.map((s) => (
            <button key={s.id} type="button" onClick={() => onSample(s.id)} className={`chip ${activeSample === s.id ? "active" : ""}`}>
              <span className="block font-medium">{s.title}</span>
              <span className="block text-xs text-ink-3">{s.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-line bg-paper-2/60 p-4" open>
        <summary className="flex items-center justify-between text-sm font-semibold">
          <span>About you (optional, makes the plan more specific)</span>
          <span className="text-xs font-normal text-ink-3">The guidelines branch on these</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <label className="block">
            <span className="text-xs text-ink-3">Age</span>
            <input
              type="number"
              min={0}
              max={120}
              className="field mt-1"
              value={patient.ageYears ?? ""}
              onChange={(e) => set("ageYears", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-3">Smoking</span>
            <select className="field mt-1" value={patient.smoking ?? "unknown"} onChange={(e) => set("smoking", e.target.value as PatientInputs["smoking"])}>
              <option value="unknown">Prefer not to say</option>
              <option value="never">Never smoked</option>
              <option value="former">Former smoker</option>
              <option value="current">Current smoker</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-ink-3">Date of the scan</span>
            <input type="date" className="field mt-1" value={patient.examDate ?? ""} onChange={(e) => set("examDate", e.target.value || null)} />
          </label>
          <TriSelect label="Ever had cancer?" value={patient.knownCancer} onChange={(v) => set("knownCancer", v)} />
          <TriSelect label="Liver disease (cirrhosis, hepatitis)?" value={patient.cirrhosisOrHepaticRisk} onChange={(v) => set("cirrhosisOrHepaticRisk", v)} />
          <TriSelect label="Family history of lung cancer?" value={patient.familyHistoryLungCancer} onChange={(v) => set("familyHistoryLungCancer", v)} />
        </div>
      </details>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-3">Sent to an AI model once to be read. Not stored.</p>
        <button type="button" className="btn btn-primary" onClick={onRun} disabled={busy || tooShort}>
          {busy ? "Reading…" : "Read my report"}
        </button>
      </div>
    </div>
  );
}

function TriSelect({ label, value, onChange }: { label: string; value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-ink-3">{label}</span>
      <select
        className="field mt-1"
        value={value === true ? "yes" : value === false ? "no" : ""}
        onChange={(e) => onChange(e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}
      >
        <option value="">Not sure</option>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </select>
    </label>
  );
}
