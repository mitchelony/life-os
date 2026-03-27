import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import * as auth from "@/lib/auth";
import { sampleCategories } from "@/lib/sample-data";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiClient", () => {
  it("rewrites localhost API URLs to the current browser host for LAN testing", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue(null);
    vi.stubGlobal("window", {
      location: {
        hostname: "192.168.1.162",
        protocol: "http:",
      },
    } as unknown as Window);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.getCategories();

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://192.168.1.162:8000/api/categories");
  });

  it("rewrites 0.0.0.0 API URLs to localhost for loopback browser sessions", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        protocol: "http:",
      },
    } as unknown as Window);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ state: { is_complete: false } }), { status: 200 }));
    const client = createApiClient({
      baseUrl: "http://0.0.0.0:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.startOnboarding();

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/onboarding/start");
  });

  it("does not rewrite loopback API URLs in production mode", async () => {
    const calls: Array<Parameters<typeof fetch>> = [];
    vi.spyOn(auth, "getAccessToken").mockResolvedValue(null);
    vi.stubGlobal("window", {
      location: {
        hostname: "app.lifeos.money",
        protocol: "https:",
      },
    });
    const env = process.env as Record<string, string | undefined>;
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";

    const api = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: (async (...args: Parameters<typeof fetch>) => {
        calls.push(args);
        return new Response(JSON.stringify(sampleCategories), { status: 200 });
      }) as typeof fetch,
    });

    await api.getCategories();

    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/categories");
    env.NODE_ENV = originalNodeEnv;
  });

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
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
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

  it("throws when onboarding status cannot be loaded", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch,
    });

    await expect(client.startOnboarding()).rejects.toThrow("Request failed with 500");
  });

  it("updates obligations through the obligation patch endpoint", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "obligation-1",
          owner_id: "owner-1",
          created_at: "2026-03-27T00:00:00Z",
          updated_at: "2026-03-27T00:00:00Z",
          name: "Electric bill",
          amount: 94.21,
          due_on: "2026-03-30",
          frequency: "monthly",
          is_paid: false,
          is_recurring: true,
          notes: "Pay before rent.",
        }),
        { status: 200 },
      ),
    );
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.updateObligation("obligation-1", {
      amount: 94.21,
      due_on: "2026-03-30",
      frequency: "monthly",
      notes: "Pay before rent.",
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/obligations/obligation-1");
    expect(calls[0]?.[1]?.method).toBe("PATCH");
  });

  it("updates debts through the debt patch endpoint", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "debt-1",
          owner_id: "owner-1",
          created_at: "2026-03-27T00:00:00Z",
          updated_at: "2026-03-27T00:00:00Z",
          name: "Capital One",
          balance: 318.49,
          minimum_payment: 55,
          due_on: "2026-03-31",
          status: "active",
          notes: "No new spend.",
        }),
        { status: 200 },
      ),
    );
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.updateDebt("debt-1", {
      balance: 318.49,
      minimum_payment: 55,
      due_on: "2026-03-31",
      status: "active",
      notes: "No new spend.",
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/debts/debt-1");
    expect(calls[0]?.[1]?.method).toBe("PATCH");
  });

  it("throws when setup persistence fails", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch,
    });

    await expect(
      client.saveSetup({
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
    ).rejects.toThrow("Request failed with 500");

    await expect(client.completeOnboarding()).rejects.toThrow("Request failed with 500");
  });

  it("treats successful empty responses as null instead of throwing on JSON parsing", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch,
    });

    await expect(client.deleteAccount("account-1")).resolves.toBeUndefined();
  });

  it("confirms expected income through the dedicated confirm endpoint", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          income_entry: {
            id: "income-1",
            owner_id: "owner-1",
            created_at: "2026-03-26T00:00:00Z",
            updated_at: "2026-03-26T00:00:00Z",
            source_name: "Payroll",
            amount: 900,
            status: "received",
            expected_on: "2026-03-29",
            received_on: "2026-03-29",
            account_id: "account-1",
            notes: null,
          },
          transaction_id: "txn-1",
        }),
        { status: 200 },
      ),
    );
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.confirmIncomeEntry("income-1", { account_id: "account-1", received_on: "2026-03-29" });

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/income-entries/income-1/confirm");
    expect(calls[0]?.[1]?.method).toBe("POST");
    expect(calls[0]?.[1]?.body).toBe(JSON.stringify({ account_id: "account-1", received_on: "2026-03-29" }));
  });

  it("posts roadmap import v2 payloads to the roadmap import endpoint", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          goals_created: 1,
          steps_created: 2,
          income_plans_created: 1,
          allocations_created: 1,
          cash_reserves_created: 1,
          expected_income_entries_created: 1,
          obligations_created: 0,
          debts_created: 0,
          actions_created: 1,
        }),
        { status: 200 },
      ),
    );
    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.importRoadmapV2({
      version: 2,
      reset_planning_first: true,
      goals: [],
      income_plans: [],
      cash_reserves: [],
      expected_income_entries: [],
      obligations: [],
      debts: [],
      actions: [],
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/roadmap/import");
    expect(calls[0]?.[1]?.method).toBe("POST");
    expect(result.goals_created).toBe(1);
  });

  it("uses the typed accounts endpoints for CRUD", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "account-1",
            owner_id: "owner-1",
            created_at: "2026-03-26T00:00:00Z",
            updated_at: "2026-03-26T00:00:00Z",
            name: "Checking",
            type: "checking",
            institution: "Bank",
            balance: 1000,
            is_active: true,
            notes: null,
            linked_record_count: 0,
            can_delete: true,
          }),
          { status: 201 },
        );
      }
      if (init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            id: "account-1",
            owner_id: "owner-1",
            created_at: "2026-03-26T00:00:00Z",
            updated_at: "2026-03-26T00:00:00Z",
            name: "Main checking",
            type: "checking",
            institution: "Bank",
            balance: 1180,
            is_active: true,
            notes: null,
            linked_record_count: 0,
            can_delete: true,
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 204 });
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.createAccount({ name: "Checking", type: "checking", institution: "Bank", balance: 1000 });
    await client.updateAccount("account-1", { name: "Main checking", balance: 1180 });
    await client.deleteAccount("account-1");

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/accounts");
    expect(calls[0]?.[1]?.method).toBe("POST");
    expect(calls[1]?.[0]).toBe("http://localhost:8000/api/accounts/account-1");
    expect(calls[1]?.[1]?.method).toBe("PATCH");
    expect(calls[2]?.[0]).toBe("http://localhost:8000/api/accounts/account-1");
    expect(calls[2]?.[1]?.method).toBe("DELETE");
  });

  it("reads and writes typed app settings", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/settings") && (init?.method == null)) {
        return new Response(
          JSON.stringify([
            {
              id: "setting-1",
              owner_id: "owner-1",
              created_at: "2026-03-26T00:00:00Z",
              updated_at: "2026-03-26T00:00:00Z",
              key: "dashboard_show_momentum",
              value: "true",
            },
          ]),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          id: "setting-2",
          owner_id: "owner-1",
          created_at: "2026-03-26T00:00:00Z",
          updated_at: "2026-03-26T00:00:00Z",
          key: "dashboard_show_recent_updates",
          value: "false",
        }),
        { status: 200 },
      );
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const settings = await client.listSettings();
    await client.upsertSetting("dashboard_show_recent_updates", "false");

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(settings[0]?.key).toBe("dashboard_show_momentum");
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/settings");
    expect(calls[1]?.[0]).toBe("http://localhost:8000/api/settings/dashboard_show_recent_updates");
    expect(calls[1]?.[1]?.method).toBe("PUT");
    expect(calls[1]?.[1]?.body).toBe(JSON.stringify({ value: "false" }));
  });

  it("reads, revises, approves, and clears roadmap copilot drafts through the roadmap endpoints", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith("/roadmap/copilot/current")) {
        return new Response(JSON.stringify({ draft: null }), { status: 200 });
      }
      if (path.endsWith("/roadmap/copilot/draft")) {
        return new Response(
          JSON.stringify({
            draft_id: "draft-1",
            status: "draft",
            summary: "Refocus on rent and the next paycheck.",
            rationale: "Rent is due first.",
            warnings: [],
            preview: { goals: [], income_plans: [], actions: [], preserved_income_entries: 1 },
            payload: {
              version: 2,
              reset_planning_first: true,
              goals: [],
              income_plans: [],
              cash_reserves: [],
              expected_income_entries: [],
              obligations: [],
              debts: [],
              actions: [],
            },
            message: "Help me rework the roadmap.",
            planner_source: "copilot",
          }),
          { status: 200 },
        );
      }
      if (path.endsWith("/roadmap/copilot/revise")) {
        return new Response(
          JSON.stringify({
            draft_id: "draft-2",
            status: "draft",
            summary: "Utilities first, then rent.",
            rationale: "Utilities were raised in the revision note.",
            warnings: [],
            preview: { goals: [], income_plans: [], actions: [], preserved_income_entries: 1 },
            payload: {
              version: 2,
              reset_planning_first: true,
              goals: [],
              income_plans: [],
              cash_reserves: [],
              expected_income_entries: [],
              obligations: [],
              debts: [],
              actions: [],
            },
            message: "Revision applied.",
            planner_source: "copilot-revision",
          }),
          { status: 200 },
        );
      }
      if (path.endsWith("/roadmap/copilot/approve")) {
        return new Response(
          JSON.stringify({
            draft: {
              draft_id: "draft-2",
              status: "approved",
              summary: "Utilities first, then rent.",
              rationale: "Approved.",
              warnings: [],
              preview: { goals: [], income_plans: [], actions: [], preserved_income_entries: 1 },
              payload: {
                version: 2,
                reset_planning_first: true,
                goals: [],
                income_plans: [],
                cash_reserves: [],
                expected_income_entries: [],
                obligations: [],
                debts: [],
                actions: [],
              },
              message: "Revision applied.",
              planner_source: "copilot-revision",
            },
            import_result: {
              goals_created: 1,
              steps_created: 2,
              income_plans_created: 1,
              allocations_created: 2,
              cash_reserves_created: 0,
              expected_income_entries_created: 0,
              obligations_created: 0,
              debts_created: 0,
              actions_created: 2,
            },
          }),
          { status: 200 },
        );
      }
      if (path.endsWith("/roadmap/copilot/deny")) {
        return new Response(JSON.stringify({ draft: null }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const current = await client.getRoadmapCopilotCurrent();
    const draft = await client.createRoadmapCopilotDraft("Help me rework the roadmap.");
    const revised = await client.reviseRoadmapCopilotDraft("draft-1", "Put utilities first.");
    const approved = await client.approveRoadmapCopilotDraft("draft-2");
    const denied = await client.denyRoadmapCopilotDraft("draft-2");

    expect(current.draft).toBeNull();
    expect(draft.draft_id).toBe("draft-1");
    expect(revised.draft_id).toBe("draft-2");
    expect(approved.import_result.goals_created).toBe(1);
    expect(denied.draft).toBeNull();

    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/roadmap/copilot/current");
    expect(calls[1]?.[0]).toBe("http://localhost:8000/api/roadmap/copilot/draft");
    expect(calls[2]?.[0]).toBe("http://localhost:8000/api/roadmap/copilot/revise");
    expect(calls[3]?.[0]).toBe("http://localhost:8000/api/roadmap/copilot/approve");
    expect(calls[4]?.[0]).toBe("http://localhost:8000/api/roadmap/copilot/deny");
    const headers = calls[1]?.[1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer session-token");
  });

  it("normalizes sparse roadmap copilot draft responses", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/roadmap/copilot/draft")) {
        return new Response(
          JSON.stringify({
            draft_id: "draft-sparse",
            status: "draft",
            summary: "Sparse response",
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const draft = await client.createRoadmapCopilotDraft("Help me fill in paycheck plans.");

    expect(draft.draft_id).toBe("draft-sparse");
    expect(draft.preview.goals).toEqual([]);
    expect(draft.preview.income_plans).toEqual([]);
    expect(draft.payload.income_plans).toEqual([]);
    expect(draft.payload.actions).toEqual([]);
  });

  it("posts emergency expense replans through the roadmap copilot endpoint", async () => {
    vi.spyOn(auth, "getAccessToken").mockResolvedValue("session-token");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/roadmap/copilot/emergency-expense")) {
        return new Response(
          JSON.stringify({
            quick_add: {
              ok: true,
              transaction_id: "txn-1",
              obligation_id: null,
              income_entry_id: null,
            },
            draft: {
              draft_id: "draft-emergency",
              status: "draft",
              summary: "Rework the roadmap around the emergency hit.",
              rationale: "The transaction was recorded before replanning.",
              warnings: ["Available now is below zero at $25.00."],
              preview: { goals: [], income_plans: [], actions: [], preserved_income_entries: 1 },
              payload: {
                version: 2,
                reset_planning_first: true,
                goals: [],
                income_plans: [],
                cash_reserves: [],
                expected_income_entries: [],
                obligations: [],
                debts: [],
                actions: [],
              },
              message: "Car repair came in.",
              planner_source: "copilot-emergency",
            },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const client = createApiClient({
      baseUrl: "http://localhost:8000/api",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.submitRoadmapCopilotEmergencyExpense({
      message: "Car repair came in.",
      amount: 275,
      title: "Emergency car repair",
      merchant_or_source: "City Garage",
      category: "Auto",
      account: "Checking",
      date: "2026-03-26",
      notes: "Paid immediately.",
    });

    expect(response.quick_add.transaction_id).toBe("txn-1");
    expect(response.draft.draft_id).toBe("draft-emergency");
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    expect(calls[0]?.[0]).toBe("http://localhost:8000/api/roadmap/copilot/emergency-expense");
  });
});
