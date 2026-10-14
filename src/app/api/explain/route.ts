import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { EXPLAIN_SYSTEM } from "@/lib/extract/prompt";

export const maxDuration = 60;

const Body = z.object({ report: z.string().min(20).max(20000) });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  const result = streamText({
    model: anthropic(process.env.EXPLAIN_MODEL ?? "claude-sonnet-5-5"),
    system: EXPLAIN_SYSTEM,
    prompt: `REPORT START\n${parsed.data.report}\nREPORT END\n\nExplain this report to the patient.`,
    temperature: 0.2,
    maxOutputTokens: 700,
  });
  return result.toTextStreamResponse();
}
