"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  Flame,
  History,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
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

const QUEST_XP_PER: Record<ChecklistType, number> = {
  diario: 25,
  base: 20,
  premiacao: 30,
};

type QuestStage = { at: number; id: string; short: string };

const QUEST_STAGES: Record<ChecklistType, readonly QuestStage[]> = {
  diario: [
    { at: 0, id: "lobby", short: "Lobby" },
    { at: 25, id: "campo", short: "Campo" },
    { at: 50, id: "ritmo", short: "Ritmo" },
    { at: 75, id: "boss", short: "Boss" },
    { at: 100, id: "lendario", short: "Lendário" },
  ],
  base: [
    { at: 0, id: "lobby", short: "Lobby" },
    { at: 25, id: "fundacao", short: "Fundação" },
    { at: 50, id: "muros", short: "Muros" },
    { at: 75, id: "torre", short: "Torre" },
    { at: 100, id: "blindado", short: "Blindado" },
  ],
  premiacao: [
    { at: 0, id: "lobby", short: "Lobby" },
    { at: 25, id: "setup", short: "Setup" },
    { at: 50, id: "palco", short: "Palco" },
    { at: 75, id: "spotlight", short: "Spotlight" },
    { at: 100, id: "lendario", short: "Lendário" },
  ],
};

type QuestMeta = {
  percent: number;
  xp: number;
  xpMax: number;
  xpPer: number;
  stageId: string;
  stage: string;
  tip: string;
  rank: string;
  stages: readonly QuestStage[];
  eyebrow: string;
  title: string;
  missionTitle: string;
  winTitle: string;
  winHint: string;
  runLabel: string;
};

