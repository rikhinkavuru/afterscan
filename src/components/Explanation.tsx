"use client";

export function Explanation({ text, loading }: { text: string; loading: boolean }) {
  if (!text && !loading) return null;
  const blocks = text.split(/\n(?=[A-Z][^\n]{2,60}:\s*$)/m);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="display text-2xl font-medium">In plain English</h2>
        {loading && <span className="pulse text-xs text-ink-3">writing…</span>}
      </div>
      <div className="prose-sm mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink-2">
        {text
          ? blocks.map((b, i) => {
              const m = b.match(/^([A-Z][^\n]{2,60}):\s*\n?([\s\S]*)$/);
              if (!m) return <p key={i} className="whitespace-pre-wrap">{b.trim()}</p>;
              const body = m[2].trim();
              const bullets = body.split("\n").filter((l) => /^\s*[-•*]/.test(l));
              return (
                <div key={i}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">{m[1]}</h3>
                  {bullets.length > 1 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {body.split("\n").map((l, j) => {
                        const t = l.replace(/^\s*[-•*]\s*/, "").trim();
                        return t ? <li key={j}>{t}</li> : null;
                      })}
                    </ul>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{body}</p>
                  )}
                </div>
              );
            })
          : null}
      </div>
      {!loading && text && <p className="mt-3 text-[11px] text-ink-3">Restates the report only. Definitions are general; the plan below comes from the guideline engine, not from this text.</p>}
    </div>
  );
}
