import { describe, it, expect } from "vitest";
import { addMonths, toISODate, fmtWindow, resolveExamDate, dateSteps } from "./dates";
import { buildIcs, stepsToEvents } from "./ics";
import { step } from "./engine/shared";

describe("dates", () => {
  it("adds months and clamps month-end overflow", () => {
    expect(toISODate(addMonths("2026-01-31", 1))).toBe("2026-02-28");
    expect(toISODate(addMonths("2026-09-30", 6))).toBe("2027-03-30");
    expect(toISODate(addMonths("2026-09-30", 24))).toBe("2028-09-30");
  });
  it("formats windows", () => {
    expect(fmtWindow(addMonths("2026-09-30", 6), addMonths("2026-09-30", 12))).toBe("Mar–Sep 2027");
    expect(fmtWindow(addMonths("2026-09-30", 12), addMonths("2026-09-30", 12))).toBe("Sep 2027");
    expect(fmtWindow(addMonths("2026-09-30", 3), addMonths("2026-09-30", 6))).toBe("Dec 2026 – Mar 2027");
  });
  it("resolves exam date with precedence report > patient > today", () => {
    expect(resolveExamDate("2026-09-30", "2026-01-01")).toBe("2026-09-30");
    expect(resolveExamDate("bad", "2026-01-01")).toBe("2026-01-01");
    expect(resolveExamDate(null, null, new Date("2026-10-14T12:00:00"))).toBe("2026-10-14");
  });
  it("dates plan steps", () => {
    const plan = { findingId: "f1", steps: [step("CT chest", 6, 12)] } as never;
    const d = dateSteps(plan, "2026-09-30");
    expect(d[0].fromISO).toBe("2027-03-30");
    expect(d[0].toISO).toBe("2027-09-30");
  });
});

describe("ics", () => {
  it("builds a valid calendar with an alarm", () => {
    const plan = { findingId: "f1", steps: [step("CT chest", 6, 12, { optional: true })] } as never;
    const ev = stepsToEvents(dateSteps(plan, "2026-09-30"), () => "7 mm lung nodule", () => "Fleischner 2017");
    const ics = buildIcs(ev);
    expect(ics).toMatch(/BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20270330/);
    expect(ics).toMatch(/SUMMARY:Consider: CT chest \(7 mm lung nodule\)/);
    expect(ics).toMatch(/TRIGGER:-P14D/);
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});
