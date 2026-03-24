import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import * as auth from "@/lib/auth";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("createApiClient", () => {
  it("does not attach auth headers to GET requests when no session exists", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue(null);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.getCategories();

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const headers = calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
  });

  it("sends JSON headers and bearer auth on quick add POST requests when a session exists", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
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

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/quick-add");
    const headers = calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer session-token");
  });

  it("loads and saves setup through the bootstrap settings endpoint", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/settings/bootstrap") && (init?.method == null)) {
        return new Response(
          JSON.stringify({
            display_name: "Mitchel",
            protected_buffer: "100",
            essential_target: "25",
            savings_floor: "300",
            notes: "Keep it simple.",
            accounts: [],
            obligations: [],
            debts: [],
            income: [],
            roadmap_items: [],
            strategy_document: null,
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const setup = await client.getSetup();
    await client.saveSetup({
      display_name: "Mitchel",
      protected_buffer: "100",
      essential_target: "25",
      savings_floor: "300",
      notes: "Keep it simple.",
      accounts: [],
      obligations: [],
      debts: [],
      income: [],
      roadmap_items: [],
      strategy_document: null,
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(setup.display_name).toBe("Mitchel");
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/settings/bootstrap");
    expect(calls[1]?.[0]).toBe("http://localhost:8000/api/settings/bootstrap");
    expect(calls[1]?.[1]?.method).toBe("PUT");
  });

  it("reads and completes onboarding through the onboarding endpoints", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/onboarding/start")) {
        return new Response(
          JSON.stringify({
            state: {
              id: "state-1",
              owner_id: "owner-1",
              created_at: "2026-03-25T00:00:00Z",
              updated_at: "2026-03-25T00:00:00Z",
              is_complete: false,
              current_step: "start",
              completed_at: null,
            },
            profile: {
              id: "owner-1",
              owner_id: "owner-1",
              created_at: "2026-03-25T00:00:00Z",
              updated_at: "2026-03-25T00:00:00Z",
              display_name: "Life owner",
              email: "owner@example.com",
              currency: "USD",
              is_active: true,
            },
          }),
          { status: 200 },
        );
      }

      if (String(input).endsWith("/onboarding/complete")) {
        return new Response(
          JSON.stringify({
            state: {
              id: "state-1",
              owner_id: "owner-1",
              created_at: "2026-03-25T00:00:00Z",
              updated_at: "2026-03-25T00:00:00Z",
              is_complete: true,
              current_step: "start",
              completed_at: "2026-03-25",
            },
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const onboarding = await client.startOnboarding();
    const completion = await client.completeOnboarding();

    expect(onboarding?.state.is_complete).toBe(false);
    expect(completion?.state.is_complete).toBe(true);
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/onboarding/start");
    expect(calls[1]?.[0]).toBe("http://localhost:8000/api/onboarding/complete");
    expect(calls[0]?.[1]?.method).toBe("POST");
    expect(calls[1]?.[1]?.method).toBe("POST");
  });
});
