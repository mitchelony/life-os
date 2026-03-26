import { describe, expect, it } from "vitest";
import {
  createStoredAccountDraft,
  hasStoredAccountReferences,
  removeStoredAccountDraft,
  renameStoredAccountReferences,
  updateStoredAccountDraft,
} from "./account-management";
import type { StoredAccountDraft } from "./local-state";

describe("account management helpers", () => {
  it("creates a new blank checking account draft by default", () => {
    const draft = createStoredAccountDraft();

    expect(draft).toMatchObject({
      name: "",
      institution: "",
      type: "checking",
      balance: "0.00",
    });
    expect(draft.id).toBeTruthy();
  });

  it("updates just the requested account fields", () => {
    const accounts: StoredAccountDraft[] = [
      {
        id: "acct-1",
        name: "Wells Fargo Checking",
        institution: "Wells Fargo",
        type: "checking",
        balance: "1200.00",
      },
      {
        id: "acct-2",
        name: "Capital One",
        institution: "Capital One",
        type: "credit_card",
        balance: "498.28",
      },
    ];

    const next = updateStoredAccountDraft(accounts, "acct-2", {
      name: "Capital One Credit Card",
      balance: "450.00",
    });

    expect(next).toEqual([
      accounts[0],
      {
        ...accounts[1],
        name: "Capital One Credit Card",
        balance: "450.00",
      },
    ]);
  });

  it("removes the requested account by id", () => {
    const accounts: StoredAccountDraft[] = [
      {
        id: "acct-1",
        name: "Wells Fargo Checking",
        institution: "Wells Fargo",
        type: "checking",
        balance: "1200.00",
      },
      {
        id: "acct-2",
        name: "Capital One",
        institution: "Capital One",
        type: "credit_card",
        balance: "498.28",
      },
    ];

    expect(removeStoredAccountDraft(accounts, "acct-1")).toEqual([accounts[1]]);
  });

  it("renames linked transaction and linked-account references when an account name changes", () => {
    const nextSetup = renameStoredAccountReferences(
      {
        displayName: "Mitchel",
        protectedBuffer: "0",
        essentialTarget: "0",
        savingsFloor: "0",
        notes: "",
        accounts: [
          {
            id: "acct-1",
            name: "Wells Fargo Checking",
            institution: "Wells Fargo",
            type: "checking",
            balance: "1200.00",
          },
        ],
        obligations: [
          {
            id: "obl-1",
            name: "Rent",
            amount: "600.00",
            dueDate: "2026-04-01",
            recurrence: "monthly",
            linkedAccount: "Wells Fargo Checking",
          },
        ],
        debts: [],
        income: [
          {
            id: "inc-1",
            source: "Payroll",
            expectedAmount: "2500.00",
            dueDate: "2026-04-05",
            recurrence: "biweekly",
            linkedAccount: "Wells Fargo Checking",
          },
        ],
        transactions: [
          {
            id: "tx-1",
            kind: "expense",
            title: "Groceries",
            amount: "50.00",
            date: "2026-03-25",
            account: "Wells Fargo Checking",
            counterparty: "Trader Joe's",
            category: "Food",
          },
        ],
        manualTasks: [],
        taskOverrides: [],
        roadmapItems: [],
        strategyDocument: null,
      },
      "Wells Fargo Checking",
      "WF Main Checking",
    );

    expect(nextSetup.obligations[0]?.linkedAccount).toBe("WF Main Checking");
    expect(nextSetup.income[0]?.linkedAccount).toBe("WF Main Checking");
    expect(nextSetup.transactions[0]?.account).toBe("WF Main Checking");
  });

  it("detects when an account still has linked data", () => {
    expect(
      hasStoredAccountReferences(
        {
          displayName: "Mitchel",
          protectedBuffer: "0",
          essentialTarget: "0",
          savingsFloor: "0",
          notes: "",
          accounts: [],
          obligations: [],
          debts: [],
          income: [],
          transactions: [
            {
              id: "tx-1",
              kind: "expense",
              title: "Groceries",
              amount: "50.00",
              date: "2026-03-25",
              account: "Wells Fargo Checking",
              counterparty: "Trader Joe's",
              category: "Food",
            },
          ],
          manualTasks: [],
          taskOverrides: [],
          roadmapItems: [],
          strategyDocument: null,
        },
        "Wells Fargo Checking",
      ),
    ).toBe(true);
  });
});
