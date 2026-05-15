"use client";

import { ArsenalTab } from "./_components/arsenal-tab";
import { useDashboardData } from "../_components/dashboard-provider";

export default function ArsenalPage() {
  const { semana, setSemana, empreendimentoIds } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <ArsenalTab
        semana={semana}
        onSemanaChange={setSemana}
        empreendimentoIds={empreendimentoIds}
      />
    </div>
  );
}
