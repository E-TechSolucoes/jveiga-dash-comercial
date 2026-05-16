"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Handshake,
  Home,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  useAgencies,
  useCreateAgency,
  useDeleteAgency,
  usePatchAgency,
  useValidateAllAgencies,
} from "@/hooks/use-imob";
import {
  STATUS_API_TO_UI,
  STATUS_UI_TO_API,
  type ImobStatusUI,
  type RealEstateAgency,
} from "@/lib/imob/api";

import { Toast, type ToastKind } from "../../_components/toast";

type Imobiliaria = {
  id: string;
  nome: string;
  resp: string;
  tel: string;
  status: ImobStatusUI;
  corretores: number;
  validated: boolean;
};

const STATUS_LIST: ImobStatusUI[] = ["prospect", "visita", "acordo", "ativa"];

const STATUS_LABEL: Record<ImobStatusUI, string> = {
  prospect: "Prospect",
  visita: "Visita",
  acordo: "Acordo",
  ativa: "Ativa",
};

const FUNIL_STAGES: {
  id: ImobStatusUI;
  label: string;
  Icon: LucideIcon;
  accent: "sky" | "amber" | "violet" | "emerald";
}[] = [
  { id: "prospect", label: "Prospect", Icon: Search, accent: "sky" },
  { id: "visita", label: "Visita", Icon: Home, accent: "amber" },
  { id: "acordo", label: "Acordo", Icon: Handshake, accent: "violet" },
  { id: "ativa", label: "Ativa", Icon: CheckCircle2, accent: "emerald" },
];

function fromApi(a: RealEstateAgency): Imobiliaria {
  return {
    id: a.id,
    nome: a.name,
    resp: a.responsible,
    tel: a.phone,
    status: STATUS_API_TO_UI[a.status],
    corretores: a.broker_count,
    validated: a.validated,
  };
}

