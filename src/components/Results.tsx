"use client";

import { useMemo, useState } from "react";
import type { PatientInputs, Plan } from "@/lib/engine/types";
import type { AnalyzeResponse, UIFinding } from "./types";
import { HighlightedReport } from "./HighlightedReport";
import { FindingCard } from "./FindingCard";
import { Explanation } from "./Explanation";
import { PlanTimeline } from "./PlanTimeline";
import { resolveExamDate } from "@/lib/dates";
import { worstFirst } from "@/lib/ui";

export function Results(props: {
  phase: "reading" | "done" | "error";
  result: AnalyzeResponse | null;
  explanation: string;
  error: string | null;
  report: string;
  patient: PatientInputs;
  onRetry: () => void;
}) {
  const { phase, result, explanation, error, report, patient, onRetry } = props;
  const [active, setActive] = useState<string | null>(null);
  const examDate = useMemo(() => resolveExamDate(result?.context.reportDate, patient.examDate), [result, patient.examDate]);

  const plans = useMemo(() => (result ? worstFirst(result.plans) : []), [result]);
  const byId = useMemo(() => new Map((result?.findings ?? []).map((f) => [f.id, f])), [result]);

  return (
    <section className="grid gap-6 pb-16 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="md:sticky md:top-4 md:self-start">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your report</h2>
            {result && (
              <span className="text-xs text-ink-3">
                {result.findings.length === 0 ? "no findings highlighted" : `${result.findings.length} finding${result.findings.length > 1 ? "s" : ""} highlighted`}
              </span>
            )}
          </div>
          <HighlightedReport report={report} findings={result?.findings ?? []} active={active} onActivate={setActive} />
        </div>
      </div>

      <div className="space-y-6">
        {phase === "error" && (
          <div className="card border-rose/30 p-5">
            <p className="font-semibold text-rose">Something went wrong reading the report.</p>
            <p className="mt-1 text-sm text-ink-2">{error}</p>
            <button type="button" className="btn btn-ghost mt-3" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        <Explanation text={explanation} loading={phase === "reading" && !explanation} />

        {phase === "reading" && !result && <Skeleton />}

        {result && !result.isRadiologyReport && (
          <div className="card p-5">
            <p className="font-semibold">This doesn’t look like a radiology report.</p>
            <p className="mt-1 text-sm text-ink-2">
              Afterscan reads imaging reports (CT, MRI, ultrasound, X-ray). Paste the text from your patient portal, including the
              FINDINGS and IMPRESSION sections.
            </p>
          </div>
        )}

        {result && result.isRadiologyReport && result.findings.length === 0 && (
          <div className="card p-5">
            <span className="pill pill-good">Nothing to follow up</span>
            <p className="mt-3 font-semibold">No incidental findings in the organs Afterscan covers.</p>
            <p className="mt-1 text-sm text-ink-2">
              The report did not describe a lung, adrenal, kidney, liver, pancreas, or thyroid finding that needs a plan.
              {result.excluded.length > 0 && " Things it saw and set aside are listed below."}
            </p>
            <Excluded excluded={result.excluded} />
          </div>
        )}

        {result && result.findings.length > 0 && (
          <>
            <div>
              <h2 className="display text-2xl font-medium">What was found, and what the guideline says</h2>
              <p className="mt-1 text-sm text-ink-2">
                Each card quotes the report (click the quote to see it in context), names the guideline, and lists the exact
                rule that fired. The schedule assumes the scan was on <strong>{examDate}</strong>
                {result.context.reportDate ? " (from the report)" : patient.examDate ? " (the date you entered)" : " (today; set the scan date above for accurate dates)"}.
              </p>
            </div>
            {plans.map((plan: Plan) => {
              const f = byId.get(plan.findingId) as UIFinding | undefined;
              if (!f) return null;
              return <FindingCard key={plan.findingId} finding={f} plan={plan} examDate={examDate} active={active === f.id} onActivate={() => setActive(f.id)} />;
            })}
            <PlanTimeline result={result} plans={plans} examDate={examDate} />
            <div className="card p-5">
              <h3 className="font-semibold">What Afterscan set aside</h3>
              <p className="mt-1 text-xs text-ink-3">For the audit trail: sentences the reader saw and deliberately did not turn into findings.</p>
              <Excluded excluded={result.excluded} />
              <p className="mt-3 text-[11px] text-ink-3">
                Read by {result.model} in {(result.ms / 1000).toFixed(1)} s. Every quote above was checked against the report text
                {result.findings.some((x) => !x.quoteVerified) ? "; one or more could not be matched and is flagged." : "; all matched."}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Excluded({ excluded }: { excluded: { quote: string; reason: string }[] }) {
  if (!excluded.length) return null;
  const label: Record<string, string> = {
    negated: "Says it is absent",
    "not-focal": "Not a focal finding",
    "benign-normal-variant": "Normal variant",
    "not-in-covered-organ": "Organ not covered",
    duplicate: "Duplicate",
  };
  return (
    <ul className="mt-3 space-y-1.5">
      {excluded.map((e, i) => (
        <li key={i} className="flex gap-2 text-xs">
          <span className="shrink-0 rounded bg-paper-2 px-1.5 py-0.5 text-ink-2">{label[e.reason] ?? e.reason}</span>
          <span className="report-text text-ink-2">{e.quote}</span>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="pulse inline-block h-2.5 w-2.5 rounded-full bg-teal" />
        <p className="text-sm font-medium">Reading the report, checking every quote against the text, applying the guidelines…</p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="pulse h-3 w-3/4 rounded bg-paper-2" />
        <div className="pulse h-3 w-1/2 rounded bg-paper-2" />
        <div className="pulse h-3 w-2/3 rounded bg-paper-2" />
      </div>
    </div>
  );
}
