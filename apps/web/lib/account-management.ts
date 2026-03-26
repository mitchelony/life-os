import type { StoredAccountDraft, StoredLifeOsSetup } from "./local-state";

function createDraftId() {
  return `acct-${Math.random().toString(36).slice(2, 10)}`;
}

export function createStoredAccountDraft(overrides: Partial<StoredAccountDraft> = {}): StoredAccountDraft {
  return {
    id: overrides.id ?? createDraftId(),
    name: overrides.name ?? "",
    institution: overrides.institution ?? "",
    type: overrides.type ?? "checking",
    balance: overrides.balance ?? "0.00",
  };
}

export function updateStoredAccountDraft(
  accounts: StoredAccountDraft[],
  accountId: string,
  patch: Partial<StoredAccountDraft>,
) {
  return accounts.map((account) => (account.id === accountId ? { ...account, ...patch, id: account.id } : account));
}

export function removeStoredAccountDraft(accounts: StoredAccountDraft[], accountId: string) {
  return accounts.filter((account) => account.id !== accountId);
}

export function renameStoredAccountReferences(
  setup: StoredLifeOsSetup,
  previousName: string,
  nextName: string,
): StoredLifeOsSetup {
  if (!previousName.trim() || previousName === nextName) return setup;

  return {
    ...setup,
    obligations: setup.obligations.map((item) =>
      item.linkedAccount === previousName
        ? {
            ...item,
            linkedAccount: nextName,
          }
        : item,
    ),
    income: setup.income.map((item) =>
      item.linkedAccount === previousName
        ? {
            ...item,
            linkedAccount: nextName,
          }
        : item,
    ),
    transactions: setup.transactions.map((item) =>
      item.account === previousName
        ? {
            ...item,
            account: nextName,
          }
        : item,
    ),
  };
}

export function hasStoredAccountReferences(setup: StoredLifeOsSetup, accountName: string) {
  return (
    setup.transactions.some((item) => item.account === accountName) ||
    setup.obligations.some((item) => item.linkedAccount === accountName) ||
    setup.income.some((item) => item.linkedAccount === accountName)
  );
}
