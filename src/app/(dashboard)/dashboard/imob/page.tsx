"use client";

import { useDashboardData } from "../_components/dashboard-provider";
import { ImobTab } from "./_components/imob-tab";

export default function ImobPage() {
  const { empreendimentoIds } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <ImobTab empreendimentoIds={empreendimentoIds} />
    </div>
  );
}
