import { NextResponse } from "next/server";
import { z } from "zod";
import { extractReport } from "@/lib/extract/extract";
import { planAll } from "@/lib/engine";
import type { PatientInputs } from "@/lib/engine";

export const maxDuration = 60;

const Body = z.object({
  report: z.string().min(20).max(20000),
  patient: z
    .object({
      ageYears: z.number().int().min(0).max(120).nullable().optional(),
      smoking: z.enum(["never", "former", "current", "unknown"]).optional(),
      familyHistoryLungCancer: z.boolean().nullable().optional(),
      emphysema: z.boolean().nullable().optional(),
      knownCancer: z.boolean().nullable().optional(),
      immunocompromised: z.boolean().nullable().optional(),
      cirrhosisOrHepaticRisk: z.boolean().nullable().optional(),
      examDate: z.string().nullable().optional(),
      limitedLifeExpectancy: z.boolean().nullable().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request", detail: String(e) }, { status: 400 });
  }
  const patient: PatientInputs = body.patient ?? {};
  try {
    const extraction = await extractReport(body.report);
    const plans = planAll(extraction.findings, extraction.context, patient);
    return NextResponse.json({ ...extraction, plans, patient });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Analysis failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
