"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  History,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import {
  useAwardCheckItems,
  useDailyCheckItems,
  usePremiacoesCategories,
  useReplaceAwardCheckActivity,
  useReplaceDailyCheckActivity,
  useReplaceStandCheckActivity,
  useStandCheckItems,
} from "@/hooks/use-checklist";

import {
  CHECKLIST_META,
  SKIN_ARQUITETO_THRESHOLD,
  type CheckItem,
  type ChecklistType,
  type ValidationLogEntry,
} from "./check-data";
import type { ReplaceAwardCheckActivityBody } from "./check-items-award-activity";
import type { ReplaceDailyCheckActivityBody } from "./check-items-daily-activity";
import { formatDayLabel, type ReplaceStandCheckActivityBody } from "./stand-check-activity";
import { resolveLucideIcon } from "./stand-check-items";
import { Toast, type ToastKind } from "../../_components/toast";

const TOAST_DURATION_MS = 3000;

type Props = {
  comercialName: string;
  // IDs numéricos dos empreendimentos selecionados no topbar. O PUT das
  // activities (stand/diario) já aceita um array (chave (day, empreendimento_ids)).
  // O catálogo de check items é GLOBAL — só o GET de premiações categories e
  // o merge do estado de hoje precisam de um id, e nesse caso usamos o primeiro
  // selecionado como contexto de leitura.
  empreendimentoIds: number[];
};

type StateMap = Record<string, boolean>;

/** Forma mínima compartilhada pelos 3 catálogos de check items (stand/daily/award). */
type CheckRow = {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  is_checked: boolean;
  divergent: boolean;
};

const SUB_TABS: {
  id: ChecklistType;
  label: string;
  Icon: LucideIcon;
  variant: "emerald" | "blue" | "amber";
}[] = [
  { id: "diario", label: "Rotina Diária", Icon: Calendar, variant: "blue" },
  { id: "base", label: "Base do Estande", Icon: Building2, variant: "emerald" },
  { id: "premiacao", label: "Premiação Semanal", Icon: Trophy, variant: "amber" },
];

function todayBr(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function countDone(map: StateMap, items: CheckItem[]): number {
  return items.reduce((n, item) => n + (map[item.id] ? 1 : 0), 0);
}

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function toRenderItems(rows: CheckRow[]): CheckItem[] {
  return rows.map((it) => ({
    id: it.code,
    label: it.label,
    Icon: resolveLucideIcon(it.icon_name),
  }));
}

function toIdMap(rows: CheckRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((it) => [it.code, it.id]));
}

function toDivergentMap(rows: CheckRow[]): StateMap {
  return Object.fromEntries(rows.map((it) => [it.code, it.divergent]));
}

function toChecksMap(rows: CheckRow[]): StateMap {
  return Object.fromEntries(rows.map((it) => [it.code, it.is_checked]));
}

