"use client";

import { Copy, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button, Panel, SectionHeading, Textarea } from "@/components/ui";
import { api } from "@/lib/api";

export function ContextExportPanel() {
  const [pending, setPending] = useState(false);
  const [payload, setPayload] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadExport(copyToClipboard = false) {
    setPending(true);
    setCopied(false);
    try {
      const data = await api.getPlanningContextExport();
      const nextPayload = JSON.stringify(data, null, 2);
      setPayload(nextPayload);
      if (copyToClipboard) {
        await navigator.clipboard.writeText(nextPayload);
        setCopied(true);
      }
    } finally {
      setPending(false);
    }
  }

  async function copyExport() {
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
  }

  function downloadExport() {
    if (!payload) return;
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "life-os-context-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel className="space-y-4">
      <SectionHeading
        eyebrow="Planning context"
        title="Export your current planning data"
        description="Generate exact ids, statuses, and allowed values when you want to review or reshape the plan outside this page."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={pending} onClick={() => void loadExport(true)}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied data" : "Generate + copy"}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => void loadExport()}>
              <RefreshCw className="h-4 w-4" />
              {payload ? "Refresh export" : "Show export"}
            </Button>
            <Button variant="ghost" disabled={!payload} onClick={() => void copyExport()}>
              <Copy className="h-4 w-4" />
              Copy again
            </Button>
            <Button variant="ghost" disabled={!payload} onClick={downloadExport}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        }
      />
      <Textarea
        rows={18}
        value={payload}
        readOnly
        placeholder="Generate the export to review the current accounts, debts, bills, expected income, actions, roadmap ids, and allowed values."
        className="font-mono text-xs leading-6"
      />
    </Panel>
  );
}
