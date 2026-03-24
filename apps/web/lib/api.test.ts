import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";

describe("createApiClient", () => {
  it("does not attach a browser-visible owner token header to GET requests", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl,
    });

    await client.getCategories();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toBeUndefined();
  });

  it("sends only JSON headers on POST requests", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl,
    });

    await client.submitQuickAdd({
      kind: "expense",
      amount: "12.00",
      title: "Lunch",
      merchantOrSource: "Cafe",
      category: "Food",
      account: "Checking",
      date: "2026-03-24",
      notes: "",
      status: "received",
      recurrence: "one-time",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({
      "Content-Type": "application/json",
    });
  });
});
