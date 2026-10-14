import type { Finding, Plan, ReportContext, PatientInputs } from "@/lib/engine/types";

export type UIFinding = Finding & { span: { start: number; end: number } | null; flagged: boolean };

export interface AnalyzeResponse {
  isRadiologyReport: boolean;
  context: ReportContext;
  findings: UIFinding[];
  plans: Plan[];
  excluded: { quote: string; reason: string }[];
  model: string;
  ms: number;
  patient: PatientInputs;
  error?: string;
  detail?: string;
}
