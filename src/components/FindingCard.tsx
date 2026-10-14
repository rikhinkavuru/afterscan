"use client";

import { useState } from "react";
import type { Plan, PlanStep } from "@/lib/engine/types";
import type { UIFinding } from "./types";
import { STATUS_LABEL, STATUS_TONE, URGENCY_LABEL, ORGAN_LABEL, findingLabel } from "@/lib/ui";
import { dateSteps, fmtWindow, fmtMonthsOut } from "@/lib/dates";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FindingCard({
  finding: f,
  plan,
  examDate,
  active,
  onActivate,
}: {
  finding: UIFinding;
  plan: Plan;
  examDate: string;
  active: boolean;
  onActivate: () => void;
}) {
  const [branch, setBranch] = useState(0);
  const steps: PlanStep[] = plan.branches ? plan.branches[branch].steps : plan.steps;
  const dated = dateSteps(plan, examDate, steps);
  const tone = STATUS_TONE[plan.status];

  return (
    <article id={`card-${f.id}`} className={`card p-5 transition-shadow ${active ? "ring-2 ring-teal/40" : ""}`} onMouseEnter={onActivate}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{f.organ === "other" ? (f.organLabel ?? "Other") : ORGAN_LABEL[f.organ]}</p>
          <h3 className="display mt-0.5 text-xl font-medium">{cap(findingLabel(f))}</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`pill pill-${tone}`}>{STATUS_LABEL[plan.status]}</span>
          {plan.urgency !== "none" && URGENCY_LABEL[plan.urgency] && <span className="text-[11px] text-ink-3">{URGENCY_LABEL[plan.urgency]}</span>}
        </div>
      </div>

      <button
        type="button"
        className="report-text mt-3 block w-full rounded-lg border border-line bg-paper-2/60 p-3 text-left text-ink-2 hover:border-ink-3"
        onClick={() => {
          onActivate();
          document.getElementById(`quote-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        title="Show this sentence in the report"
      >
        “{f.sourceQuote}”
        {!f.quoteVerified && <span className="mt-1 block text-[11px] text-amber">This quote could not be matched to the report text exactly. Treat with care.</span>}
      </button>

      {f.flagged && (
        <p className="mt-2 rounded-lg bg-amber-2 px-3 py-2 text-xs text-amber">
          The reader was not confident about this finding ({Math.round(f.confidence * 100)}%). Check the quote and ask your doctor rather than relying on the plan.
        </p>
      )}

      <p className="mt-4 text-[1.02rem] leading-relaxed">{plan.headline}</p>

      {f.radiologistRecommendation && (
        <p className="mt-2 text-sm text-ink-2">
          <span className="font-semibold">Your radiologist wrote:</span> “{f.radiologistRecommendation}”
        </p>
      )}

      {plan.branches && (
        <div className="mt-4 flex gap-2 text-sm">
          {plan.branches.map((b, i) => (
            <button key={b.label} type="button" onClick={() => setBranch(i)} className={`chip ${branch === i ? "active" : ""}`}>
              {b.label}
            </button>
          ))}
        </div>
      )}

      {dated.length > 0 && (
        <ol className="timeline-rail mt-4 space-y-3 pl-6">
          {dated.map((s, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-6 top-1 h-4 w-4 rounded-full border-2 ${s.optional ? "border-ink-3 bg-white" : "border-teal bg-teal-2"}`} />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-semibold">{fmtWindow(s.from, s.to)}</span>
                <span className="text-xs text-ink-3">{fmtMonthsOut(s)} after the scan</span>
              </div>
              <p className="text-sm text-ink-2">
                {s.optional && <span className="mr-1 rounded bg-paper-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">optional</span>}
                {s.what}
                {s.condition && <span className="text-ink-3"> · {s.condition}</span>}
              </p>
            </li>
          ))}
        </ol>
      )}

      {plan.missing && plan.missing.length > 0 && (
        <p className="mt-3 text-sm text-ink-2">
          <span className="font-semibold">Missing from the report:</span> {plan.missing.join(", ")}.
        </p>
      )}

      {plan.questions.length > 0 && (
        <div className="mt-4 rounded-xl bg-paper-2/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Ask your doctor</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {plan.questions.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-teal">→</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.guideline.citation && (
        <details className="mt-4 text-sm">
          <summary className="font-semibold text-ink-2 hover:text-ink">What the guideline says, and why this rule fired</summary>
          <div className="mt-2 space-y-2 rounded-lg border border-line p-3">
            <p>
              <span className="font-semibold">{plan.guideline.name}.</span>{" "}
              {plan.branches ? plan.branches[branch].guidelineText : plan.guidelineText}
            </p>
            <ol className="list-decimal space-y-0.5 pl-5 text-xs text-ink-2">
              {plan.rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
            <p className="text-xs text-ink-3">
              {plan.guideline.citation}{" "}
              <a href={plan.guideline.url} target="_blank" rel="noreferrer" className="underline">
                source
              </a>
            </p>
          </div>
        </details>
      )}
    </article>
  );
}
