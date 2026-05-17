"use client";

import { useDashboardData } from "../_components/dashboard-provider";
import { RecepTab } from "./_components/recep-tab";

export default function RecepPage() {
  const { empresasKey, empresasNomes } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <RecepTab key={empresasKey} empreendimentosNomes={empresasNomes} />
    </div>
  );
}
