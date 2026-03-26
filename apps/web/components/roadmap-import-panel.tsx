"use client";

import { Check, Download, Upload } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Panel, SectionHeading, Textarea } from "@/components/ui";
import { api, type BackendRoadmapImportV2Result } from "@/lib/api";
import { parseRoadmapImportV2, roadmapImportV2Template } from "@/lib/roadmap-import-v2";

const allowedValues = {
  goal_categories: ["finances", "school", "career", "admin", "health", "personal"],
  goal_statuses: ["active", "planned", "blocked", "completed"],
  step_statuses: ["todo", "in_progress", "blocked", "done"],
  linked_types: ["obligation", "debt", "income", "manual", "account"],
  income_plan_statuses: ["planned", "cancelled", "received"],
  income_allocation_types: ["obligation_payment", "debt_payment", "buffer", "essentials", "manual"],
  allocation_statuses: ["planned", "reserved", "paid", "skipped", "changed"],
  cash_reserve_purpose_types: ["taxes", "buffer", "debt", "utilities", "essentials", "custom"],
  income_statuses: ["expected", "received", "missed"],
} as const;

export function RoadmapImportPanel({ onImported }: { onImported: () => Promise<void> }) {
  const [payload, setPayload] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackendRoadmapImportV2Result | null>(null);

  async function importPayload() {
    if (!payload.trim()) {
      setError("Paste roadmap JSON first.");
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const parsed = parseRoadmapImportV2(payload);
      const nextResult = await api.importRoadmapV2(parsed);
      setResult(nextResult);
      await onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([roadmapImportV2Template], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "life-os-roadmap-template-v2.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel className="space-y-4">
      <SectionHeading
        eyebrow="Bulk import"
        title="Paste a roadmap setup in one shot"
        description="Schema v2 accepts goals, steps, income plans, allocations, cash reserves, expected income, obligations, debts, and actions in one GPT-friendly payload."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPayload(roadmapImportV2Template);
                setError(null);
                setResult(null);
              }}
            >
              Load v2 template
            </Button>
            <Button variant="ghost" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download template
            </Button>
          </div>
        }
      />

      <Textarea
        rows={18}
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        placeholder='Paste roadmap import v2 JSON. Example: { "version": 2, "reset_planning_first": true, "goals": [], "income_plans": [], "cash_reserves": [], "expected_income_entries": [], "obligations": [], "debts": [], "actions": [] }'
        className="font-mono text-xs leading-6"
      />

      <div className="flex flex-wrap gap-2">
        <Badge>goal categories: {allowedValues.goal_categories.join(", ")}</Badge>
        <Badge>goal statuses: {allowedValues.goal_statuses.join(", ")}</Badge>
        <Badge>step statuses: {allowedValues.step_statuses.join(", ")}</Badge>
        <Badge>plan statuses: {allowedValues.income_plan_statuses.join(", ")}</Badge>
        <Badge>allocation statuses: {allowedValues.allocation_statuses.join(", ")}</Badge>
        <Badge>linked types: {allowedValues.linked_types.join(", ")}</Badge>
      </div>

      <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.8)] p-4">
        <p className="text-sm font-medium text-ink">Strict top-level shape</p>
        <pre className="mt-3 overflow-x-auto text-xs leading-6 text-muted">{`{
  "version": 2,
  "reset_planning_first": true,
  "goals": [...],
  "income_plans": [...],
  "cash_reserves": [...],
  "expected_income_entries": [...],
  "obligations": [...],
  "debts": [...],
  "actions": [...]
}`}</pre>
        <p className="mt-3 text-sm leading-6 text-muted">
          Use the context export first so GPT works with exact live ids. Smart quotes from pasted GPT output are normalized before parsing.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Top-level debt, obligation, and expected-income temp ids can be resolved when you provide <code>temp_id</code>. If you want to keep your
          current debt and obligation ids instead of recreating those rows, leave top-level <code>debts</code> and <code>obligations</code> empty.
        </p>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-[rgba(165,57,42,0.2)] bg-[rgba(165,57,42,0.06)] px-4 py-3 text-sm text-ink">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-[18px] border border-[rgba(61,111,94,0.18)] bg-[rgba(61,111,94,0.08)] px-4 py-3 text-sm text-ink">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 text-accent" />
            <div className="space-y-1">
              <p className="font-medium">Import complete</p>
              <p className="text-muted">
                {result.goals_created} goals, {result.steps_created} steps, {result.income_plans_created} income plans,{" "}
                {result.allocations_created} allocations, {result.cash_reserves_created} reserves, and{" "}
                {result.expected_income_entries_created} expected income entries imported.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || !payload.trim()} onClick={() => void importPayload()}>
          <Upload className="h-4 w-4" />
          {pending ? "Importing..." : "Import roadmap JSON"}
        </Button>
      </div>
    </Panel>
  );
}
