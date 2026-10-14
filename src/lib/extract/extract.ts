import { generateText, Output } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { ExtractionWire, toContext, toFinding, type ExtractionWireT } from "./schema";
import { EXTRACT_SYSTEM, extractUserPrompt } from "./prompt";
import type { Finding, ReportContext } from "@/lib/engine/types";

export const EXTRACT_MODEL = process.env.EXTRACT_MODEL ?? "claude-sonnet-5-5";

/** Below this, a finding is shown but flagged "needs a human check". */
export const CONFIDENCE_GATE = 0.6;

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

/**
 * Verify that a quote is a real substring of the report. Returns the exact
 * span in the original text when found so the UI can highlight it.
 */
export function locateQuote(report: string, quote: string): { start: number; end: number } | null {
  if (!quote) return null;
  const idx = report.indexOf(quote);
  if (idx >= 0) return { start: idx, end: idx + quote.length };
  // Whitespace/case-insensitive match: build a regex from the normalized quote.
  const tokens = norm(quote).split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const pattern = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const m = new RegExp(pattern, "i").exec(report);
  if (m) return { start: m.index, end: m.index + m[0].length };
  // Fallback: longest token run (>= 6 tokens) found contiguously.
  for (let len = Math.min(tokens.length - 1, 12); len >= 6; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      const sub = tokens.slice(i, i + len).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
      const mm = new RegExp(sub, "i").exec(report);
      if (mm) return { start: mm.index, end: mm.index + mm[0].length };
    }
  }
  return null;
}

export interface ExtractResult {
  isRadiologyReport: boolean;
  context: ReportContext;
  findings: (Finding & { span: { start: number; end: number } | null; flagged: boolean })[];
  excluded: ExtractionWireT["excluded"];
  model: string;
  ms: number;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** Convert the LLM's output into engine-ready findings, with verification. */
export function postProcess(report: string, raw: ExtractionWireT, model: string, ms: number, usage?: ExtractResult["usage"]): ExtractResult {
  const findings = raw.findings.map((w, i) => {
    const f = toFinding(w, `f${i + 1}`);
    const span = locateQuote(report, f.sourceQuote);
    // Defensive unit fix: a "size" under 1 that looks like centimetres.
    const fixSize = (v: number | null) => (v !== null && v > 0 && v < 1 ? Math.round(v * 10) : v);
    const quoteVerified = span !== null;
    const confidence = quoteVerified ? f.confidence : Math.min(f.confidence, 0.5);
    return {
      ...f,
      sizeMm: fixSize(f.sizeMm),
      sizeShortMm: fixSize(f.sizeShortMm ?? null),
      quoteVerified,
      span,
      confidence,
      flagged: confidence < CONFIDENCE_GATE,
    };
  });
  return { isRadiologyReport: raw.isRadiologyReport, context: toContext(raw.context), findings, excluded: raw.excluded, model, ms, usage };
}

export async function extractReport(report: string, opts: { model?: string } = {}): Promise<ExtractResult> {
  const model = opts.model ?? EXTRACT_MODEL;
  const t0 = Date.now();
  const { output, usage } = await generateText({
    model: anthropic(model),
    system: EXTRACT_SYSTEM,
    prompt: extractUserPrompt(report),
    output: Output.object({ schema: ExtractionWire }),
    temperature: 0,
    maxOutputTokens: 4000,
  });
  return postProcess(report, output, model, Date.now() - t0, {
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
  });
}
