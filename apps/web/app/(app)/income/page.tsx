"use client";

import { ExpectedIncomeManager } from "@/components/expected-income-manager";
import { Panel, SectionHeading } from "@/components/ui";

export default function IncomePage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4 pb-24 md:space-y-6 md:pb-6">
      <Panel className="overflow-hidden bg-[linear-gradient(135deg,rgba(15,28,22,0.97),rgba(64,105,89,0.94))] text-bg">
        <SectionHeading
          eyebrow="Income"
          title="Track expected money before it lands"
          description="Keep upcoming paychecks, deposits, refunds, and support in one place, then confirm them into real income when they hit."
          tone="inverse"
        />
      </Panel>

      <ExpectedIncomeManager />
    </div>
  );
}
