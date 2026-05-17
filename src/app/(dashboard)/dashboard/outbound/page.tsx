"use client";

import { useDashboardData } from "../_components/dashboard-provider";
import { OutboundTab } from "./_components/outbound-tab";

export default function OutboundPage() {
  const { semana, setSemana, empreendimentoIds } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <OutboundTab
        semana={semana}
        onSemanaChange={setSemana}
        empreendimentoIds={empreendimentoIds}
      />
    </div>
  );
}
