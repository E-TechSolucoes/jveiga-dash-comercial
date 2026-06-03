"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Download,
  Gift,
  Home,
  History,
  Moon,
  Sun,
  UserCheck,
} from "lucide-react";

import { useOnDutyBrokersEnriched, useRecep } from "@/hooks/use-dashboard";
import type { RecepApiPayload } from "@/lib/dashboard/api";
import type { OnDutyBrokerEnriched } from "@/lib/on-duty-brokers/types";

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

/** Baixa o histórico de visitas como CSV (separador `;`, BOM UTF-8 para Excel pt-BR). */
function exportHistoricoCsv(rows: RecepApiPayload["historico"]): void {
  const header = ["Data", "Visitas", "Manhã", "Tarde"];
  const lines = [
    header.join(";"),
    ...rows.map((r) => [r.data, r.visitas, r.manha, r.tarde].join(";")),
  ];
  const csv = `﻿${lines.join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-visitas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

/** Current wall-clock in America/Sao_Paulo: date as YYYY-MM-DD and hour 0–23.
 *  Computed via Intl so it's correct regardless of the browser's timezone. */
function spNow(): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Shifts a YYYY-MM-DD date back by `n` days (UTC arithmetic — DST-safe). */
function spDateMinusDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  const p2 = (x: number) => String(x).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
}

/** YYYY-MM-DD → DD/MM/YYYY (the format the table renders). */
function ymdToBR(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

/** Normalizes the postgres period ("morning"/"afternoon") — and PT aliases — to
 *  the "manha"/"tarde" tokens the existing table JSX checks against. */
function normPeriod(p?: string | null): "manha" | "tarde" | "" {
  const v = (p ?? "").toLowerCase();
  if (v === "morning" || v === "manha" || v === "manhã") return "manha";
  if (v === "afternoon" || v === "tarde") return "tarde";
  return "";
}

/** A plantão is over by the clock (America/Sao_Paulo): any past day is over;
 *  today's morning ends at 12:00, today's afternoon ends at 18:00. */
function isOver(r: OnDutyBrokerEnriched, now: { date: string; hour: number }): boolean {
  if (r.duty_date < now.date) return true; // string compare is safe for YYYY-MM-DD
  if (r.duty_date > now.date) return false;
  const per = normPeriod(r.period);
  if (per === "manha") return now.hour >= 12;
  if (per === "tarde") return now.hour >= 18;
  return false;
}

/** Maps an enriched row into the active-plantão shape `plantaoToCorretores` reads. */
function toLegacyPlantao(r: OnDutyBrokerEnriched): RecepApiPayload["plantao"][number] {
  return {
    corretor: r.field_broker_nome ?? null,
    imobiliaria: r.imobiliaria ?? null,
    period: normPeriod(r.period),
    empreendimento: r.empreendimento_nome ?? null,
  };
}

/** Maps an enriched row into the ended-plantão shape the "Plantões encerrados"
 *  table reads (corretor, imobiliária, turno, data). entrada/saída are unused —
 *  on_duty_brokers has no real entry/exit times. */
function toLegacyHistorico(r: OnDutyBrokerEnriched): RecepApiPayload["plantaoHistorico"][number] {
  return {
    corretor: r.field_broker_nome ?? null,
    imobiliaria: r.imobiliaria ?? null,
    period: normPeriod(r.period),
    empreendimento: r.empreendimento_nome ?? null,
    data: ymdToBR(r.duty_date),
    entrada: null,
    saida: null,
  };
}

export function RecepTab({ empreendimentosNomes }: { empreendimentosNomes: string[] }) {
  const nomesNorm = useMemo(
    () => empreendimentosNomes.map((s) => s.trim()).filter((s) => s.length > 0),
    [empreendimentosNomes],
  );

  const query = useRecep(nomesNorm);
  const data: RecepApiPayload | null = query.data ?? null;

  const visitasHoje = useMemo(() => (data ? mapVisitas(data.visitasHoje) : []), [data]);

  // Plantão (corretores no plantão + encerrados) agora vem do postgres
  // on_duty_brokers via o backend, filtrado pelos empreendimentos já resolvidos
  // no payload da recepção. Classificamos ativo/encerrado pelo horário de São
  // Paulo aqui no cliente: manhã encerra às 12:00, tarde encerra às 18:00.
  const now = useMemo(() => spNow(), []);
  const dutyIds = useMemo(
    () =>
      (data?.empreendimentosMatched ?? [])
        .map((m) => m.id)
        .filter((x): x is number => typeof x === "number"),
    [data],
  );
  const dutyFrom = useMemo(() => spDateMinusDays(now.date, 14), [now.date]);
  const dutyQuery = useOnDutyBrokersEnriched(dutyIds, dutyFrom, now.date);
  const dutyRows = useMemo(() => dutyQuery.data?.items ?? [], [dutyQuery.data]);

  const loading = query.isLoading || dutyQuery.isLoading;
  const recepError = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : "Falha ao carregar recepção."
    : null;
  const error = recepError ?? (dutyQuery.isError ? "Falha ao carregar plantão." : null);

  const corretoresPlantao = useMemo(
    () => plantaoToCorretores(dutyRows.filter((r) => !isOver(r, now)).map(toLegacyPlantao)),
    [dutyRows, now],
  );
  const plantaoHistorico = useMemo(
    () => dutyRows.filter((r) => isOver(r, now)).map(toLegacyHistorico),
    [dutyRows, now],
  );
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
              Corretores escalados para hoje cujo turno ainda não encerrou (plantão /
              on_duty_brokers).
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
              <History size={18} strokeWidth={2} /> Plantões encerrados
            </h2>
            <p className="data-card-sub">
              Plantões cujo turno já encerrou — manhã após 12:00, tarde após 18:00 (horário de São
              Paulo) — nos últimos 14 dias.
            </p>
          </div>
        </header>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Corretor</th>
                <th>Imobiliária</th>
                <th>Turno</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {plantaoHistorico.length === 0 ? (
                <tr>
                  <td colSpan={4} className="cell-mute">
                    Nenhum plantão encerrado nos últimos 14 dias para este empreendimento.
                  </td>
                </tr>
              ) : (
                plantaoHistorico.map((p, i) => {
                  const per = (p.period ?? "").toLowerCase();
                  return (
                    <tr key={`${p.corretor ?? "—"}-${p.data ?? ""}-${i}`}>
                      <td className="cell-strong">{(p.corretor ?? "").trim() || "—"}</td>
                      <td>
                        <span className="chip-soft" data-accent="blue">
                          {(p.imobiliaria ?? "").trim() || "—"}
                        </span>
                      </td>
                      <td>
                        {per === "manha" ? (
                          <span className="status-pill" data-state="warn">
                            <Sun size={11} strokeWidth={2} /> Manhã
                          </span>
                        ) : per === "tarde" ? (
                          <span className="status-pill" data-state="violet">
                            <Moon size={11} strokeWidth={2} /> Tarde
                          </span>
                        ) : (
                          <span className="cell-mute">—</span>
                        )}
                      </td>
                      <td>{(p.data ?? "").trim() || "—"}</td>
                    </tr>
                  );
                })
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
          <div className="data-card-head-actions">
            <div className="sh-meta">
              <CalendarDays size={14} strokeWidth={1.75} />
              {historico.length} dias · {data?.totals.visitasPeriodo ?? 0} visitas
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => exportHistoricoCsv(historico)}
              disabled={historico.length === 0}
            >
              <Download size={14} strokeWidth={2} /> Exportar CSV
            </button>
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
              Corretores escalados para hoje cujo turno ainda não encerrou (plantão /
              on_duty_brokers).
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
              <History size={18} strokeWidth={2} /> Plantões encerrados
            </h2>
            <p className="data-card-sub">
              Plantões cujo turno já encerrou — manhã após 12:00, tarde após 18:00 (horário de São
              Paulo) — nos últimos 14 dias.
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
