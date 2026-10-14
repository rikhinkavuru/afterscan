"use client";

import { useCallback, useRef, useState } from "react";
import { SAMPLES } from "@/lib/samples";
import type { PatientInputs } from "@/lib/engine/types";
import type { AnalyzeResponse } from "./types";
import { ReportInput } from "./ReportInput";
import { Results } from "./Results";

type Phase = "idle" | "reading" | "done" | "error";

export function Analyzer() {
  const [report, setReport] = useState("");
  const [patient, setPatient] = useState<PatientInputs>({ smoking: "unknown" });
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    setReport(s.report);
    setPatient({ smoking: "unknown", ...s.patient });
    setActiveSample(id);
    setResult(null);
    setExplanation("");
    setPhase("idle");
  };

  const run = useCallback(async () => {
    if (report.trim().length < 20) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("reading");
    setError(null);
    setResult(null);
    setExplanation("");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    const explain = (async () => {
      try {
        const r = await fetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ report }),
          signal: ac.signal,
        });
        if (!r.ok || !r.body) return;
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setExplanation(acc);
        }
      } catch {
        /* aborted or failed; the analysis still stands on its own */
      }
    })();

    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report, patient }),
        signal: ac.signal,
      });
      const j = (await r.json()) as AnalyzeResponse;
      if (!r.ok || j.error) throw new Error(j.detail || j.error || `HTTP ${r.status}`);
      setResult(j);
      setPhase("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setPhase("error");
    }
    await explain;
  }, [report, patient]);

  return (
    <div>
      <section className="grid gap-10 pb-10 pt-12 md:grid-cols-[1.05fr_1fr] md:pt-16">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal">For patients who got the report first</p>
          <h1 className="display text-[2.6rem] font-medium leading-[1.02] md:text-[3.6rem]">
            The scan found something else. Here is what the guidelines say to do about it.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
            Since 2021 you see your radiology report the moment it is signed, often before your doctor does. Paste it here.
            Afterscan explains it in plain English, pulls out the “by the way” findings, and turns the published follow-up
            guideline into dates you can put on a calendar, so nothing slips.
          </p>
          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="display text-3xl font-medium">~4 in 10</dt>
              <dd className="mt-1 text-ink-3">recommended lung-nodule follow-ups never get done</dd>
            </div>
            <div>
              <dt className="display text-3xl font-medium">6</dt>
              <dd className="mt-1 text-ink-3">organ guidelines encoded as tested rules</dd>
            </div>
            <div>
              <dt className="display text-3xl font-medium">0</dt>
              <dd className="mt-1 text-ink-3">reports stored. Nothing leaves your browser except one read</dd>
            </div>
          </dl>
        </div>
        <ReportInput
          report={report}
          setReport={(v) => {
            setReport(v);
            setActiveSample(null);
          }}
          patient={patient}
          setPatient={setPatient}
          onRun={run}
          busy={phase === "reading"}
          samples={SAMPLES}
          activeSample={activeSample}
          onSample={loadSample}
        />
      </section>

      <div ref={resultsRef} className="scroll-mt-6">
        {phase !== "idle" && (
          <Results
            phase={phase}
            result={result}
            explanation={explanation}
            error={error}
            report={report}
            patient={patient}
            onRetry={run}
          />
        )}
      </div>
    </div>
  );
}
