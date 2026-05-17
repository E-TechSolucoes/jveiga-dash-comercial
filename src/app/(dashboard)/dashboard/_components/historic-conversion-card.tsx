"use client";

import { ChevronDown, ChevronUp, History, Info, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { useConversaoHistorica } from "@/hooks/use-dashboard";

type Props = {
  codigoInterno: string;
  nomeSelecionado: string;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

function ConversionErrorCard({ nome, message }: { nome: string; message: string }) {
  return (
    <section className="historic-conv historic-conv--empty" aria-label="Conversão histórica">
      <div className="historic-conv-head">
        <div className="historic-conv-title">
          <span className="historic-conv-ico" aria-hidden>
            <History size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="historic-conv-h1">Conversão histórica (lead → visita)</div>
            <div className="historic-conv-sub">{nome}</div>
          </div>
        </div>
      </div>
      <p className="historic-conv-msg">{message}</p>
    </section>
  );
}

export function HistoricConversionCard({ codigoInterno, nomeSelecionado }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const codigo = codigoInterno.startsWith("sem-codigo-") ? "" : codigoInterno;
  const query = useConversaoHistorica(codigo, codigoInterno ? nomeSelecionado : "");

  const data = query.data;
  const resumo = useMemo(() => {
    const rows = data?.por_mes;
    if (!rows || rows.length === 0) return null;
    const ultimo = rows[rows.length - 1];
    return {
      L: ultimo.leads_acumulado,
      V: ultimo.visitas_acumulado,
      taxa: ultimo.taxa_conversao_acumulada_pct,
    };
  }, [data]);

  if (!codigoInterno) {
    return <ConversionErrorCard nome={nomeSelecionado} message="Selecione um empreendimento." />;
  }

  if (query.isLoading) {
    return <HistoricConversionSkeleton />;
  }

  if (query.isError || !data || !Array.isArray(data.por_mes)) {
    return (
      <ConversionErrorCard
        nome={nomeSelecionado}
        message={
          query.isError ? "Não foi possível carregar os dados." : "Dados em formato inesperado."
        }
      />
    );
  }

  const { meta, por_mes } = data;
  const nome = meta.empreendimento ?? nomeSelecionado;
  const mesesTabela = [...por_mes].reverse();

  return (
    <section className="historic-conv" aria-label="Conversão histórica lead para visita">
      <div className="historic-conv-head">
        <div className="historic-conv-title">
          <span className="historic-conv-ico" aria-hidden>
            <History size={18} strokeWidth={2} />
          </span>
          <div>
            <div className="historic-conv-h1">Conversão histórica (lead → visita)</div>
            <div className="historic-conv-sub">
              {nome} · acumulado desde o primeiro cadastro na base
            </div>
            {typeof meta.meses_com_lead === "number" && meta.meses_com_lead > 0 && (
              <div className="historic-conv-sub">
                Base da média histórica: {meta.meses_com_lead} meses com lead
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="historic-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-controls="historic-conv-body"
        >
          {collapsed ? (
            <>
              <ChevronDown size={16} strokeWidth={2} aria-hidden /> Expandir
            </>
          ) : (
            <>
              <ChevronUp size={16} strokeWidth={2} aria-hidden /> Recolher
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div id="historic-conv-body">
          <p className="historic-conv-lead">
            Série histórica calculada direto no banco, com regra de lead único (1 lead por idlead no
            mês do primeiro cadastro), para mostrar a evolução da conversão lead → visita.
          </p>

          {resumo && (
            <div className="historic-kpis">
              <div className="historic-kpi">
                <span className="historic-kpi-lbl">Leads no período</span>
                <span className="historic-kpi-val">{fmt(resumo.L)}</span>
                <span className="historic-kpi-hint">leads únicos por empreendimento</span>
              </div>
              <div className="historic-kpi">
                <span className="historic-kpi-lbl">Visitas no período</span>
                <span className="historic-kpi-val">{fmt(resumo.V)}</span>
                <span className="historic-kpi-hint">na tabela de visitas</span>
              </div>
              <div className="historic-kpi historic-kpi--accent">
                <span className="historic-kpi-lbl">Taxa acumulada</span>
                <span className="historic-kpi-val">{fmtPct(resumo.taxa)}</span>
                <span className="historic-kpi-hint">
                  visitas ÷ leads (até o último mês com dado)
                </span>
              </div>
            </div>
          )}

          <div className="historic-table-wrap">
            <div className="historic-table-cap">
              <TrendingUp size={15} strokeWidth={2} aria-hidden />
              <span>Histórico completo (do mais recente ao mais antigo)</span>
            </div>
            <table className="historic-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Leads no mês</th>
                  <th>Visitas no mês</th>
                  <th>Taxa do mês</th>
                  <th>Taxa acumulada</th>
                </tr>
              </thead>
              <tbody>
                {mesesTabela.map((row) => (
                  <tr key={row.mes}>
                    <td>{row.mes}</td>
                    <td>{fmt(row.leads)}</td>
                    <td>{fmt(row.visitas)}</td>
                    <td>{fmtPct(row.taxa_conversao_mensal_pct)}</td>
                    <td>{fmtPct(row.taxa_conversao_acumulada_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.observacao_dados && (
            <div className="historic-foot" role="note">
              <Info size={15} strokeWidth={2} aria-hidden />
              <span>{meta.observacao_dados}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function HistoricConversionSkeleton() {
  return (
    <section
      className="historic-conv historic-conv--skeleton"
      aria-busy="true"
      aria-label="Carregando conversão histórica"
    >
      <div className="historic-conv-head">
        <div className="historic-conv-title">
          <span className="historic-conv-ico sk-pulse" aria-hidden />
          <div className="sk-grow">
            <div className="sk-line sk-line--lg sk-pulse" />
            <div className="sk-line sk-line--md sk-pulse sk-mt" />
          </div>
        </div>
      </div>
      <div className="sk-line sk-line--full sk-pulse sk-mt-lg" />
      <div className="historic-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="historic-kpi historic-kpi--sk">
            <div className="sk-line sk-line--sm sk-pulse" />
            <div className="sk-line sk-line--xl sk-pulse sk-mt" />
            <div className="sk-line sk-line--md sk-pulse sk-mt-sm" />
          </div>
        ))}
      </div>
      <div className="historic-table-wrap historic-table-wrap--sk">
        <div className="sk-line sk-line--sm sk-pulse sk-mb" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="sk-row sk-pulse" />
        ))}
      </div>
    </section>
  );
}
