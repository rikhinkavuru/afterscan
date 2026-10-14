/** Browser-only tracker. Nothing leaves the device. */
export interface TrackedStep {
  id: string;
  what: string;
  fromISO: string;
  toISO: string;
  optional?: boolean;
  condition?: string;
  done: boolean;
  scheduled: boolean;
}
export interface TrackedPlan {
  id: string;
  createdAt: string;
  title: string;
  examDate: string;
  findings: { id: string; label: string; status: string; guideline: string }[];
  steps: TrackedStep[];
  questions: string[];
}

const KEY = "afterscan.tracker.v1";

export function loadTracker(): TrackedPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackedPlan[]) : [];
  } catch {
    return [];
  }
}
export function saveTracker(plans: TrackedPlan[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
  } catch {
    /* private mode */
  }
}
export function upsertPlan(plan: TrackedPlan) {
  const all = loadTracker().filter((p) => p.id !== plan.id);
  saveTracker([plan, ...all]);
}
export function removePlan(id: string) {
  saveTracker(loadTracker().filter((p) => p.id !== id));
}

// ---- tiny external store so React can read localStorage without an effect ----
let snapshot: TrackedPlan[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: TrackedPlan[] = [];

export function subscribeTracker(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
export function getTrackerSnapshot(): TrackedPlan[] {
  if (snapshot === null) snapshot = loadTracker();
  return snapshot;
}
export function getTrackerServerSnapshot(): TrackedPlan[] {
  return EMPTY;
}
export function writeTracker(plans: TrackedPlan[]) {
  saveTracker(plans);
  snapshot = plans;
  listeners.forEach((l) => l());
}
