"use client";

import { Calendar, Crown, Swords, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { isoWeekNumber } from "@/lib/arsenal/api";

import { EmpreendimentosMultiSelect } from "./empreendimentos-multiselect";
import type { EmpresaOption, PeriodoId } from "./types";
import { UserMenu } from "./user-menu";

type Props = {
  empresas: string[];
  empresaOptions: EmpresaOption[];
  onEmpresasChange: (next: string[]) => void;

  periodo: PeriodoId;
  onPeriodoChange: (v: PeriodoId) => void;

  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;

  dateRangeLabel: string;

  comercialName: string;

  skinsUnlocked: number;
  skinsTotal: number;
  metaReal: number;
  metaTarget: number;
  checklistPct: number;
};

/** Mantém apenas o nome do empreendimento no rótulo (remove "ID - " quando presente). */
function empreendimentosOnlyName(options: EmpresaOption[]): EmpresaOption[] {
  return options.map((opt) => {
    const label = opt.label;
    const emDash = label.indexOf(" — ");
    if (emDash >= 0) return { ...opt, label: label.slice(emDash + 3).trim() };
    const hyphen = label.indexOf(" - ");
    if (hyphen >= 0) return { ...opt, label: label.slice(hyphen + 3).trim() };
    return opt;
  });
}

export function Topbar({
  empresas,
  empresaOptions,
  onEmpresasChange,
  periodo,
  onPeriodoChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  dateRangeLabel,
  comercialName,
  skinsUnlocked,
  skinsTotal,
  metaReal,
  metaTarget,
  checklistPct,
}: Props) {
  const isCustom = periodo === "custom";

  const [currentWeek] = useState<number | null>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return isoWeekNumber(`${y}-${m}-${d}`);
  });

  const multiSelectOptions = useMemo(
    () => empreendimentosOnlyName(empresaOptions),
    [empresaOptions],
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <div className="avatar" aria-hidden>
              JV
            </div>
            <div>
              <div className="brand-title">Painel do Comercial</div>
              <div className="brand-sub">JERÔNIMO DA VEIGA · JVENDAS</div>
            </div>
          </div>

          <UserMenu />
        </div>

        <div className="topbar-filters">
          <EmpreendimentosMultiSelect
            options={multiSelectOptions}
            selected={empresas}
            onChange={onEmpresasChange}
            ariaLabel="Empreendimentos selecionados"
          />

          <select
            className="select"
            value={periodo}
            onChange={(e) => onPeriodoChange(e.target.value as PeriodoId)}
            aria-label="Período"
          >
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
            <option value="ultimo_mes">Último mês</option>
            <option value="custom">Personalizado…</option>
          </select>

          {isCustom ? (
            <div className="date-pill date-pill--range">
              <Calendar size={15} strokeWidth={2} aria-hidden />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="date-pill-input"
                aria-label="De"
              />
              <span className="date-pill-sep" aria-hidden>
                →
              </span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="date-pill-input"
                aria-label="Até"
              />
            </div>
          ) : (
            <div className="date-pill">
              <Calendar size={15} strokeWidth={2} aria-hidden />
              <span>{dateRangeLabel}</span>
            </div>
          )}

          <input
            className="input"
            placeholder="Nome do Comercial"
            value={comercialName}
            readOnly
            aria-label="Nome do Comercial"
          />
        </div>
      </header>

      <div className="chips">
        <span className="chip chip--active">
          {currentWeek == null ? "Semana —" : `Semana ${currentWeek} do ano`}
        </span>
        <span className="chip chip--accent">
          <Swords size={14} strokeWidth={2} />
          Skins
          <span className="chip-count">
            {skinsUnlocked}/{skinsTotal}
          </span>
        </span>
        <span className="chip">
          <Target size={14} strokeWidth={2} />
          Meta
          <span className="chip-count">
            {metaReal}/{metaTarget}
          </span>
        </span>
        <span className="chip">
          <Crown size={14} strokeWidth={2} />
          Checklist
          <span className="chip-count">{checklistPct}%</span>
        </span>
      </div>
    </>
  );
}
