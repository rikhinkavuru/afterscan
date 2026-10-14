"use client";

import type { UIFinding } from "./types";

export function HighlightedReport({
  report,
  findings,
  active,
  onActivate,
}: {
  report: string;
  findings: UIFinding[];
  active: string | null;
  onActivate: (id: string) => void;
}) {
  const spans = findings
    .filter((f) => f.span)
    .map((f) => ({ id: f.id, ...f.span! }))
    .sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue; // overlapping; skip
    if (s.start > cursor) parts.push(<span key={`t${cursor}`}>{report.slice(cursor, s.start)}</span>);
    parts.push(
      <mark
        key={s.id}
        id={`quote-${s.id}`}
        className={`finding ${active === s.id ? "active" : ""}`}
        onClick={() => {
          onActivate(s.id);
          document.getElementById(`card-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      >
        {report.slice(s.start, s.end)}
      </mark>,
    );
    cursor = s.end;
  }
  if (cursor < report.length) parts.push(<span key="tail">{report.slice(cursor)}</span>);
  return <div className="report-text max-h-[70vh] overflow-auto rounded-lg bg-paper-2/50 p-3 text-ink-2">{parts}</div>;
}
