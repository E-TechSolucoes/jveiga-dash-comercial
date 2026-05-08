"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import {
  CHECKLIST_META,
  SKIN_ARQUITETO_THRESHOLD,
  type CheckItem,
  type ChecklistType,
  type ValidationLogEntry,
} from "./check-data";
import { resolveLucideIcon } from "./stand-check-items";
import { fetchPremiacoesCategories, type PremiacaoCategoryDTO } from "./premiacoes-categories";
import {
  fetchStandCheckItemsToday,
  formatDayLabel,
  replaceStandCheckActivity,
  type ReplaceStandCheckActivityBody,
} from "./stand-check-activity";
import {
  fetchDailyCheckItemsToday,
  replaceDailyCheckActivity,
  type ReplaceDailyCheckActivityBody,
} from "./check-items-daily-activity";
import {
  fetchAwardCheckItemsToday,
  replaceAwardCheckActivity,
  type ReplaceAwardCheckActivityBody,
} from "./check-items-award-activity";
import { Toast, type ToastKind } from "./toast";

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

const SUB_TABS: {
  id: ChecklistType;
  label: string;
  Icon: LucideIcon;
  variant: "emerald" | "blue" | "amber";
}[] = [
  { id: "base", label: "Base do Estande", Icon: Building2, variant: "emerald" },
  { id: "diario", label: "Rotina Diária", Icon: Calendar, variant: "blue" },
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

export function CheckTab({ comercialName, empreendimentoIds }: Props) {
  // Primeiro id selecionado dirige reads. PUT escreve em todos via array.
  const empreendimentoId = empreendimentoIds[0] ?? null;

  const [sub, setSub] = useState<ChecklistType>("base");

  const [log, setLog] = useState<ValidationLogEntry[]>([]);

  // Estande (base) — granularidade DIÁRIA. O backend mantém uma linha por
  // (user_id, day) com items[] em JSONB. O GET unificado já devolve o
  // catálogo mesclado com o estado de hoje para o usuário do JWT.
  const [baseItems, setBaseItems] = useState<CheckItem[]>([]);
  const [baseChecks, setBaseChecks] = useState<StateMap>({});
  const [baseItemIds, setBaseItemIds] = useState<Record<string, string>>({});
  const [baseDay, setBaseDay] = useState<string | null>(null);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [baseSaveError, setBaseSaveError] = useState<string | null>(null);
  const [baseSaving, setBaseSaving] = useState(false);

  // Rotina Diária — mesma arquitetura do estande, paths /check-items-daily.
  const [diarioItems, setDiarioItems] = useState<CheckItem[]>([]);
  const [diarioMap, setDiarioMap] = useState<StateMap>({});
  const [diarioItemIds, setDiarioItemIds] = useState<Record<string, string>>({});
  const [diarioDay, setDiarioDay] = useState<string | null>(null);
  const [diarioLoading, setDiarioLoading] = useState(true);
  const [diarioError, setDiarioError] = useState<string | null>(null);
  const [diarioSaveError, setDiarioSaveError] = useState<string | null>(null);
  const [diarioSaving, setDiarioSaving] = useState(false);

  // Premiação — mesma arquitetura, paths /check-items-award.
  const [premItems, setPremItems] = useState<CheckItem[]>([]);
  const [premMap, setPremMap] = useState<StateMap>({});
  const [premItemIds, setPremItemIds] = useState<Record<string, string>>({});
  const [premDay, setPremDay] = useState<string | null>(null);
  const [premLoading, setPremLoading] = useState(true);
  const [premError, setPremError] = useState<string | null>(null);
  const [premSaveError, setPremSaveError] = useState<string | null>(null);
  const [premSaving, setPremSaving] = useState(false);

  // Premiação · cards de categoria (Indicações/Pastas/Vendas/Corujão...).
  // Vêm do catálogo `premiacoes_categories` por empreendimento.
  const [premCategories, setPremCategories] = useState<PremiacaoCategoryDTO[]>([]);
  const [premCategoriesError, setPremCategoriesError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    kind: ToastKind;
    message: string;
    key: number;
  } | null>(null);

  // user_id é resolvido pelo backend via JWT — o front não passa nada.
  // O nome digitado no topo é só rótulo do log local.

  useEffect(() => {
    if (sub !== "base") return;

    queueMicrotask(() => {
      setBaseLoading(true);
    });
    const ctrl = new AbortController();
    fetchStandCheckItemsToday(empreendimentoId, ctrl.signal)
      .then((items) => {
        const renderItems: CheckItem[] = [];
        const checks: StateMap = {};
        const ids: Record<string, string> = {};
        for (const it of items) {
          renderItems.push({
            id: it.code,
            label: it.label,
            Icon: resolveLucideIcon(it.icon_name),
          });
          checks[it.code] = it.is_checked;
          ids[it.code] = it.id;
        }
        setBaseItems(renderItems);
        setBaseChecks(checks);
        setBaseItemIds(ids);
        setBaseDay(new Date().toISOString().slice(0, 10));
        setBaseError(null);
        setBaseSaveError(null);
        setBaseLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBaseError(err instanceof Error ? err.message : "Erro ao carregar itens");
        setBaseLoading(false);
      });

    return () => ctrl.abort();
  }, [sub, empreendimentoId]);

  useEffect(() => {
    if (sub !== "diario") return;

    queueMicrotask(() => {
      setDiarioLoading(true);
    });
    const ctrl = new AbortController();
    fetchDailyCheckItemsToday(empreendimentoId, ctrl.signal)
      .then((items) => {
        const renderItems: CheckItem[] = [];
        const checks: StateMap = {};
        const ids: Record<string, string> = {};
        for (const it of items) {
          renderItems.push({
            id: it.code,
            label: it.label,
            Icon: resolveLucideIcon(it.icon_name),
          });
          checks[it.code] = it.is_checked;
          ids[it.code] = it.id;
        }
        setDiarioItems(renderItems);
        setDiarioMap(checks);
        setDiarioItemIds(ids);
        setDiarioDay(new Date().toISOString().slice(0, 10));
        setDiarioError(null);
        setDiarioSaveError(null);
        setDiarioLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDiarioError(err instanceof Error ? err.message : "Erro ao carregar itens");
        setDiarioLoading(false);
      });

    return () => ctrl.abort();
  }, [sub, empreendimentoId]);

  useEffect(() => {
    if (sub !== "premiacao") return;
    if (empreendimentoId == null) return;
    const ctrl = new AbortController();
    fetchPremiacoesCategories(empreendimentoId, ctrl.signal)
      .then((cats) => {
        setPremCategories(cats ?? []);
        setPremCategoriesError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPremCategoriesError(
          err instanceof Error ? err.message : "Erro ao carregar categorias de premiação",
        );
      });
    return () => ctrl.abort();
  }, [sub, empreendimentoId]);

  useEffect(() => {
    if (sub !== "premiacao") return;

    const ctrl = new AbortController();
    fetchAwardCheckItemsToday(ctrl.signal)
      .then((items) => {
        const renderItems: CheckItem[] = [];
        const checks: StateMap = {};
        const ids: Record<string, string> = {};
        for (const it of items) {
          renderItems.push({
            id: it.code,
            label: it.label,
            Icon: resolveLucideIcon(it.icon_name),
          });
          checks[it.code] = it.is_checked;
          ids[it.code] = it.id;
        }
        setPremItems(renderItems);
        setPremMap(checks);
        setPremItemIds(ids);
        setPremDay(new Date().toISOString().slice(0, 10));
        setPremError(null);
        setPremSaveError(null);
        setPremLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPremError(err instanceof Error ? err.message : "Erro ao carregar itens");
        setPremLoading(false);
      });

    return () => ctrl.abort();
  }, [sub]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

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
    if (baseSaving) return;
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
    setBaseSaving(true);

    try {
      const updated = await replaceStandCheckActivity({
        empreendimento_ids: empreendimentoIds.length > 0 ? empreendimentoIds : [empreendimentoId],
        items: itemsBody,
      });

      // Resincroniza com a resposta (checked_at populado pelo servidor).
      const byID = new Map(updated.items.map((e) => [e.item_id, e]));
      setBaseChecks((prev) => {
        const next = { ...prev };
        for (const item of baseItems) {
          const itemId = baseItemIds[item.id];
          if (!itemId) continue;
          const entry = byID.get(itemId);
          if (entry) next[item.id] = entry.is_checked;
        }
        return next;
      });
      setBaseDay(updated.day.slice(0, 10));
      showToast("success", "Checklist da base salvo com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar checks";
      setBaseSaveError(msg);
      showToast("error", msg);
    } finally {
      setBaseSaving(false);
    }
  };

  const validateDiario = async () => {
    if (diarioSaving) return;
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
    setDiarioSaving(true);

    try {
      const updated = await replaceDailyCheckActivity({
        empreendimento_ids: empreendimentoIds.length > 0 ? empreendimentoIds : [empreendimentoId],
        items: itemsBody,
      });

      const byID = new Map(updated.items.map((e) => [e.item_id, e]));
      setDiarioMap((prev) => {
        const next = { ...prev };
        for (const item of diarioItems) {
          const itemId = diarioItemIds[item.id];
          if (!itemId) continue;
          const entry = byID.get(itemId);
          if (entry) next[item.id] = entry.is_checked;
        }
        return next;
      });
      setDiarioDay(updated.day.slice(0, 10));
      showToast("success", "Rotina diária salva com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar checks";
      setDiarioSaveError(msg);
      showToast("error", msg);
    } finally {
      setDiarioSaving(false);
    }
  };

  const validatePrem = async () => {
    if (premSaving) return;

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
    setPremSaving(true);

    try {
      const updated = await replaceAwardCheckActivity({
        items: itemsBody,
      });

      const byID = new Map(updated.items.map((e) => [e.item_id, e]));
      setPremMap((prev) => {
        const next = { ...prev };
        for (const item of premItems) {
          const itemId = premItemIds[item.id];
          if (!itemId) continue;
          const entry = byID.get(itemId);
          if (entry) next[item.id] = entry.is_checked;
        }
        return next;
      });
      setPremDay(updated.day.slice(0, 10));
      showToast("success", "Premiação salva com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar checks";
      setPremSaveError(msg);
      showToast("error", msg);
    } finally {
      setPremSaving(false);
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
            (sub === "premiacao" && premSaving)
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
        <div className="info-banner">
          <Info size={16} strokeWidth={2} />
          <div>
            Controle <strong>diário</strong>
            {baseDayLabel ? (
              <>
                {" "}
                — hoje, <strong>{baseDayLabel}</strong>
              </>
            ) : null}
            . Marque os itens conferidos e clique em <strong>Validar base (estande)</strong> para
            salvar no banco. Cada dia tem sua foto independente.
          </div>
        </div>
      )}

      {/* INFO BANNER — DIÁRIO */}
      {sub === "diario" && (
        <div className="info-banner">
          <Info size={16} strokeWidth={2} />
          <div>
            Controle <strong>diário</strong>
            {diarioDayLabel ? (
              <>
                {" "}
                — hoje, <strong>{diarioDayLabel}</strong>
              </>
            ) : null}
            . Marque as cobranças concluídas e clique em <strong>Validar diário</strong> para salvar
            no banco. Cada dia tem sua foto independente.
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
      <section className="ck-card" aria-labelledby="ck-title">
        <div className="ck-head">
          <div className="ck-head-title">
            <span className="ck-head-ico" data-accent={meta.accent} aria-hidden>
              {sub === "base" && <ClipboardCheck size={22} strokeWidth={1.75} />}
              {sub === "diario" && <BadgeCheck size={22} strokeWidth={1.75} />}
              {sub === "premiacao" && <Award size={22} strokeWidth={1.75} />}
            </span>
            <div>
              <div id="ck-title" className="ck-head-name">
                {sub === "base" && "Checklist — Estande"}
                {sub === "diario" && "Checklist — Rotina Diária"}
                {sub === "premiacao" && "Checklist — Premiação"}
              </div>
              <div className="ck-head-desc">{meta.description}</div>
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
              Faltam <strong>{total - done}</strong> itens
            </span>
          </div>
        </div>

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
          <div className="ck-list" aria-busy="true" aria-live="polite">
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
          <div className={`ck-list${sub === "diario" ? "ck-list--single" : ""}`}>
            {currentItems.map((item) => {
              const Icon = item.Icon;
              const checked = !!currentMap[item.id];
              return (
                <label
                  key={item.id}
                  className="ck-item"
                  data-done={checked}
                  data-accent={meta.accent}
                >
                  <input type="checkbox" checked={checked} onChange={() => currentSet(item.id)} />
                  <span className="ck-checkbox" aria-hidden>
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                  </span>
                  <span className="ck-item-ico" aria-hidden>
                    <Icon />
                  </span>
                  <span className="ck-item-label">{item.label}</span>
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
