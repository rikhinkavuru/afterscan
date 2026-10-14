import type { Plan, PlanStatus, Urgency, Organ } from "@/lib/engine/types";

export const STATUS_LABEL: Record<PlanStatus, string> = {
  "no-follow-up": "Nothing to schedule",
  "follow-up": "Schedule a follow-up",
  "further-evaluation": "Needs a closer look",
  refer: "See a specialist",
  "insufficient-data": "Ask your doctor",
  "out-of-scope": "Not covered by these rules",
};

export const STATUS_TONE: Record<PlanStatus, "good" | "plan" | "warn" | "alert" | "muted"> = {
  "no-follow-up": "good",
  "follow-up": "plan",
  "further-evaluation": "warn",
  refer: "alert",
  "insufficient-data": "muted",
  "out-of-scope": "muted",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  none: "",
  routine: "Routine timing",
  soon: "Within the next few weeks",
  prompt: "Promptly",
};

export const ORGAN_LABEL: Record<Organ, string> = {
  lung: "Lung",
  adrenal: "Adrenal gland",
  kidney: "Kidney",
  liver: "Liver",
  pancreas: "Pancreas",
  thyroid: "Thyroid",
  other: "Other",
};

export function findingLabel(f: { organ: Organ; organLabel?: string | null; kind: string; sizeMm: number | null; attenuation?: string }): string {
  const organ = f.organ === "other" ? (f.organLabel ?? "other") : ORGAN_LABEL[f.organ].toLowerCase();
  const size = f.sizeMm !== null ? `${f.sizeMm} mm ` : "";
  const att = f.organ === "lung" && f.attenuation && f.attenuation !== "unknown" && f.attenuation !== "solid" ? `${f.attenuation} ` : "";
  return `${size}${att}${organ} ${f.kind}`;
}

export const worstFirst = (plans: Plan[]) => {
  const rank: Record<PlanStatus, number> = { refer: 0, "further-evaluation": 1, "follow-up": 2, "insufficient-data": 3, "out-of-scope": 4, "no-follow-up": 5 };
  return [...plans].sort((a, b) => rank[a.status] - rank[b.status]);
};
