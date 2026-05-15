"use client";

import { CheckTab } from "./_components/check-tab";
import { useDashboardData } from "../_components/dashboard-provider";

export default function ChecklistPage() {
  const { comercialName, empreendimentoIds } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <CheckTab comercialName={comercialName} empreendimentoIds={empreendimentoIds} />
    </div>
  );
}
