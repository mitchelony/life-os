"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type BackendDecisionAction, type BackendDecisionSnapshot } from "@/lib/api";
import { clearStoredAuthSession } from "@/lib/auth";

export type DecisionAction = {
  id: string;
  title: string;
  detail?: string;
  status: string;
  lane: string;
  source: string;
  dueOn?: string;
  linkedType?: string;
  linkedId?: string;
};

export type DecisionSnapshot = {
  generatedAt: string;
  focus: {
    primaryAction: DecisionAction | null;
    secondaryAction: DecisionAction | null;
    whyNow: string;
  };
  orderedActionQueue: DecisionAction[];
  roadmap: {
    goals: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      targetDate?: string;
      progress: number;
      linkedType?: string;
      linkedId?: string;
      metricKind?: string;
      metricStartValue?: number;
      metricCurrentValue?: number;
      metricTargetValue?: number;
      steps: DecisionAction[];
    }>;
    plans: Array<{
      id: string;
      label: string;
      amount: number;
      expectedOn?: string;
      isReliable: boolean;
      status: string;
      allocations: Array<{
        id: string;
        label: string;
        allocationType: string;
        amount: number;
        linkedType?: string;
        linkedId?: string;
      }>;
    }>;
  };
  cashflow: {
    trailing30Inflow: number;
    trailing30Outflow: number;
    trailing30Net: number;
    next14PlannedInflow: number;
    next14RequiredOutflow: number;
    nextIncomeDate?: string;
    nextPressurePoint?: string;
  };
  recentUpdates: Array<{
    id: string;
    eventType: string;
    title: string;
    detail?: string;
    amount?: number;
    occurredAt: string;
    linkedType?: string;
    linkedId?: string;
  }>;
  progress: {
    freeNow: number;
    freeAfterPlannedIncome: number;
    totalDebt: number;
    overdueCount: number;
    completedActions7d: number;
    goalCompletionRate: number;
    sevenDay: {
      direction: "forward" | "backward" | "steady";
      freeNowDelta: number;
      freeAfterPlannedIncomeDelta: number;
      totalDebtDelta: number;
      overdueDelta: number;
      completedActionsDelta: number;
    };
    thirtyDay: {
      direction: "forward" | "backward" | "steady";
      freeNowDelta: number;
      freeAfterPlannedIncomeDelta: number;
      totalDebtDelta: number;
      overdueDelta: number;
      completedActionsDelta: number;
    };
  };
  freeNow: {
    amount: number;
    breakdown: BackendDecisionSnapshot["free_now"]["breakdown"];
  };
  freeAfterPlannedIncome: {
    amount: number;
    breakdown: BackendDecisionSnapshot["free_after_planned_income"]["breakdown"];
  };
};

const changedEvent = "lifeos:decision-changed";

export function shouldResetAuthSession(error: unknown) {
  return error instanceof Error && error.message.includes("401");
}

function normalizeAction(action?: BackendDecisionAction | null): DecisionAction | null {
  if (!action) return null;
  return {
    id: action.id,
    title: action.title,
    detail: action.detail ?? undefined,
    status: action.status,
    lane: action.lane,
    source: action.source,
    dueOn: action.due_on ?? undefined,
    linkedType: action.linked_type ?? undefined,
    linkedId: action.linked_id ?? undefined,
  };
}

