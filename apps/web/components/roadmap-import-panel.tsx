"use client";

import { Check, Download, Upload } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Panel, SectionHeading, Textarea } from "@/components/ui";
import { api, type BackendRoadmapImportResult } from "@/lib/api";
import {
  parseRoadmapImportPayload,
  roadmapImportAllowedValues,
  roadmapImportTemplate,
} from "@/lib/roadmap-import";

export function RoadmapImportPanel({ onImported }: { onImported: () => Promise<void> }) {
  const [payload, setPayload] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackendRoadmapImportResult | null>(null);

  async function importPayload() {
    if (!payload.trim()) {
      setError("Paste roadmap JSON first.");
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const parsed = parseRoadmapImportPayload(payload);
      const nextResult = await api.importRoadmap(parsed);
      setResult(nextResult);
      await onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([roadmapImportTemplate], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "life-os-roadmap-template.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel className="space-y-4">
      <SectionHeading
        eyebrow="Bulk import"
        title="Paste a full roadmap setup in one shot"
        description="Use real debt and obligation ids from the GPT context export, then import goals, steps, paycheck plans, and allocations without entering them one by one."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPayload(roadmapImportTemplate);
                setError(null);
                setResult(null);
              }}
            >
              Load template
            </Button>
            <Button variant="ghost" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download template
            </Button>
          </div>
        }
      />

      <Textarea
        rows={16}
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        placeholder='Paste JSON that matches the roadmap import schema. Example: { "reset_planning_first": true, "goals": [], "income_plans": [] }'
        className="font-mono text-xs leading-6"
      />

      <div className="flex flex-wrap gap-2">
        <Badge>goal statuses: {roadmapImportAllowedValues.goal_statuses.join(", ")}</Badge>
        <Badge>step statuses: {roadmapImportAllowedValues.step_statuses.join(", ")}</Badge>
        <Badge>plan statuses: {roadmapImportAllowedValues.income_plan_statuses.join(", ")}</Badge>
        <Badge>allocation types: {roadmapImportAllowedValues.allocation_types.join(", ")}</Badge>
        <Badge>linked types: {roadmapImportAllowedValues.linked_types.join(", ")}</Badge>
      </div>

      <div className="rounded-[20px] border border-line bg-[rgba(244,241,233,0.8)] p-4">
        <p className="text-sm font-medium text-ink">Strict top-level shape</p>
        <pre className="mt-3 overflow-x-auto text-xs leading-6 text-muted">{`{
  "version": 1,
  "reset_planning_first": true,
  "goals": [...],
  "income_plans": [...]
}`}</pre>
        <p className="mt-3 text-sm leading-6 text-muted">
          Keep ids exact. Use the current export in Settings when you want GPT to draft updates against live debt and
          obligation records.
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
                {result.goals_created} goals, {result.steps_created} steps, {result.income_plans_created} paycheck plans,
                and {result.allocations_created} allocations imported.
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
