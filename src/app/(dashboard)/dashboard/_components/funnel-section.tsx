import {
  BarChart3,
  Building2,
  Coins,
  FolderOpen,
  Gem,
  Home,
  Percent,
  Radio,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { fmt, type FunnelNumbers, type PerformanceNumbers } from "./types";

type Accent = "blue" | "violet" | "amber" | "emerald" | "rose" | "sky";

type StatProps = {
  Icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  sub?: string;
  accent?: Accent;
};

function Kpi({ Icon, value, label, sub, accent }: StatProps) {
  return (
    <article className="kpi" data-accent={accent ?? ""}>
      <div className="kpi-head">
        <div className="icon-box">
          <Icon aria-hidden />
        </div>
        <span className="status-dot" aria-hidden />
      </div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </article>
  );
}

type Props = {
  real: FunnelNumbers;
  metaVendas: number;
  performance: PerformanceNumbers;
  loading?: boolean;
};

export function FunnelSection({ real, metaVendas, performance, loading = false }: Props) {
  /** Conversão lead → venda: vendas no período ÷ leads no período (mesmo período do funil). */
  const conversion = real.leads > 0 ? ((real.vendas / real.leads) * 100).toFixed(2) + "%" : "0%";
  const vendasHist = real.vendasAcumuladoHistorico ?? 0;
  const vendasPctHist = vendasHist > 0 ? Math.round((real.vendas / vendasHist) * 100) : 0;
  const vendasPctMeta = metaVendas > 0 ? Math.round((real.vendas / metaVendas) * 100) : 0;
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
  const ticketMedio = brl.format(performance.vgvMedio || 0);
  const vgvPeriodo = brl.format(performance.vgvPeriodo || 0);

  return (
    <>
      <div className="section-head">
        <div>
          <h2>
            <BarChart3 size={18} strokeWidth={2} /> Funil do período
          </h2>
          <div className="sh-sub">Volume e conversão por etapa</div>
        </div>
        <div className="sh-meta">
          {loading
            ? "Atualizando..."
            : `Período atual · ${real.leads.toLocaleString("pt-BR")} leads`}
        </div>
      </div>

      <div className="kpi-row">
        <Kpi
          Icon={Radio}
          value={fmt(real.leads)}
          label="Leads"
          sub="Captados no período"
          accent="blue"
        />
        <Kpi Icon={Home} value={fmt(real.visitas)} label="Visitas" sub="Ao stand" accent="violet" />
        <Kpi
          Icon={FolderOpen}
          value={fmt(real.pastas)}
          label="Pastas"
          sub="Em andamento"
          accent="amber"
        />
        <article className="kpi kpi-hero">
          <div className="kpi-head">
            <div className="icon-box">
              <Trophy aria-hidden strokeWidth={1.75} />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">
            {real.vendas}
            <span className="muted">/ {fmt(vendasHist || 0)}</span>
          </div>
          <div className="kpi-label">Vendas</div>
          <div className="kpi-sub">
            {vendasHist > 0
              ? `${vendasPctHist}% do histórico (Reservas) · meta ${metaVendas}: ${vendasPctMeta}%`
              : `${vendasPctMeta}% da meta (${metaVendas})`}
          </div>
        </article>
      </div>

      <div className="section-head">
        <div>
          <h2>
            <Zap size={18} strokeWidth={2} /> Performance
          </h2>
          <div className="sh-sub">Eficiência e capacidade do time</div>
        </div>
      </div>

      <div className="kpi-row">
        <Kpi
          Icon={Percent}
          value={conversion}
          label="Conversão lead → venda"
          sub="Vendas no período ÷ leads no período"
          accent="rose"
        />
        <Kpi
          Icon={Users}
          value={fmt(performance.corretores)}
          label="Corretores ativos"
          sub="Plantão + outbound"
        />
        <Kpi
          Icon={Gem}
          value={ticketMedio}
          label="Ticket médio"
          sub="VGV por unidade"
          accent="emerald"
        />
        <Kpi
          Icon={Coins}
          value={vgvPeriodo}
          label="VGV no período"
          sub="Valor geral de vendas"
          accent="sky"
        />
      </div>
    </>
  );
}

// Re-exports for convenience
export { Building2 };
