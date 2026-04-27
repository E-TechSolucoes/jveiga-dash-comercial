"use client";

import { Bell, Calendar, Crown, Swords, Target } from "lucide-react";
import { useState } from "react";

import { isoWeekNumber } from "@/lib/arsenal/api";

import type { EmpresaOption, PeriodoId } from "./types";
import { UserMenu } from "./user-menu";

type Props = {
  empresa: string;
  empresaOptions: EmpresaOption[];
  onEmpresaChange: (v: string) => void;

  periodo: PeriodoId;
  onPeriodoChange: (v: PeriodoId) => void;

  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;

  dateRangeLabel: string;

  comercialName: string;
  onComercialNameChange: (v: string) => void;

  skinsUnlocked: number;
  skinsTotal: number;
  metaReal: number;
  metaTarget: number;
  checklistPct: number;
};

export function Topbar({
  empresa,
  empresaOptions,
  onEmpresaChange,
  periodo,
  onPeriodoChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  dateRangeLabel,
  comercialName,
  onComercialNameChange,
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

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="avatar" aria-hidden>
            JV
          </div>
          <div>
            <div className="brand-title">Painel do Comercial</div>
            <div className="brand-sub">Jerônimo da Veiga · JVendas · Q1 2026</div>
          </div>
        </div>

        <div className="top-actions">
          <select
            className="select"
            value={empresa}
            onChange={(e) => onEmpresaChange(e.target.value)}
            aria-label="Empreendimento"
          >
            {empresaOptions.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

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

          {isCustom && (
            <div className="date-pill" style={{ gap: 6 }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "inherit",
                  outline: "none",
                  padding: 0,
                }}
                aria-label="De"
              />
              <span style={{ color: "var(--ink-dim)" }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "inherit",
                  outline: "none",
                  padding: 0,
                }}
                aria-label="Até"
              />
            </div>
          )}

          {!isCustom && (
            <div className="date-pill">
              <Calendar size={15} strokeWidth={2} aria-hidden />
              <span>{dateRangeLabel}</span>
            </div>
          )}

          <input
            className="input"
            placeholder="Nome do Comercial"
            value={comercialName}
            onChange={(e) => onComercialNameChange(e.target.value)}
            aria-label="Nome do Comercial"
          />

          <button type="button" className="icon-btn" aria-label="Notificações">
            <Bell size={18} strokeWidth={1.75} />
            <span className="dot" aria-hidden />
          </button>
          <UserMenu />
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