function buildQuestMeta(kind: ChecklistType, done: number, total: number): QuestMeta {
  const xpPer = QUEST_XP_PER[kind];
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const xp = done * xpPer;
  const xpMax = Math.max(total, 1) * xpPer;
  const stages = QUEST_STAGES[kind];

  const copy =
    kind === "base"
      ? {
          eyebrow: "Fortaleza do stand",
          title: "Base impenetrável",
          missionTitle: "Missão — Base do Estande",
          winTitle: "Fortaleza concluída!",
          winHint: "valide pra blindar o accountability",
          runLabel: "da fortaleza",
          tiers: [
            {
              min: 100,
              stageId: "blindado",
              stage: "Stand blindado",
              tip: "Base impenetrável — valide e registre.",
              rank: "S",
            },
            {
              min: 75,
              stageId: "torre",
              stage: "Torre alta",
              tip: "Quase blindado — últimos checks da base.",
              rank: "A",
            },
            {
              min: 50,
              stageId: "muros",
              stage: "Muros firmes",
              tip: "Metade da fortaleza — mantém o combo.",
              rank: "B",
            },
            {
              min: 25,
              stageId: "fundacao",
              stage: "Fundação",
              tip: "Base em construção — um tijolo por vez.",
              rank: "C",
            },
            {
              min: 1,
              stageId: "aquecimento",
              stage: "Abrindo obra",
              tip: "Combo iniciado — segue conferindo.",
              rank: "D",
            },
            {
              min: 0,
              stageId: "lobby",
              stage: "Lobby",
              tip: "Toque o 1º item e comece a fortaleza.",
              rank: "—",
            },
          ],
        }
      : kind === "premiacao"
        ? {
            eyebrow: "Ritual de ouro",
            title: "Cerimônia de terça",
            missionTitle: "Missão — Premiação Semanal",
            winTitle: "Cerimônia lendária!",
            winHint: "valide pra gravar o ritual no log",
            runLabel: "do ritual",
            tiers: [
              {
                min: 100,
                stageId: "lendario",
                stage: "Ritual lendário",
                tip: "Cerimônia pronta — valide e feche o dia.",
                rank: "S",
              },
              {
                min: 75,
                stageId: "spotlight",
                stage: "Spotlight",
                tip: "Quase no palco — últimos preparativos.",
                rank: "A",
              },
              {
                min: 50,
                stageId: "palco",
                stage: "Palco montado",
                tip: "Metade do ritual — mantém o combo.",
                rank: "B",
              },
              {
                min: 25,
                stageId: "setup",
                stage: "Setup",
                tip: "Preparativos em andamento.",
                rank: "C",
              },
              {
                min: 1,
                stageId: "aquecimento",
                stage: "Aquecendo",
                tip: "Combo iniciado — segue o checklist.",
                rank: "D",
              },
              {
                min: 0,
                stageId: "lobby",
                stage: "Lobby",
                tip: "Toque o 1º item e comece o ritual.",
                rank: "—",
              },
            ],
          }
        : {
            eyebrow: "Missão do stand",
            title: "Run de hoje",
            missionTitle: "Missão — Rotina Diária",
            winTitle: "Missão do dia concluída!",
            winHint: "valide pra fechar a run no log",
            runLabel: "da run",
            tiers: [
              {
                min: 100,
                stageId: "lendario",
                stage: "Dia lendário",
                tip: "Run completa — valide e grave o accountability.",
                rank: "S",
              },
              {
                min: 75,
                stageId: "boss",
                stage: "Boss final",
                tip: "Últimos checks — fecha a missão do dia.",
                rank: "A",
              },
              {
                min: 50,
                stageId: "ritmo",
                stage: "Ritmo alto",
                tip: "Metade feita — mantém o combo ligado.",
                rank: "B",
              },
              {
                min: 25,
                stageId: "campo",
                stage: "Em campo",
                tip: "Missão em andamento — um check de cada vez.",
                rank: "C",
              },
              {
                min: 1,
                stageId: "aquecimento",
                stage: "Aquecendo",
                tip: "Combo iniciado — continua marcando.",
                rank: "D",
              },
              {
                min: 0,
                stageId: "lobby",
                stage: "Lobby",
                tip: "Toque o 1º item e comece a run do stand.",
                rank: "—",
              },
            ],
          };

  const tier = copy.tiers.find((t) => percent >= t.min) ?? copy.tiers[copy.tiers.length - 1]!;

  return {
    percent,
    xp,
    xpMax,
    xpPer,
    stageId: tier.stageId,
    stage: tier.stage,
    tip: tier.tip,
    rank: tier.rank,
    stages,
    eyebrow: copy.eyebrow,
    title: copy.title,
    missionTitle: copy.missionTitle,
    winTitle: copy.winTitle,
    winHint: copy.winHint,
    runLabel: copy.runLabel,
  };
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
  const quest = useMemo(() => buildQuestMeta(sub, done, total), [sub, done, total]);
  const questTheme = sub === "base" ? "base" : sub === "premiacao" ? "prem" : "diario";

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

      {/* QUEST BANNER */}
      <div
        className={[
          "ck-quest-banner",
          sub === "diario" ? "ck-quest-banner--diario" : "",
          sub === "base" ? "ck-quest-banner--base" : "",
          sub === "premiacao" ? "ck-quest-banner--prem" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-theme={questTheme}
        data-stage={quest.stageId}
      >
        <div className="ck-quest-banner-ico" aria-hidden>
          {quest.percent >= 100 ? (
            <Trophy size={22} strokeWidth={2} />
          ) : quest.percent >= 50 ? (
            <Flame size={22} strokeWidth={2} />
          ) : sub === "base" ? (
            <Building2 size={22} strokeWidth={2} />
          ) : sub === "premiacao" ? (
            <Trophy size={22} strokeWidth={2} />
          ) : (
            <Target size={22} strokeWidth={2} />
          )}
        </div>
        <div className="ck-quest-banner-body">
          <div className="ck-quest-banner-eyebrow">
            <Zap size={11} strokeWidth={2.5} aria-hidden /> {quest.eyebrow}
          </div>
          <div className="ck-quest-banner-title">
            {quest.title}
            {(sub === "diario" ? diarioDayLabel : sub === "base" ? baseDayLabel : premDayLabel) ? (
              <>
                {" "}
                ·{" "}
                <em>
                  {sub === "diario" ? diarioDayLabel : sub === "base" ? baseDayLabel : premDayLabel}
                </em>
              </>
            ) : null}
          </div>
          <p className="ck-quest-banner-text">
            Fase atual: <strong>{quest.stage}</strong> — {quest.tip}
          </p>
          <div className="ck-quest-stages" aria-label="Estágios da missão">
            {quest.stages.map((s) => {
              const reached = quest.percent >= s.at;
              const currentAt =
                [...quest.stages].reverse().find((x) => quest.percent >= x.at)?.at ?? 0;
              return (
                <span
                  key={s.id}
                  className="ck-quest-stage"
                  data-reached={reached}
                  data-current={s.at === currentAt || undefined}
                >
                  <i aria-hidden />
                  {s.short}
                </span>
              );
            })}
          </div>
        </div>
        <div className="ck-quest-banner-hud" aria-hidden>
          <div className="ck-quest-rank" data-rank={quest.rank}>
            <small>Rank</small>
            <strong>{quest.rank}</strong>
          </div>
          <div className="ck-quest-chip">
            <span>{quest.xp}</span>
            <small>XP</small>
          </div>
        </div>
      </div>

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
        className={[
          "ck-card",
          sub === "diario" ? "ck-card--diario" : "",
          sub === "base" ? "ck-card--base" : "",
          sub === "premiacao" ? "ck-card--prem" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-complete={total > 0 && done === total ? "true" : undefined}
        data-stage={quest.stageId}
        data-theme={questTheme}
        aria-labelledby="ck-title"
      >
        <div className="ck-head">
          <div className="ck-head-title">
            <span className="ck-head-ico" data-accent={meta.accent} aria-hidden>
              {sub === "base" && <Building2 size={22} strokeWidth={1.75} />}
              {sub === "diario" && <Flame size={22} strokeWidth={1.75} />}
              {sub === "premiacao" && <Trophy size={22} strokeWidth={1.75} />}
            </span>
            <div>
              <div id="ck-title" className="ck-head-name">
                {quest.missionTitle}
              </div>
              <div className="ck-head-desc">
                Cada check vale {quest.xpPer} XP · fase {quest.stage}
              </div>
            </div>
          </div>
          <div
            className="ck-quest-xp-badge"
            data-theme={questTheme}
            aria-label={`${quest.xp} de ${quest.xpMax} XP`}
          >
            <Zap size={14} strokeWidth={2.5} aria-hidden />
            <span className="n">{quest.xp}</span>
            <span className="t">/ {quest.xpMax} XP</span>
          </div>
        </div>

        <div className="ck-quest-xp" data-theme={questTheme}>
          <div className="ck-quest-xp-top">
            <span className="ck-quest-xp-label">
              <Star size={13} strokeWidth={2.25} aria-hidden />
              Barra de XP
            </span>
            <span className="ck-quest-xp-pct">
              <strong>{quest.percent}%</strong> {quest.runLabel}
            </span>
          </div>
          <div className="ck-quest-xp-track" aria-hidden>
            <span className="ck-quest-xp-fill" style={{ width: `${quest.percent}%` }} />
            {quest.stages
              .filter((s) => s.at > 0)
              .map((s) => (
                <i
                  key={s.id}
                  className="ck-quest-xp-mark"
                  data-reached={quest.percent >= s.at}
                  style={{ left: `${s.at}%` }}
                />
              ))}
          </div>
          <div className="ck-quest-xp-meta">
            <span>
              {quest.percent >= 100 ? (
                <>
                  <Sparkles size={13} strokeWidth={2.25} aria-hidden /> Missão concluída!
                </>
              ) : (
                <>
                  Faltam <strong>{total - done}</strong> checks · +{(total - done) * quest.xpPer} XP
                </>
              )}
            </span>
            <span className="ck-quest-combo" data-on={done > 0 && done < total}>
              <Flame size={13} strokeWidth={2.25} aria-hidden />
              {done > 0 && done < total
                ? `Combo ×${done}`
                : done === total && total > 0
                  ? "Combo max"
                  : "Sem combo"}
            </span>
          </div>
        </div>

        {total > 0 && done === total && (
          <div className="ck-quest-cheer" data-theme={questTheme} role="status">
            <div className="ck-quest-cheer-burst" aria-hidden />
            <div className="ck-quest-cheer-rank" data-rank="S" aria-hidden>
              S
            </div>
            <div>
              <strong>{quest.winTitle}</strong>
              <span>
                Rank S · {quest.xp} XP conquistados — {quest.winHint}.
              </span>
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
          <div
            className="ck-list ck-list--base ck-list--quest ck-list--single"
            aria-busy="true"
            aria-live="polite"
          >
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
          <div
            className="ck-list ck-list--diario ck-list--quest ck-list--single"
            aria-busy="true"
            aria-live="polite"
          >
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
          <div
            className="ck-list ck-list--prem ck-list--quest ck-list--single"
            aria-busy="true"
            aria-live="polite"
          >
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
            className={[
              "ck-list",
              "ck-list--quest",
              "ck-list--single",
              sub === "diario" ? "ck-list--diario" : "",
              sub === "base" ? "ck-list--base" : "",
              sub === "premiacao" ? "ck-list--prem" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-theme={questTheme}
          >
            {currentItems.map((item, index) => {
              const Icon = item.Icon;
              const checked = !!currentMap[item.id];
              const divergent = !!currentDivergent[item.id];
              const isNext =
                !checked && currentItems.findIndex((it) => !currentMap[it.id]) === index;
              return (
                <label
                  key={item.id}
                  className="ck-item"
                  data-done={checked}
                  data-accent={meta.accent}
                  data-next={isNext || undefined}
                  style={{ ["--ck-i" as string]: index } as CSSProperties}
                >
                  <input type="checkbox" checked={checked} onChange={() => currentSet(item.id)} />
                  <span className="ck-item-step" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
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
                  {!checked && isNext && (
                    <span className="ck-item-quest-tag" aria-hidden>
                      Próximo
                    </span>
                  )}
                  {checked && (
                    <span className="ck-item-done-tag ck-item-done-tag--xp" aria-hidden>
                      <Zap size={11} strokeWidth={2.5} /> +{quest.xpPer} XP
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
