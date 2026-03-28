import { describe, expect, it } from "vitest";
import { compareDateValues, formatDateValue, parseDateValue, todayDateInputValue } from "@/lib/dates";

describe("parseDateValue", () => {
  it("treats plain calendar dates as local dates instead of UTC timestamps", () => {
    const parsed = parseDateValue("2026-03-27");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(27);
  });
});

describe("formatDateValue", () => {
  it("formats plain calendar dates without shifting the day", () => {
    expect(
      formatDateValue("2026-03-27", {
        month: "short",
        day: "numeric",
      }),
    ).toBe("Mar 27");
  });
});

describe("compareDateValues", () => {
  it("keeps calendar-date ordering stable", () => {
    expect(compareDateValues("2026-03-27", "2026-03-28")).toBeLessThan(0);
    expect(compareDateValues("2026-03-28", "2026-03-27")).toBeGreaterThan(0);
    expect(compareDateValues("2026-03-27", "2026-03-27")).toBe(0);
  });
});

describe("todayDateInputValue", () => {
  it("returns the local calendar date for date inputs", () => {
    const base = new Date(2026, 2, 27, 23, 45);

    expect(todayDateInputValue(base)).toBe("2026-03-27");
  });
});
