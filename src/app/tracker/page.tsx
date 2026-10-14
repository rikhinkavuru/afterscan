"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { subscribeTracker, getTrackerSnapshot, getTrackerServerSnapshot, writeTracker, type TrackedPlan } from "@/lib/tracker";
import { fmtWindow } from "@/lib/dates";

export default function TrackerPage() {
  const plans = useSyncExternalStore(subscribeTracker, getTrackerSnapshot, getTrackerServerSnapshot);
  // Read the clock through the store API so the server render stays deterministic.
  const today = useSyncExternalStore(() => () => {}, () => new Date().toISOString().slice(0, 10), () => "");
  const update = (next: TrackedPlan[]) => writeTracker(next);
  const toggle = (pid: string, sid: string, key: "done" | "scheduled") =>
    update(plans!.map((p) => (p.id !== pid ? p : { ...p, steps: p.steps.map((s) => (s.id !== sid ? s : { ...s, [key]: !s[key] })) })));


  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="display text-4xl font-medium">My follow-ups</h1>
      <p className="mt-2 text-ink-2">
        Saved in this browser only. Tick “scheduled” once the appointment exists, and “done” once it has happened. Items whose window has
        opened and are still unscheduled are highlighted.
      </p>
      {plans.length === 0 ? (
        <div className="card mt-8 p-6">
          <p className="font-semibold">Nothing tracked yet.</p>
          <p className="mt-1 text-sm text-ink-2">
            <Link href="/" className="underline">Read a report</Link> and choose “Track in this browser”.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {plans.map((p) => (
            <section key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="display text-xl font-medium">{p.title.charAt(0).toUpperCase() + p.title.slice(1)}</h2>
                  <p className="text-xs text-ink-3">Scan on {p.examDate} · saved {p.createdAt.slice(0, 10)}</p>
                </div>
                <button type="button" className="text-xs text-ink-3 underline" onClick={() => update(plans.filter((x) => x.id !== p.id))}>
                  Remove
                </button>
              </div>
              {p.steps.length === 0 ? (
                <p className="mt-3 text-sm text-ink-2">No dated steps. Questions to ask: {p.questions.join(" ")}</p>
              ) : (
                <ul className="mt-4 divide-y divide-line/70">
                  {p.steps.map((s) => {
                    const open = s.fromISO <= today;
                    const overdue = open && !s.scheduled && !s.done;
                    return (
                      <li key={s.id} className={`flex flex-wrap items-center gap-3 py-2.5 text-sm ${s.done ? "opacity-50" : ""}`}>
                        <span className={`w-40 shrink-0 font-semibold ${overdue ? "text-amber" : ""}`}>
                          {fmtWindow(new Date(s.fromISO + "T00:00:00"), new Date(s.toISO + "T00:00:00"))}
                          {overdue && <span className="ml-1 text-[10px] uppercase">window open</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          {s.optional && <span className="mr-1 text-[11px] font-semibold uppercase text-ink-3">optional</span>}
                          {s.what}
                        </span>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={s.scheduled} onChange={() => toggle(p.id, s.id, "scheduled")} /> scheduled
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={s.done} onChange={() => toggle(p.id, s.id, "done")} /> done
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
