"use client";

import { useMemo } from "react";
import { CalendarDays, Clock, Gift, Home, History, Moon, Sun, UserCheck } from "lucide-react";

import { useRecep } from "@/hooks/use-dashboard";
import type { RecepApiPayload } from "@/lib/dashboard/api";

type Visita = {
  hora: string;
  cliente: string;
  origem: string;
  corretor: string;
};

type RecepCorretor = {
  nome: string;
  imob: string;
  cel: string;
  manha: boolean;
  tarde: boolean;
};

function origemAccent(origem: string): "blue" | "violet" | "emerald" | "amber" | "slate" {
  const o = origem.toLowerCase();
  if (o.includes("espont")) return "blue";
  if (o.includes("indic")) return "violet";
  if (o.includes("whatsapp") || o.includes("chat") || o.includes("ia")) return "emerald";
  if (o.includes("retorno")) return "amber";
  return "slate";
}

function mapVisitas(rows: RecepApiPayload["visitasHoje"]): Visita[] {
  return rows.map((v) => ({
    hora: (v.hora ?? "—").trim() || "—",
    cliente: (v.cliente ?? "—").trim() || "—",
    origem: (v.origem ?? "—").trim() || "—",
    corretor: (v.corretor ?? "—").trim() || "—",
  }));
}

