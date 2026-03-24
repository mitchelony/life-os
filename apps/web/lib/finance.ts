import type { Account, AvailableSpendBreakdown, DashboardSnapshot, Debt, IncomeItem, Obligation } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

export function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(value))}`;
}

export function money(value: number) {
  return Number(value.toFixed(2));
}

export function getLiquidCash(accounts: Account[]) {
  return money(
    accounts
      .filter((account) => account.active && (account.type === "checking" || account.type === "savings" || account.type === "cash"))
      .reduce((sum, account) => sum + account.balance, 0),
  );
}

export function getTotalCash(accounts: Account[]) {
  return money(
    accounts
      .filter((account) => account.active && (account.type === "checking" || account.type === "savings" || account.type === "cash"))
      .reduce((sum, account) => sum + account.balance, 0),
  );
}

export function getCreditCardBalance(accounts: Account[]) {
  return money(
    accounts
      .filter((account) => account.active && account.type === "credit_card")
      .reduce((sum, account) => sum + Math.abs(account.balance), 0),
  );
}

export function getUpcomingIncomeTotal(snapshot: DashboardSnapshot) {
  return money(snapshot.upcomingIncome.filter((income) => income.status === "expected").reduce((sum, item) => sum + item.amount, 0));
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isOnOrBeforeHorizon(dueDate: string, horizonDate: string) {
  return new Date(dueDate).getTime() <= new Date(horizonDate).getTime();
}

function isExpectedOnOrAfterToday(dueDate: string) {
  return new Date(dueDate).getTime() >= startOfToday().getTime();
}

export function computeAvailableSpend(input: {
  accounts: Account[];
  obligations: Obligation[];
  debts: Debt[];
  upcomingIncome: IncomeItem[];
  protectedCashBuffer: number;
  manualReserves: number;
  essentialSpendRemaining: number;
  nextIncomeDate: string;
}): AvailableSpendBreakdown {
  const liquidCash = getLiquidCash(input.accounts);
  const obligationsDueBeforeNextIncome = money(
    input.obligations
      .filter((obligation) => obligation.status !== "paid" && isOnOrBeforeHorizon(obligation.dueDate, input.nextIncomeDate))
      .reduce((sum, obligation) => sum + obligation.amount, 0),
  );
  const debtMinimumsDueBeforeNextIncome = money(
    input.debts
      .filter((debt) => isOnOrBeforeHorizon(debt.dueDate, input.nextIncomeDate))
      .reduce((sum, debt) => sum + debt.minimumPayment, 0),
  );
  const reliableIncomeBeforeNextIncome = money(
    input.upcomingIncome
      .filter((income) => income.status === "expected")
      .filter((income) => isExpectedOnOrAfterToday(income.dueDate))
      .filter((income) => isOnOrBeforeHorizon(income.dueDate, input.nextIncomeDate))
      .reduce((sum, income) => sum + income.amount, 0),
  );
  const protectedCashBuffer = money(input.protectedCashBuffer);
  const manualReserves = money(input.manualReserves);
  const essentialSpendRemaining = money(input.essentialSpendRemaining);
  const availableNow = money(
    liquidCash -
      protectedCashBuffer -
      manualReserves -
      obligationsDueBeforeNextIncome -
      debtMinimumsDueBeforeNextIncome -
      essentialSpendRemaining,
  );

  return {
    liquidCash,
    reliableIncomeBeforeNextIncome,
    protectedCashBuffer,
    manualReserves,
    obligationsDueBeforeNextIncome,
    debtMinimumsDueBeforeNextIncome,
    essentialSpendRemaining,
    strategyAllocations: [],
    strategyDebtExtraPayments: [],
    strategyObligationInstallments: [],
    availableNow,
    availableThroughNextIncome: money(availableNow + reliableIncomeBeforeNextIncome),
  };
}