export function CheckTab({ comercialName, empreendimentoIds }: Props) {
  // Todos os estandes selecionados são lidos juntos e o backend devolve a
  // view já mesclada (ALL-must-agree) + flag `divergent` por item. PUT
  // escreve uma linha por estande via fan-out no service.
  const empreendimentoId = empreendimentoIds[0] ?? null;

  const [sub, setSub] = useState<ChecklistType>("diario");
  const [log, setLog] = useState<ValidationLogEntry[]>([]);
  const [toast, setToast] = useState<{
    kind: ToastKind;
    message: string;
    key: number;
  } | null>(null);

  // Estado editável dos checkboxes — semeado a partir da query e alterado pelo
  // usuário até clicar em "Validar".
  const [baseChecks, setBaseChecks] = useState<StateMap>({});
  const [diarioMap, setDiarioMap] = useState<StateMap>({});
  const [premMap, setPremMap] = useState<StateMap>({});

  const [baseSaveError, setBaseSaveError] = useState<string | null>(null);
  const [diarioSaveError, setDiarioSaveError] = useState<string | null>(null);
  const [premSaveError, setPremSaveError] = useState<string | null>(null);

  // Reads — só a sub-tab ativa fica habilitada.
  const baseQuery = useStandCheckItems(empreendimentoIds, sub === "base");
  const diarioQuery = useDailyCheckItems(empreendimentoIds, sub === "diario");
  const premQuery = useAwardCheckItems(empreendimentoIds, sub === "premiacao");
  const premCategoriesQuery = usePremiacoesCategories(empreendimentoId, sub === "premiacao");

  // Writes — PUT replace-all; em caso de sucesso a query do read é invalidada.
  const baseMutation = useReplaceStandCheckActivity();
  const diarioMutation = useReplaceDailyCheckActivity();
  const premMutation = useReplaceAwardCheckActivity();

  // Re-semeia o estado editável quando a query carrega ou revalida. Padrão
  // render-phase do React (setState durante render, sem ciclo de efeito):
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [baseSeed, setBaseSeed] = useState<unknown>(undefined);
  if (baseQuery.data && baseQuery.data !== baseSeed) {
    setBaseSeed(baseQuery.data);
    setBaseChecks(toChecksMap(baseQuery.data));
  }
  const [diarioSeed, setDiarioSeed] = useState<unknown>(undefined);
  if (diarioQuery.data && diarioQuery.data !== diarioSeed) {
    setDiarioSeed(diarioQuery.data);
    setDiarioMap(toChecksMap(diarioQuery.data));
  }
  const [premSeed, setPremSeed] = useState<unknown>(undefined);
  if (premQuery.data && premQuery.data !== premSeed) {
    setPremSeed(premQuery.data);
    setPremMap(toChecksMap(premQuery.data));
  }

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Derivados das queries (catálogo, ids e divergência são server-side).
  const baseItems = useMemo(() => toRenderItems(baseQuery.data ?? []), [baseQuery.data]);
  const baseItemIds = useMemo(() => toIdMap(baseQuery.data ?? []), [baseQuery.data]);
  const baseDivergent = useMemo(() => toDivergentMap(baseQuery.data ?? []), [baseQuery.data]);
  const diarioItems = useMemo(() => toRenderItems(diarioQuery.data ?? []), [diarioQuery.data]);
  const diarioItemIds = useMemo(() => toIdMap(diarioQuery.data ?? []), [diarioQuery.data]);
  const diarioDivergent = useMemo(() => toDivergentMap(diarioQuery.data ?? []), [diarioQuery.data]);
  const premItems = useMemo(() => toRenderItems(premQuery.data ?? []), [premQuery.data]);
  const premItemIds = useMemo(() => toIdMap(premQuery.data ?? []), [premQuery.data]);
  const premDivergent = useMemo(() => toDivergentMap(premQuery.data ?? []), [premQuery.data]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const baseDay = baseQuery.data ? todayIso : null;
  const diarioDay = diarioQuery.data ? todayIso : null;
  const premDay = premQuery.data ? todayIso : null;

  const baseLoading = baseQuery.isLoading;
  const diarioLoading = diarioQuery.isLoading;
  const premLoading = premQuery.isLoading;
  const baseError = baseQuery.isError ? errMsg(baseQuery.error, "Erro ao carregar itens") : null;
  const diarioError = diarioQuery.isError
    ? errMsg(diarioQuery.error, "Erro ao carregar itens")
    : null;
  const premError = premQuery.isError ? errMsg(premQuery.error, "Erro ao carregar itens") : null;

  const baseSaving = baseMutation.isPending;
  const diarioSaving = diarioMutation.isPending;
  const premSaving = premMutation.isPending;

  const premCategories = premCategoriesQuery.data ?? [];
  const premCategoriesError = premCategoriesQuery.isError
    ? errMsg(premCategoriesQuery.error, "Erro ao carregar categorias de premiação")
    : null;

  const toggleBase = (code: string) => {
    // Apenas atualização visual — a persistência acontece no botão "Validar".
    setBaseSaveError(null);
    setBaseChecks((m) => ({ ...m, [code]: !m[code] }));
  };

  const toggleDiario = (code: string) => {
    setDiarioSaveError(null);
    setDiarioMap((m) => ({ ...m, [code]: !m[code] }));
  };

  const togglePrem = (code: string) => {
    setPremSaveError(null);
    setPremMap((m) => ({ ...m, [code]: !m[code] }));
  };

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ kind, message, key: Date.now() });
  };

  const validateBase = async () => {
    if (baseMutation.isPending) return;
    if (empreendimentoId == null) {
      const msg = "Selecione um empreendimento válido para salvar o checklist do estande.";
      setBaseSaveError(msg);
      showToast("error", msg);
      return;
    }

    // PUT é replace-all: envia a foto completa do dia. Itens omitidos somem,
    // então mandamos todos os items do catálogo com o estado atual da UI.
    const itemsBody: ReplaceStandCheckActivityBody["items"] = [];
    for (const item of baseItems) {
      const itemId = baseItemIds[item.id];
      if (!itemId) continue;
      itemsBody.push({
        item_id: itemId,
        is_checked: !!baseChecks[item.id],
      });
    }

    setBaseSaveError(null);
    try {
      await baseMutation.mutateAsync({
        empreendimento_ids: empreendimentoIds.length > 0 ? empreendimentoIds : [empreendimentoId],
        items: itemsBody,
      });
      // A invalidação do read resincroniza checks + divergent com a visão
      // mesclada (ALL-must-agree) devolvida pelo servidor.
      showToast("success", "Checklist da base salvo com sucesso!");
    } catch (err: unknown) {
      const msg = errMsg(err, "Erro ao salvar checks");
      setBaseSaveError(msg);
      showToast("error", msg);
    }
  };

  const validateDiario = async () => {
    if (diarioMutation.isPending) return;
    if (empreendimentoId == null) {
      const msg = "Selecione um empreendimento válido para salvar a rotina diária.";
      setDiarioSaveError(msg);
      showToast("error", msg);
      return;
    }

    const itemsBody: ReplaceDailyCheckActivityBody["items"] = [];
    for (const item of diarioItems) {
      const itemId = diarioItemIds[item.id];
      if (!itemId) continue;
      itemsBody.push({
        item_id: itemId,
        is_checked: !!diarioMap[item.id],
      });
    }

    setDiarioSaveError(null);
    try {
      await diarioMutation.mutateAsync({
        empreendimento_ids: empreendimentoIds.length > 0 ? empreendimentoIds : [empreendimentoId],
        items: itemsBody,
      });
      showToast("success", "Rotina diária salva com sucesso!");
    } catch (err: unknown) {
      const msg = errMsg(err, "Erro ao salvar checks");
      setDiarioSaveError(msg);
      showToast("error", msg);
    }
  };

  const validatePrem = async () => {
    if (premMutation.isPending) return;
    if (empreendimentoId == null) {
      const msg = "Selecione um empreendimento válido para salvar a premiação.";
      setPremSaveError(msg);
      showToast("error", msg);
      return;
    }

    const itemsBody: ReplaceAwardCheckActivityBody["items"] = [];
    for (const item of premItems) {
      const itemId = premItemIds[item.id];
      if (!itemId) continue;
      itemsBody.push({
        item_id: itemId,
        is_checked: !!premMap[item.id],
      });
    }

    setPremSaveError(null);
    try {
      await premMutation.mutateAsync({
        empreendimento_ids: empreendimentoIds.length > 0 ? empreendimentoIds : [empreendimentoId],
        items: itemsBody,
      });
      showToast("success", "Premiação salva com sucesso!");
    } catch (err: unknown) {
      const msg = errMsg(err, "Erro ao salvar checks");
      setPremSaveError(msg);
      showToast("error", msg);
    }
  };

  const currentItems = useMemo(() => {
    if (sub === "base") return baseItems;
    if (sub === "diario") return diarioItems;
    return premItems;
  }, [sub, baseItems, diarioItems, premItems]);

  const currentMap = useMemo(() => {
    if (sub === "base") return baseChecks;
    if (sub === "diario") return diarioMap;
    return premMap;
  }, [sub, baseChecks, diarioMap, premMap]);

  const currentDivergent = useMemo(() => {
    if (sub === "base") return baseDivergent;
    if (sub === "diario") return diarioDivergent;
    return premDivergent;
  }, [sub, baseDivergent, diarioDivergent, premDivergent]);

  const currentSet = (key: string) => {
    if (sub === "base") {
      toggleBase(key);
      return;
    }
    if (sub === "diario") {
      toggleDiario(key);
      return;
    }
    togglePrem(key);
  };

  const done = countDone(currentMap, currentItems);
  const total = currentItems.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const meta = CHECKLIST_META[sub];

  const skinUnlocked = countDone(baseChecks, baseItems) >= SKIN_ARQUITETO_THRESHOLD;
  const skinRemaining = Math.max(0, SKIN_ARQUITETO_THRESHOLD - countDone(baseChecks, baseItems));

  const baseDayLabel = baseDay ? formatDayLabel(baseDay) : null;
  const diarioDayLabel = diarioDay ? formatDayLabel(diarioDay) : null;
  const premDayLabel = premDay ? formatDayLabel(premDay) : null;

  const lastLogForSub = log.find((l) => l.type === sub);
  const hasValidation = !!lastLogForSub;

  const recordValidation = () => {
    const entry: ValidationLogEntry = {
      id: `${Date.now()}`,
      date: todayBr(),
      by: comercialName.trim() || "—",
      type: sub,
      count: done,
      total,
    };
    setLog((prev) => [entry, ...prev].slice(0, 20));
  };

  const validate = () => {
    if (sub === "base") {
      void validateBase().then(() => {
        recordValidation();
      });
      return;
    }
    if (sub === "diario") {
      void validateDiario().then(() => {
        recordValidation();
      });
      return;
    }
    void validatePrem().then(() => {
      recordValidation();
    });
  };

  return (
    <>
      {/* SUB-TAB SWITCHER */}
      <div role="tablist" aria-label="Tipo de checklist" className="seg">
        {SUB_TABS.map((tab) => {
          const Icon = tab.Icon;
          const active = sub === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSub(tab.id)}
              className={`seg-btn${active ? ` seg-btn--${tab.variant}` : ""}`}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* VALIDATION STRIP */}
      <div className="val-strip" data-state={hasValidation ? "ok" : "idle"}>
        <div className="val-strip-left">
          <div className="val-strip-ico">
            {hasValidation ? (
              <ShieldCheck size={22} strokeWidth={1.75} />
            ) : (
              <Clock size={22} strokeWidth={1.75} />
            )}
          </div>
          <div>
            <div className="val-strip-title">
              {hasValidation
                ? `Última validação: ${lastLogForSub!.date} por ${lastLogForSub!.by}`
                : "Nenhuma validação registrada"}
            </div>
            {hasValidation && (
              <div className="val-strip-sub">
                {`${lastLogForSub!.count} / ${lastLogForSub!.total} itens conferidos — tudo registrado no accountability log.`}
              </div>
            )}
            {!hasValidation && sub !== "base" && (
              <div className="val-strip-sub">
                {`Valide o checklist ${meta.label.toLowerCase()} para registrar quem conferiu e quando.`}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="val-btn"
          onClick={validate}
          disabled={
            (sub === "base" && (baseSaving || empreendimentoId == null)) ||
            (sub === "diario" && (diarioSaving || empreendimentoId == null)) ||
            (sub === "premiacao" && (premSaving || empreendimentoId == null))
          }
          aria-busy={
            (sub === "base" && baseSaving) ||
            (sub === "diario" && diarioSaving) ||
            (sub === "premiacao" && premSaving)
          }
        >
          <CheckCheck size={17} strokeWidth={2.25} />
          {(sub === "base" && baseSaving) ||
          (sub === "diario" && diarioSaving) ||
          (sub === "premiacao" && premSaving)
            ? "Salvando…"
            : `Validar ${meta.label.toLowerCase()}`}
        </button>
      </div>

      {/* INFO BANNER — BASE (Estande) */}
      {sub === "base" && (
        <div className="ck-base-banner">
          <div className="ck-base-banner-ico" aria-hidden>
            <Building2 size={22} strokeWidth={2} />
          </div>
          <div className="ck-base-banner-body">
            <div className="ck-base-banner-eyebrow">Stand pronto pra receber</div>
            <div className="ck-base-banner-title">
              Base do estande
              {baseDayLabel ? (
                <>
                  {" "}
                  · <em>{baseDayLabel}</em>
                </>
              ) : null}
            </div>
            <p className="ck-base-banner-text">
              Confira infraestrutura e ambientação — ao terminar, clique em{" "}
              <strong>Validar base (estande)</strong> e deixe o stand impenetrável.
            </p>
          </div>
          <div className="ck-base-banner-chip" aria-hidden>
            <span>{done}</span>
            <small>de {total}</small>
          </div>
        </div>
      )}

      {/* INFO BANNER — DIÁRIO */}
      {sub === "diario" && (
        <div className="ck-diario-banner">
          <div className="ck-diario-banner-sun" aria-hidden>
            <Sun size={22} strokeWidth={2} />
          </div>
          <div className="ck-diario-banner-body">
            <div className="ck-diario-banner-eyebrow">Bom dia no stand</div>
            <div className="ck-diario-banner-title">
              Rotina de hoje
              {diarioDayLabel ? (
                <>
                  {" "}
                  · <em>{diarioDayLabel}</em>
                </>
              ) : null}
            </div>
            <p className="ck-diario-banner-text">
              Marque cada cobrança conforme for concluindo — ao terminar, clique em{" "}
              <strong>Validar diário</strong> e feche o dia com tudo registrado.
            </p>
          </div>
          <div className="ck-diario-banner-chip" aria-hidden>
            <span>{done}</span>
            <small>de {total}</small>
          </div>
        </div>
      )}

      {sub === "premiacao" && (
        <div className="info-banner">
          <Info size={16} strokeWidth={2} />
          <div>
            Controle <strong>diário</strong>
            {premDayLabel ? (
              <>
                {" "}
                — hoje, <strong>{premDayLabel}</strong>
              </>
            ) : null}
            . Marque os preparativos da cerimônia e clique em <strong>Validar premiação</strong>{" "}
            para salvar no banco. Cada dia tem sua foto independente.
          </div>
        </div>
      )}

      {sub === "base" && baseSaveError && (
        <div className="ck-error" role="alert">
          {baseSaveError}
        </div>
      )}

      {sub === "diario" && diarioSaveError && (
        <div className="ck-error" role="alert">
          {diarioSaveError}
        </div>
      )}

      {sub === "premiacao" && premSaveError && (
        <div className="ck-error" role="alert">
          {premSaveError}
        </div>
      )}

      {/* PREMIAÇÕES CARDS */}
      {sub === "premiacao" && (
        <>
          <div className="section-head" style={{ marginTop: 0 }}>
            <div>
              <h2>
                <Trophy size={18} strokeWidth={2} /> Categorias de Premiação
              </h2>
              <div className="sh-sub">Toda terça-feira, antes do treinamento</div>
            </div>
            <div className="sh-meta">{premCategories.length} categorias</div>
          </div>

          {premCategoriesError && (
            <div className="ck-error" role="alert">
              {premCategoriesError}
            </div>
          )}

          <div className="prem-grid">
            {premCategories.map((p) => {
              const Icon = resolveLucideIcon(p.icon_name);
              return (
                <article key={p.id} className="prem-card" data-accent={p.accent}>
                  <div className="prem-head">
                    <div className="prem-ico">
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <span className="prem-valor">{p.valor}</span>
                  </div>
                  <div className="prem-cat">{p.categoria}</div>
                  <div className="prem-crit">{p.criterio}</div>
                  <div className="prem-details">
                    <div className="prem-detail">
                      <span className="prem-detail-lbl">Exemplos</span>
                      <span className="prem-detail-val">{p.exemplos}</span>
                    </div>
                    <div className="prem-detail">
                      <span className="prem-detail-lbl">Regra</span>
                      <span className="prem-detail-val">{p.regra}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* CHECKLIST CARD */}
      <section
        className={`ck-card${sub === "diario" ? "ck-card--diario" : ""}${sub === "base" ? "ck-card--base" : ""}`}
        data-complete={
          (sub === "diario" || sub === "base") && total > 0 && done === total ? "true" : undefined
        }
        aria-labelledby="ck-title"
      >
        <div className="ck-head">
          <div className="ck-head-title">
            <span className="ck-head-ico" data-accent={meta.accent} aria-hidden>
              {sub === "base" && <Building2 size={22} strokeWidth={1.75} />}
              {sub === "diario" && <Sun size={22} strokeWidth={1.75} />}
              {sub === "premiacao" && <Award size={22} strokeWidth={1.75} />}
            </span>
            <div>
              <div id="ck-title" className="ck-head-name">
                {sub === "base" && "Checklist — Estande"}
                {sub === "diario" && "Checklist — Rotina Diária"}
                {sub === "premiacao" && "Checklist — Premiação"}
              </div>
              <div className="ck-head-desc">
                {sub === "diario"
                  ? "Um passo de cada vez — cada check deixa o stand mais afiado."
                  : sub === "base"
                    ? "Cada item conferido fortalece a base — stand impecável vende mais."
                    : meta.description}
              </div>
            </div>
          </div>
          <div className="ck-head-count" aria-label="Itens conferidos">
            <span className="n">{done}</span>
            <span className="t">/ {total}</span>
            <span className="l">conferidos</span>
          </div>
        </div>

        <div className="ck-progress">
          <div className="ck-progress-bar" data-accent={meta.accent} aria-hidden>
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="ck-progress-meta">
            <span>
              <strong>{percent}%</strong> concluído
            </span>
            <span>
              {(sub === "diario" || sub === "base") && total > 0 && done === total ? (
                <>
                  <Sparkles size={13} strokeWidth={2.25} aria-hidden />{" "}
                  {sub === "base" ? "Base fechada!" : "Dia fechado!"}
                </>
              ) : (
                <>
                  Faltam <strong>{total - done}</strong> itens
                </>
              )}
            </span>
          </div>
        </div>

        {sub === "diario" && total > 0 && done === total && (
          <div className="ck-diario-cheer" role="status">
            <Sparkles size={18} strokeWidth={2} aria-hidden />
            <div>
              <strong>Rotina do dia concluída!</strong>
              <span>Tudo em ordem — bom trabalho. Agora é só validar.</span>
            </div>
          </div>
        )}

        {sub === "base" && total > 0 && done === total && (
          <div className="ck-base-cheer" role="status">
            <Sparkles size={18} strokeWidth={2} aria-hidden />
            <div>
              <strong>Base do estande conferida!</strong>
              <span>Stand impenetrável — valide pra registrar o accountability.</span>
            </div>
          </div>
        )}

        {/* SKIN UNLOCK — só na Base */}
        {sub === "base" && (
          <div className="skin-unlock" data-unlocked={skinUnlocked}>
            <div className="skin-unlock-ico">
              {skinUnlocked ? (
                <Sparkles size={20} strokeWidth={1.75} />
              ) : (
                <Lock size={18} strokeWidth={1.75} />
              )}
            </div>
            <div>
              <div className="skin-unlock-title">
                {skinUnlocked
                  ? "Skin “Arquiteto” desbloqueada!"
                  : "Skin “Arquiteto” — Base Impenetrável"}
              </div>
              <div className="skin-unlock-sub">
                {skinUnlocked
                  ? "Base mínima do estande está em ordem. Segue assim."
                  : `Faltam ${skinRemaining} ${skinRemaining === 1 ? "item" : "itens"} para desbloquear.`}
              </div>
            </div>
          </div>
        )}

        {sub === "base" && baseLoading ? (
          <div className="ck-list ck-list--base" aria-busy="true" aria-live="polite">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ck-item ck-item--skel" aria-hidden>
                <span className="ck-checkbox skel-block" />
                <span className="ck-item-ico skel-block" />
                <span className="ck-item-label skel-line" />
              </div>
            ))}
          </div>
        ) : sub === "base" && baseError ? (
          <div className="ck-error" role="alert">
            {baseError}
          </div>
        ) : sub === "base" && currentItems.length === 0 ? (
          <div className="ck-empty">Nenhum item ativo cadastrado.</div>
        ) : sub === "diario" && diarioLoading ? (
          <div className="ck-list ck-list--single" aria-busy="true" aria-live="polite">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ck-item ck-item--skel" aria-hidden>
                <span className="ck-checkbox skel-block" />
                <span className="ck-item-ico skel-block" />
                <span className="ck-item-label skel-line" />
              </div>
            ))}
          </div>
        ) : sub === "diario" && diarioError ? (
          <div className="ck-error" role="alert">
            {diarioError}
          </div>
        ) : sub === "diario" && currentItems.length === 0 ? (
          <div className="ck-empty">Nenhum item ativo cadastrado.</div>
        ) : sub === "premiacao" && premLoading ? (
          <div className="ck-list" aria-busy="true" aria-live="polite">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="ck-item ck-item--skel" aria-hidden>
                <span className="ck-checkbox skel-block" />
                <span className="ck-item-ico skel-block" />
                <span className="ck-item-label skel-line" />
              </div>
            ))}
          </div>
        ) : sub === "premiacao" && premError ? (
          <div className="ck-error" role="alert">
            {premError}
          </div>
        ) : sub === "premiacao" && currentItems.length === 0 ? (
          <div className="ck-empty">Nenhum item ativo cadastrado.</div>
        ) : (
          <div
            className={`ck-list${sub === "diario" ? "ck-list--diario ck-list--single" : ""}${sub === "base" ? "ck-list--base" : ""}`}
          >
            {currentItems.map((item, index) => {
              const Icon = item.Icon;
              const checked = !!currentMap[item.id];
              const divergent = !!currentDivergent[item.id];
              const lively = sub === "diario" || sub === "base";
              return (
                <label
                  key={item.id}
                  className="ck-item"
                  data-done={checked}
                  data-accent={meta.accent}
                  style={lively ? ({ ["--ck-i" as string]: index } as CSSProperties) : undefined}
                >
                  <input type="checkbox" checked={checked} onChange={() => currentSet(item.id)} />
                  {lively && (
                    <span className="ck-item-step" aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span className="ck-checkbox" aria-hidden>
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                  </span>
                  <span className="ck-item-ico" aria-hidden>
                    <Icon />
                  </span>
                  <span className="ck-item-label">{item.label}</span>
                  {divergent && (
                    <span
                      className="status-pill"
                      data-state="warn"
                      title="Algum estande tem este check diferente"
                    >
                      <AlertCircle size={12} strokeWidth={2.25} />
                      Divergente
                    </span>
                  )}
                  {lively && checked && (
                    <span className="ck-item-done-tag" aria-hidden>
                      Feito
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* VALIDATION LOG */}
      <section className="val-log" aria-label="Histórico de validações">
        <div className="val-log-head">
          <div className="val-log-title">
            <span className="val-log-title-ico" aria-hidden>
              <History size={18} strokeWidth={1.75} />
            </span>
            Histórico de Validações
          </div>
          <div className="sh-meta">
            {log.length === 0 ? "sem registros" : `últimas ${Math.min(10, log.length)}`}
          </div>
        </div>

        {log.length === 0 ? (
          <div className="val-log-empty">
            Nenhuma validação registrada ainda. Clique em <strong>Validar</strong> acima para
            começar.
          </div>
        ) : (
          <div className="val-log-list">
            {log.slice(0, 10).map((entry) => (
              <div key={entry.id} className="val-log-row">
                <span className="val-log-date">{entry.date}</span>
                <span className="val-log-by">
                  por <strong>{entry.by}</strong>
                </span>
                <span className="val-log-type" data-type={entry.type}>
                  {entry.type === "base"
                    ? "Base"
                    : entry.type === "diario"
                      ? "Diário"
                      : "Premiação"}
                </span>
                <span className="val-log-score">
                  {entry.count} / {entry.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <Toast
          key={toast.key}
          kind={toast.kind}
          message={toast.message}
          durationMs={TOAST_DURATION_MS}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
