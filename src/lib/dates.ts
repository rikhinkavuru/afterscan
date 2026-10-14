import type { Plan, PlanStep } from "@/lib/engine/types";

export function addMonths(iso: string, months: number): Date {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Clamp end-of-month overflow (Jan 31 + 1 month -> Feb 28/29).
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtMonth(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtWindow(from: Date, to: Date): string {
  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) return fmtMonth(from);
  if (from.getFullYear() === to.getFullYear()) return `${MONTHS[from.getMonth()]}–${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
  return `${fmtMonth(from)} – ${fmtMonth(to)}`;
}

export function fmtMonthsOut(step: PlanStep): string {
  const m = (n: number) => (n === 0 ? "now" : n % 12 === 0 ? `${n / 12} yr` : `${n} mo`);
  if (step.monthsFrom === step.monthsTo) return m(step.monthsFrom);
  if (step.monthsFrom === 0) return `within ${m(step.monthsTo)}`;
  return `${step.monthsFrom}–${step.monthsTo} mo`;
}

export interface DatedStep extends PlanStep {
  findingId: string;
  from: Date;
  to: Date;
  fromISO: string;
  toISO: string;
}

export function dateSteps(plan: Plan, examDateISO: string, steps: PlanStep[] = plan.steps): DatedStep[] {
  return steps.map((s) => {
    const from = addMonths(examDateISO, s.monthsFrom);
    const to = addMonths(examDateISO, s.monthsTo);
    return { ...s, findingId: plan.findingId, from, to, fromISO: toISODate(from), toISO: toISODate(to) };
  });
}

/** Pick the exam date: report date, then the patient's answer, then today. */
export function resolveExamDate(reportDate: string | null | undefined, patientExamDate: string | null | undefined, today = new Date()): string {
  const ok = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  return ok(reportDate) ?? ok(patientExamDate) ?? toISODate(today);
}