function extractError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "error" in err) {
    const m = (err as { error?: unknown }).error;
    if (typeof m === "string") return m;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ImobTab() {
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoResp, setNovoResp] = useState("");
  const [novoTel, setNovoTel] = useState("");

  // Rascunho local do input numérico de corretores por imobiliária — um input
  // controlado precisa de feedback imediato; o PATCH debounced sincroniza com
  // o servidor e o rascunho é descartado quando a query revalida.
  const [corretoresDraft, setCorretoresDraft] = useState<Record<string, number>>({});

  // Debounce timers per agency for the corretores number input — avoids one
  // PATCH per keystroke while still feeling instant in the UI.
  const corretoresTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const agenciesQuery = useAgencies();
  const imobs = useMemo<Imobiliaria[]>(
    () => (agenciesQuery.data ?? []).map(fromApi),
    [agenciesQuery.data],
  );
  const loading = agenciesQuery.isLoading;

  const createMutation = useCreateAgency();
  const patchMutation = usePatchAgency();
  const deleteMutation = useDeleteAgency();
  const validateAllMutation = useValidateAllAgencies();

  useEffect(() => {
    const timers = corretoresTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const loadError = agenciesQuery.isError
    ? extractError(agenciesQuery.error, "Falha ao carregar imobiliárias")
    : null;

  const counts = useMemo(() => {
    const acc: Record<ImobStatusUI, number> = {
      prospect: 0,
      visita: 0,
      acordo: 0,
      ativa: 0,
    };
    imobs.forEach((i) => {
      acc[i.status]++;
    });
    return acc;
  }, [imobs]);

  const totalCorretores = useMemo(() => imobs.reduce((sum, i) => sum + i.corretores, 0), [imobs]);

  const addImob = async () => {
    const name = novoNome.trim().toUpperCase();
    if (!name) {
      window.alert("Preencha o nome da imobiliária.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name,
        responsible: novoResp.trim(),
        phone: novoTel.trim(),
      });
      setNovoNome("");
      setNovoResp("");
      setNovoTel("");
    } catch (err: unknown) {
      setToast({ kind: "error", message: extractError(err, "Falha ao cadastrar imobiliária") });
    }
  };

  const setStatus = async (id: string, status: ImobStatusUI) => {
    try {
      await patchMutation.mutateAsync({ id, payload: { status: STATUS_UI_TO_API[status] } });
    } catch (err: unknown) {
      setToast({ kind: "error", message: extractError(err, "Falha ao atualizar status") });
    }
  };

  const setCorretores = (id: string, value: number) => {
    const next = Math.max(0, value);
    setCorretoresDraft((d) => ({ ...d, [id]: next }));

    const timers = corretoresTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      timers.delete(id);
      patchMutation.mutate(
        { id, payload: { broker_count: next } },
        {
          onSuccess: () =>
            setCorretoresDraft((d) => {
              const rest = { ...d };
              delete rest[id];
              return rest;
            }),
          onError: (err: unknown) =>
            setToast({
              kind: "error",
              message: extractError(err, "Falha ao atualizar corretores"),
            }),
        },
      );
    }, 400);
    timers.set(id, t);
  };

  const validate = async (id: string) => {
    try {
      await patchMutation.mutateAsync({ id, payload: { validated: true } });
    } catch (err: unknown) {
      setToast({ kind: "error", message: extractError(err, "Falha ao validar") });
    }
  };

  const validateAll = async () => {
    try {
      await validateAllMutation.mutateAsync();
    } catch (err: unknown) {
      setToast({ kind: "error", message: extractError(err, "Falha ao validar todas") });
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      setToast({ kind: "error", message: extractError(err, "Falha ao remover imobiliária") });
    }
  };

  return (
    <>
      <section className="data-card" data-accent="violet">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">
              <Building2 size={18} strokeWidth={2} /> Cadastrar imobiliária
            </h2>
            <p className="data-card-sub">
              Registre uma nova parceira; ela entra como <strong>prospect</strong> e avança pelo
              funil até virar <strong>ativa</strong>.
            </p>
          </div>
        </header>
        <div className="field-grid field-grid--cols-4">
          <label className="field">
            <span className="field-label">Nome</span>
            <input
              className="field-input"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: VENDEU"
            />
          </label>
          <label className="field">
            <span className="field-label">Responsável</span>
            <input
              className="field-input"
              value={novoResp}
              onChange={(e) => setNovoResp(e.target.value)}
              placeholder="Gerente"
            />
          </label>
          <label className="field">
            <span className="field-label">Telefone</span>
            <input
              className="field-input"
              value={novoTel}
              onChange={(e) => setNovoTel(e.target.value)}
              placeholder="(11) 00000-0000"
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={addImob}>
            <Plus size={15} strokeWidth={2.25} /> Adicionar
          </button>
        </div>
      </section>

      <div className="section-head">
        <div>
          <h2>
            <Sparkles size={18} strokeWidth={2} /> Funil de captação
          </h2>
          <div className="sh-sub">Status das imobiliárias parceiras</div>
        </div>
      </div>

      <div className="kpi-row">
        {FUNIL_STAGES.map((stage) => {
          const Icon = stage.Icon;
          return (
            <article key={stage.id} className="kpi" data-accent={stage.accent}>
              <div className="kpi-head">
                <div className="icon-box">
                  <Icon aria-hidden />
                </div>
                <span className="status-dot" aria-hidden />
              </div>
              <div className="kpi-val">{counts[stage.id]}</div>
              <div className="kpi-label">{stage.label}</div>
              <div className="kpi-sub">
                {counts[stage.id] === 1 ? "imobiliária" : "imobiliárias"}
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-head">
        <div>
          <h2>
            <Users size={18} strokeWidth={2} /> Capacidade da rede
          </h2>
          <div className="sh-sub">Tamanho atual da rede de parceiros</div>
        </div>
      </div>

      <div className="kpi-row">
        <article className="kpi" data-accent="sky">
          <div className="kpi-head">
            <div className="icon-box">
              <Building2 aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{imobs.length}</div>
          <div className="kpi-label">Total de imobiliárias</div>
          <div className="kpi-sub">Parceiras cadastradas</div>
        </article>
        <article className="kpi" data-accent="violet">
          <div className="kpi-head">
            <div className="icon-box">
              <Users aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{totalCorretores}</div>
          <div className="kpi-label">Total de corretores</div>
          <div className="kpi-sub">Soma da rede inteira</div>
        </article>
        <article className="kpi" data-accent="emerald">
          <div className="kpi-head">
            <div className="icon-box">
              <CheckCircle2 aria-hidden />
            </div>
            <span className="status-dot" aria-hidden />
          </div>
          <div className="kpi-val">{counts.ativa}</div>
          <div className="kpi-label">Imobiliárias ativas</div>
          <div className="kpi-sub">Trazendo leads agora</div>
        </article>
      </div>

      <section className="data-card">
        <header className="data-card-head">
          <div>
            <h2 className="data-card-title">Imobiliárias ({imobs.length})</h2>
            <p className="data-card-sub">
              Atualize status e número de corretores ativos por parceira.
            </p>
          </div>
          <button type="button" className="btn btn--success btn--sm" onClick={validateAll}>
            <ShieldCheck size={14} strokeWidth={2.25} /> Validar todas
          </button>
        </header>

        {loadError ? (
          <div className="data-empty">{loadError}</div>
        ) : loading ? (
          <div className="data-empty">Carregando imobiliárias…</div>
        ) : imobs.length === 0 ? (
          <div className="data-empty">Nenhuma imobiliária cadastrada ainda.</div>
        ) : (
          <ul className="imob-list">
            {imobs.map((im) => (
              <li key={im.id} className="imob-card" data-status={im.status}>
                <div className="imob-card-info">
                  <div className="imob-card-name">{im.nome}</div>
                  <div className="imob-card-meta">
                    <span>{im.resp || "—"}</span>
                    <span className="dot-sep" aria-hidden>
                      ·
                    </span>
                    <span className="imob-card-tel">{im.tel || "—"}</span>
                  </div>
                </div>

                <label className="field field--inline">
                  <span className="field-label">Corretores</span>
                  <input
                    type="number"
                    min={0}
                    className="field-input field-input--narrow"
                    value={corretoresDraft[im.id] ?? im.corretores}
                    onChange={(e) => setCorretores(im.id, Number(e.target.value) || 0)}
                  />
                </label>

                <select
                  className="status-select status-select--lg"
                  value={im.status}
                  onChange={(e) => setStatus(im.id, e.target.value as ImobStatusUI)}
                  data-status={im.status}
                >
                  {STATUS_LIST.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>

                {im.validated ? (
                  <span className="status-pill" data-state="ok">
                    <ShieldCheck size={12} strokeWidth={2} /> Salvo
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--success btn--xs"
                    onClick={() => validate(im.id)}
                  >
                    <Check size={12} strokeWidth={2.25} /> Validar
                  </button>
                )}

                <button
                  type="button"
                  className="icon-action icon-action--danger"
                  onClick={() => remove(im.id)}
                  aria-label={`Remover ${im.nome}`}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