function plantaoToCorretores(rows: RecepApiPayload["plantao"]): RecepCorretor[] {
  const map = new Map<string, RecepCorretor>();
  for (const p of rows) {
    const nome = (p.corretor ?? "").trim() || "—";
    const cur =
      map.get(nome) ??
      ({
        nome,
        imob: "",
        cel: "",
        manha: false,
        tarde: false,
      } satisfies RecepCorretor);
    if (!cur.imob && p.imobiliaria) cur.imob = p.imobiliaria.trim();
    const per = (p.period ?? "").toLowerCase();
    if (per === "manha") cur.manha = true;
    if (per === "tarde") cur.tarde = true;
    map.set(nome, cur);
  }
  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function RecepTab({ empreendimentosNomes }: { empreendimentosNomes: string[] }) {
  const nomesNorm = useMemo(
    () => empreendimentosNomes.map((s) => s.trim()).filter((s) => s.length > 0),
    [empreendimentosNomes],
  );

  const query = useRecep(nomesNorm);
  const data: RecepApiPayload | null = query.data ?? null;
  const loading = query.isLoading;
  const error = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : "Falha ao carregar recepção."
    : null;

  const visitasHoje = useMemo(() => (data ? mapVisitas(data.visitasHoje) : []), [data]);
  const corretoresPlantao = useMemo(() => (data ? plantaoToCorretores(data.plantao) : []), [data]);
  const historico = data?.historico ?? [];

  const plantaoManha = useMemo(
    () => corretoresPlantao.filter((c) => c.manha).length,
    [corretoresPlantao],
  );
  const plantaoTarde = useMemo(
    () => corretoresPlantao.filter((c) => c.tarde).length,
    [corretoresPlantao],
  );

  const visitasHojeCount = data?.totals.visitasHoje ?? visitasHoje.length;

  if (loading) {
    return <RecepSkeleton />;
  }

  return (
    <div className="recep-stack">
      {error && (
        <div className="info-banner" data-state="error">
          <Gift size={16} strokeWidth={2} />
          <div>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="kpi-row">
        <article className="kpi" data-accent="rose">
          <div className="kpi-head">
            <div className="icon-box">
              <Home aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{visitasHojeCount}</div>
          <div className="kpi-label">Visitas hoje</div>
          <div className="kpi-sub">Recepcionadas no stand</div>
        </article>
        <article className="kpi" data-accent="amber">
          <div className="kpi-head">
            <div className="icon-box">
              <Sun aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{plantaoManha}</div>
          <div className="kpi-label">Plantão Manhã</div>
          <div className="kpi-sub">Corretores escalados</div>
        </article>
        <article className="kpi" data-accent="violet">
          <div className="kpi-head">
            <div className="icon-box">
              <Moon aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{plantaoTarde}</div>
          <div className="kpi-label">Plantão Tarde</div>
          <div className="kpi-sub">Corretores escalados</div>
        </article>
        <article className="kpi" data-accent="emerald">
          <div className="kpi-head">
            <div className="icon-box">
              <History aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{data?.totals.visitasPeriodo ?? "—"}</div>
          <div className="kpi-label">Visitas ({data?.totals.historicDays ?? 14} dias)</div>
          <div className="kpi-sub">Total no período (histórico)</div>
        </article>
      </div>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <Clock size={18} strokeWidth={2} /> Visitas hoje
            </h2>
            <p className="data-card-sub">Em ordem cronológica — capturadas pela recepcionista.</p>
          </div>
        </header>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Origem</th>
                <th>Corretor</th>
              </tr>
            </thead>
            <tbody>
              {visitasHoje.length === 0 ? (
                <tr>
                  <td colSpan={4} className="cell-mute">
                    Nenhuma visita hoje para este empreendimento.
                  </td>
                </tr>
              ) : (
                visitasHoje.map((v, i) => (
                  <tr key={`${v.hora}-${i}`}>
                    <td className="cell-hora">{v.hora}</td>
                    <td className="cell-strong">{v.cliente}</td>
                    <td>
                      <span className="chip-soft" data-accent={origemAccent(v.origem)}>
                        {v.origem}
                      </span>
                    </td>
                    <td>{v.corretor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <UserCheck size={18} strokeWidth={2} /> Corretores no plantão
            </h2>
            <p className="data-card-sub">
              Registros com status ativo em Plantão (BigQuery dwh.Plantao, últimos 14 dias).
            </p>
          </div>
        </header>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Corretor</th>
                <th>Imobiliária</th>
                <th>Manhã</th>
                <th>Tarde</th>
              </tr>
            </thead>
            <tbody>
              {corretoresPlantao.length === 0 ? (
                <tr>
                  <td colSpan={4} className="cell-mute">
                    Nenhum corretor ativo no plantão para este empreendimento.
                  </td>
                </tr>
              ) : (
                corretoresPlantao.map((c, i) => (
                  <tr key={`${c.nome}-${i}`}>
                    <td className="cell-strong">{c.nome}</td>
                    <td>
                      <span className="chip-soft" data-accent="blue">
                        {c.imob || "—"}
                      </span>
                    </td>
                    <td>
                      {c.manha ? (
                        <span className="status-pill" data-state="warn">
                          <Sun size={11} strokeWidth={2} /> Manhã
                        </span>
                      ) : (
                        <span className="cell-mute">—</span>
                      )}
                    </td>
                    <td>
                      {c.tarde ? (
                        <span className="status-pill" data-state="violet">
                          <Moon size={11} strokeWidth={2} /> Tarde
                        </span>
                      ) : (
                        <span className="cell-mute">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <History size={18} strokeWidth={2} /> Histórico — últimos dias
            </h2>
            <p className="data-card-sub">
              Agregado por dia (turnos manhã/tarde conforme campo `turno`; fontes{" "}
              <code className="text-xs">Visitas</code> ∪{" "}
              <code className="text-xs">public_visitas</code>).
            </p>
          </div>
          <div className="sh-meta">
            <CalendarDays size={14} strokeWidth={1.75} />
            {historico.length} dias · {data?.totals.visitasPeriodo ?? 0} visitas
          </div>
        </header>
        <ul className="hist-list">
          {historico.length === 0 ? (
            <li className="hist-row cell-mute">Sem visitas no período para este empreendimento.</li>
          ) : (
            historico.map((d) => (
              <li key={d.data} className="hist-row">
                <span className="hist-row-date">{d.data}</span>
                <span className="hist-row-block">
                  <Home size={13} strokeWidth={1.75} />
                  <strong>{d.visitas}</strong> visitas
                </span>
                <span className="hist-row-block">
                  <Sun size={13} strokeWidth={1.75} />
                  <strong>{d.manha}</strong> manhã
                </span>
                <span className="hist-row-block">
                  <Moon size={13} strokeWidth={1.75} />
                  <strong>{d.tarde}</strong> tarde
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="info-banner">
        <Gift size={16} strokeWidth={2} />
        <div>
          Dados em tempo real do BigQuery (<code className="text-xs">jeronimo-444814.dwh</code>
          ). Filtro pelos empreendimentos do cabeçalho
          {data?.empreendimentosMatched && data.empreendimentosMatched.length > 0 ? (
            <>
              {" "}
              —{" "}
              {data.empreendimentosMatched
                .filter((m) => m.id != null)
                .map((m) => `${m.id} (${m.nome ?? ""})`)
                .join(", ")}
            </>
          ) : data?.empreendimentoId != null ? (
            <>
              {" "}
              — <code>empreendimento_id</code> = {data.empreendimentoId}
              {data.empreendimentoNomeMatch && <> ({data.empreendimentoNomeMatch})</>}
            </>
          ) : null}
          {data?.empreendimentoId == null && nomesNorm.length > 0 && (
            <> — sem correspondência nas tabelas de visitas (plantão filtrado só por nome).</>
          )}
        </div>
      </div>
    </div>
  );
}

function RecepSkeleton() {
  return (
    <div className="recep-stack" aria-busy="true" aria-label="Carregando dados de recepção">
      <div className="kpi-row">
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className="kpi">
            <div className="kpi-head">
              <span className="icon-box sk-pulse" aria-hidden />
              <span className="status-dot" aria-hidden />
            </div>
            <div className="sk-line sk-line--xl sk-pulse sk-mt" />
            <div className="sk-line sk-line--md sk-pulse sk-mt-sm" />
            <div className="sk-line sk-line--sm sk-pulse sk-mt-sm" />
          </article>
        ))}
      </div>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <Clock size={18} strokeWidth={2} /> Visitas hoje
            </h2>
            <p className="data-card-sub">Em ordem cronológica — capturadas pela recepcionista.</p>
          </div>
        </header>
        <div className="data-table-wrap historic-table-wrap--sk">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sk-row sk-pulse" />
          ))}
        </div>
      </section>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <UserCheck size={18} strokeWidth={2} /> Corretores no plantão
            </h2>
            <p className="data-card-sub">
              Registros com status ativo em Plantão (BigQuery dwh.Plantao, últimos 14 dias).
            </p>
          </div>
        </header>
        <div className="data-table-wrap historic-table-wrap--sk">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sk-row sk-pulse" />
          ))}
        </div>
      </section>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <History size={18} strokeWidth={2} /> Histórico — últimos dias
            </h2>
            <p className="data-card-sub">
              Agregado por dia (turnos manhã/tarde conforme campo `turno`; fontes{" "}
              <code className="text-xs">Visitas</code> ∪{" "}
              <code className="text-xs">public_visitas</code>).
            </p>
          </div>
        </header>
        <ul className="hist-list">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="sk-row sk-pulse" />
          ))}
        </ul>
      </section>
    </div>
  );
}
