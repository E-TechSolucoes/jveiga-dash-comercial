"use client";

import { useDashboardData } from "../_components/dashboard-provider";
import { AuditoriaTab } from "./_components/auditoria-tab";

export default function AuditoriaPage() {
  const { empreendimentoIds } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <AuditoriaTab key={empreendimentoIds.join(",")} empreendimentoIds={empreendimentoIds} />
    </div>
  );
}
