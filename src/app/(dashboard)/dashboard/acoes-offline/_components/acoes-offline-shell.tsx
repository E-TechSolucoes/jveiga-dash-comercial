"use client";

import { useDashboardData } from "../../_components/dashboard-provider";
import { AcoesOfflineTab, type SubTabId } from "./acoes-offline-tab";

type Props = {
  initialSub: SubTabId;
};

export function AcoesOfflineShell({ initialSub }: Props) {
  const { semana, setSemana, empreendimentoIds } = useDashboardData();

  return (
    <div className="tc" data-active="true">
      <AcoesOfflineTab
        key={initialSub}
        initialSub={initialSub}
        semana={semana}
        onSemanaChange={setSemana}
        empreendimentoIds={empreendimentoIds}
      />
    </div>
  );
}