export function normalizeDecisionSnapshot(payload: BackendDecisionSnapshot): DecisionSnapshot {
  return {
    generatedAt: payload.generated_at,
    focus: {
      primaryAction: normalizeAction(payload.focus.primary_action),
      secondaryAction: normalizeAction(payload.focus.secondary_action),
      whyNow: payload.focus.why_now,
    },
    orderedActionQueue: payload.ordered_action_queue.map((item) => normalizeAction(item)!).filter(Boolean),
    roadmap: {
      goals: payload.roadmap_summary.goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        priority: goal.priority,
        targetDate: goal.target_date ?? undefined,
        progress: goal.progress,
        linkedType: goal.linked_type ?? undefined,
        linkedId: goal.linked_id ?? undefined,
        metricKind: goal.metric_kind ?? undefined,
        metricStartValue: goal.metric_start_value ?? undefined,
        metricCurrentValue: goal.metric_current_value ?? undefined,
        metricTargetValue: goal.metric_target_value ?? undefined,
        steps: goal.steps.map((step) => normalizeAction(step)!).filter(Boolean),
      })),
      plans: payload.roadmap_summary.plans.map((plan) => ({
        id: plan.id,
        label: plan.label,
        amount: plan.amount,
        expectedOn: plan.expected_on ?? undefined,
        isReliable: plan.is_reliable,
        status: plan.status,
        allocations: plan.allocations.map((allocation) => ({
          id: allocation.id,
          label: allocation.label,
          allocationType: allocation.allocation_type,
          amount: allocation.amount,
          linkedType: allocation.linked_type ?? undefined,
          linkedId: allocation.linked_id ?? undefined,
        })),
      })),
    },
    cashflow: {
      trailing30Inflow: payload.cashflow_glance.trailing_30_inflow,
      trailing30Outflow: payload.cashflow_glance.trailing_30_outflow,
      trailing30Net: payload.cashflow_glance.trailing_30_net,
      next14PlannedInflow: payload.cashflow_glance.next_14_planned_inflow,
      next14RequiredOutflow: payload.cashflow_glance.next_14_required_outflow,
      nextIncomeDate: payload.cashflow_glance.next_income_date ?? undefined,
      nextPressurePoint: payload.cashflow_glance.next_pressure_point ?? undefined,
    },
    recentUpdates: payload.recent_updates.map((item) => ({
      id: item.id,
      eventType: item.event_type,
      title: item.title,
      detail: item.detail ?? undefined,
      amount: item.amount ?? undefined,
      occurredAt: item.occurred_at,
      linkedType: item.linked_type ?? undefined,
      linkedId: item.linked_id ?? undefined,
    })),
    progress: {
      freeNow: payload.progress_summary.free_now,
      freeAfterPlannedIncome: payload.progress_summary.free_after_planned_income,
      totalDebt: payload.progress_summary.total_debt,
      overdueCount: payload.progress_summary.overdue_count,
      completedActions7d: payload.progress_summary.completed_actions_7d,
      goalCompletionRate: payload.progress_summary.goal_completion_rate,
      sevenDay: {
        direction: payload.progress_summary.seven_day.direction,
        freeNowDelta: payload.progress_summary.seven_day.free_now_delta,
        freeAfterPlannedIncomeDelta: payload.progress_summary.seven_day.free_after_planned_income_delta,
        totalDebtDelta: payload.progress_summary.seven_day.total_debt_delta,
        overdueDelta: payload.progress_summary.seven_day.overdue_delta,
        completedActionsDelta: payload.progress_summary.seven_day.completed_actions_delta,
      },
      thirtyDay: {
        direction: payload.progress_summary.thirty_day.direction,
        freeNowDelta: payload.progress_summary.thirty_day.free_now_delta,
        freeAfterPlannedIncomeDelta: payload.progress_summary.thirty_day.free_after_planned_income_delta,
        totalDebtDelta: payload.progress_summary.thirty_day.total_debt_delta,
        overdueDelta: payload.progress_summary.thirty_day.overdue_delta,
        completedActionsDelta: payload.progress_summary.thirty_day.completed_actions_delta,
      },
    },
    freeNow: payload.free_now,
    freeAfterPlannedIncome: payload.free_after_planned_income,
  };
}

export function notifyDecisionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(changedEvent));
}

export function useDecisionSnapshot() {
  const [snapshot, setSnapshot] = useState<DecisionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      setLoading(true);
      try {
        const payload = await api.getDecisionSnapshot();
        if (!cancelled && payload) {
          setSnapshot(normalizeDecisionSnapshot(payload));
        }
      } catch (error) {
        if (shouldResetAuthSession(error)) {
          clearStoredAuthSession();
        }
        if (!cancelled) {
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void sync();
    const onChange = () => {
      void sync();
    };
    window.addEventListener(changedEvent, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(changedEvent, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, []);

  return useMemo(
    () => ({
      snapshot,
      loading,
      refresh: async () => {
        try {
          const payload = await api.getDecisionSnapshot();
          if (payload) {
            setSnapshot(normalizeDecisionSnapshot(payload));
          }
        } catch (error) {
          if (shouldResetAuthSession(error)) {
            clearStoredAuthSession();
          }
          setSnapshot(null);
        }
      },
    }),
    [loading, snapshot],
  );
}
