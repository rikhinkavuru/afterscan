"use client";

import { useMemo, useState } from "react";
import type { Plan } from "@/lib/engine/types";
import type { AnalyzeResponse } from "./types";
import { dateSteps, fmtWindow, type DatedStep } from "@/lib/dates";
import { buildIcs, stepsToEvents } from "@/lib/ics";
import { findingLabel } from "@/lib/ui";
import { getTrackerSnapshot, writeTracker, type TrackedPlan } from "@/lib/tracker";

export function PlanTimeline({ result, plans, examDate }: { result: AnalyzeResponse; plans: Plan[]; examDate: string }) {
  const [saved, setSaved] = useState(false);
  const byId = useMemo(() => new Map(result.findings.map((f) => [f.id, f])), [result]);
  const label = (id: string) => (byId.get(id) ? findingLabel(byId.get(id)!) : id);
  const guideline = (id: string) => plans.find((p) => p.findingId === id)?.guideline.name ?? "";

  const steps: DatedStep[] = useMemo(
    () =>
      plans
        .flatMap((p) => dateSteps(p, examDate))
        .sort((a, b) => a.from.getTime() - b.from.getTime()),
    [plans, examDate],
  );
  const questions = useMemo(() => Array.from(new Set(plans.flatMap((p) => p.questions))), [plans]);
  const ask = new Date(examDate + "T00:00:00");
  ask.setDate(ask.getDate() + 14);

  if (steps.length === 0 && questions.length === 0) return null;

  const download = () => {
    const events = stepsToEvents(steps, label, guideline);
    events.unshift({
      uid: `afterscan-ask-${examDate}@afterscan`,
      date: new Date() > ask ? new Date() : ask,
      summary: "Confirm follow-up plan with my doctor (Afterscan)",
      description: questions.join("\n"),
      alarmDaysBefore: 1,
    });
    const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `afterscan-follow-up-${examDate}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const save = () => {
    const plan: TrackedPlan = {
      id: `${examDate}-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      title: result.findings.map((f) => findingLabel(f)).join(" · "),
      examDate,
      findings: plans.map((p) => ({ id: p.findingId, label: label(p.findingId), status: p.status, guideline: p.guideline.name })),
      steps: steps.map((s, i) => ({ id: `${s.findingId}-${i}`, what: `${s.what} (${label(s.findingId)})`, fromISO: s.fromISO, toISO: s.toISO, optional: s.optional, condition: s.condition, done: false, scheduled: false })),
      questions,
    };
    writeTracker([plan, ...getTrackerSnapshot().filter((p) => p.id !== plan.id)]);
    setSaved(true);
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-2xl font-medium">Your follow-up plan</h2>
          <p className="mt-1 text-sm text-ink-2">
            {steps.length === 0 ? "Nothing to schedule. Bring the questions to your next visit." : `${steps.length} dated step${steps.length > 1 ? "s" : ""}, earliest ${fmtWindow(steps[0].from, steps[0].to)}.`}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {steps.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={download}>
              Add to calendar (.ics)
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={save} disabled={saved}>
            {saved ? "Saved to My follow-ups" : "Track in this browser"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-3">
            <tr>
              <th className="py-1.5 pr-3 font-semibold">When</th>
              <th className="py-1.5 pr-3 font-semibold">What</th>
              <th className="py-1.5 font-semibold">For</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={i} className="border-t border-line/70 align-top">
                <td className="whitespace-nowrap py-2 pr-3 font-semibold">{fmtWindow(s.from, s.to)}</td>
                <td className="py-2 pr-3">
                  {s.optional && <span className="mr-1 text-[11px] font-semibold uppercase text-ink-3">optional</span>}
                  {s.what}
                  {s.condition && <span className="text-ink-3"> · {s.condition}</span>}
                </td>
                <td className="py-2 text-ink-2">{label(s.findingId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-xs text-ink-3">
        The calendar file includes a reminder two weeks before each window opens, and a “confirm the plan with my doctor” event in two weeks. Your doctor may
        reasonably choose a different schedule; the point is that there is one, and that you know it.
      </p>
    </div>
  );
}
