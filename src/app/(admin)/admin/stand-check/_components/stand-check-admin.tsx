"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
  icons as LucideIcons,
  type LucideIcon,
} from "lucide-react";

const PAGE_SIZE = 10;

type StandCheckItem = {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
};

type EditingState = { mode: "create" } | { mode: "edit"; id: string };

const EMPTY_FORM: FormState = {
  code: "",
  label: "",
  icon_name: "",
  display_order: 0,
  is_active: true,
};

const LucideIconMap = LucideIcons as unknown as Record<string, LucideIcon>;

function ItemIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = LucideIconMap[name];
  if (!Icon) return <CircleSlash size={size} strokeWidth={1.75} />;
  return <Icon size={size} strokeWidth={1.75} />;
}

type ApiError = {
  error?: string;
  code?: string;
  fields?: Record<string, string[]>;
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ApiError;
    if (data.fields) {
      const parts = Object.entries(data.fields).map(
        ([field, reasons]) => `${field}: ${reasons.join(", ")}`,
      );
      return parts.join(" · ");
    }
    return data.error ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

export function StandCheckAdmin() {
  const [items, setItems] = useState<StandCheckItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/stand-check-items?empreendimento_id=347", {
        cache: "no-store",
      });
      if (!res.ok) {
        setErr(await parseError(res));
        return;
      }
      const data = (await res.json()) as StandCheckItem[];
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao carregar itens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      void reload();
    });
    return () => cancelAnimationFrame(t);
  }, []);

  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort(
      (a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at),
    );
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.icon_name.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setPage(1);
  };

  const startCreate = () => {
    const nextOrder =
      items && items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 0;
    setForm({ ...EMPTY_FORM, display_order: nextOrder });
    setSubmitErr(null);
    setEditing({ mode: "create" });
  };

  const startEdit = (item: StandCheckItem) => {
    setForm({
      code: item.code,
      label: item.label,
      icon_name: item.icon_name,
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setSubmitErr(null);
    setEditing({ mode: "edit", id: item.id });
  };

  const closeForm = () => {
    setEditing(null);
    setSubmitErr(null);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const url =
        editing.mode === "create"
          ? "/api/admin/stand-check-items"
          : `/api/admin/stand-check-items/${editing.id}`;
      const method = editing.mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editing.mode === "create" ? { empreendimento_id: 347 } : {}),
          code: form.code.trim(),
          label: form.label.trim(),
          icon_name: form.icon_name.trim(),
          display_order: form.display_order,
          is_active: form.is_active,
        }),
      });
      if (!res.ok) {
        setSubmitErr(await parseError(res));
        return;
      }
      closeForm();
      await reload();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Falha ao salvar item");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: StandCheckItem) => {
    const ok = window.confirm(
      `Excluir o item "${item.label}" (${item.code})? Essa ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/admin/stand-check-items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        setErr(await parseError(res));
        return;
      }
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao excluir item");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Base do Estande</h1>
          <p>
            Itens exibidos na sub-aba <strong>Base do Estande</strong> da aba Check.
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => void reload()}
            disabled={loading}
            aria-label="Recarregar"
          >
            <RefreshCcw size={14} strokeWidth={2} />
            Recarregar
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={startCreate}>
            <Plus size={14} strokeWidth={2.25} />
            Novo item
          </button>
        </div>
      </header>

      {err && (
        <div className="admin-alert" role="alert">
          <AlertTriangle size={16} strokeWidth={2} />
          <span>{err}</span>
        </div>
      )}

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <label className="admin-search">
            <Search size={15} strokeWidth={1.85} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar por código, rótulo ou ícone…"
              aria-label="Buscar itens"
              disabled={loading && !items}
            />
          </label>
          <span className="admin-toolbar-info" aria-live="polite">
            {loading && !items
              ? "Carregando…"
              : `${filtered.length} ${filtered.length === 1 ? "item" : "itens"}`}
          </span>
        </div>

        {loading && !items ? (
          <table className="admin-table admin-table--skel" aria-busy="true">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th style={{ width: 64 }}>Ícone</th>
                <th>Código</th>
                <th>Rótulo</th>
                <th style={{ width: 120 }}>Ativo</th>
                <th style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="admin-row-skel">
                  <td>
                    <span className="sk sk-line sk-line--xs" aria-hidden />
                  </td>
                  <td>
                    <span className="sk sk-icon" aria-hidden />
                  </td>
                  <td>
                    <span className="sk sk-line sk-line--sm" aria-hidden />
                  </td>
                  <td>
                    <span className="sk sk-line sk-line--lg" aria-hidden />
                  </td>
                  <td>
                    <span className="sk sk-chip" aria-hidden />
                  </td>
                  <td>
                    <span className="sk sk-line sk-line--md" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : sorted.length === 0 ? (
          <div className="admin-empty">
            Nenhum item cadastrado ainda. Clique em <strong>Novo item</strong> para começar.
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">Nenhum item encontrado para “{query}”.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th style={{ width: 64 }}>Ícone</th>
                <th>Código</th>
                <th>Rótulo</th>
                <th style={{ width: 120 }}>Ativo</th>
                <th style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} data-inactive={item.is_active ? "false" : "true"}>
                  <td className="admin-table-num">{item.display_order}</td>
                  <td>
                    <span className="admin-icon-pill" title={item.icon_name}>
                      <ItemIcon name={item.icon_name} />
                    </span>
                  </td>
                  <td>
                    <code className="admin-code">{item.code}</code>
                  </td>
                  <td>{item.label}</td>
                  <td>
                    {item.is_active ? (
                      <span className="admin-badge admin-badge--ok">
                        <Check size={12} strokeWidth={2.5} /> Ativo
                      </span>
                    ) : (
                      <span className="admin-badge admin-badge--off">
                        <X size={12} strokeWidth={2.5} /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => startEdit(item)}
                      aria-label={`Editar ${item.label}`}
                      title="Editar"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--danger"
                      onClick={() => void remove(item)}
                      disabled={deletingId === item.id}
                      aria-label={`Excluir ${item.label}`}
                      title="Excluir"
                    >
                      {deletingId === item.id ? (
                        <Loader2 size={14} strokeWidth={2} className="admin-spin" />
                      ) : (
                        <Trash2 size={14} strokeWidth={2} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && items && filtered.length > 0 && (
          <div className="admin-pager">
            <span className="admin-pager-info">
              Mostrando <strong>{pageStart + 1}</strong>–
              <strong>{Math.min(pageStart + PAGE_SIZE, filtered.length)}</strong> de{" "}
              <strong>{filtered.length}</strong>
            </span>
            <div className="admin-pager-actions">
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <span className="admin-pager-page">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </section>

      {editing && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <form className="admin-modal" onSubmit={submit}>
            <header className="admin-modal-head">
              <h2 id="admin-form-title">
                {editing.mode === "create" ? "Novo item" : "Editar item"}
              </h2>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={closeForm}
                aria-label="Fechar"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </header>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span className="admin-label">
                  Código <span className="admin-req">*</span>
                </span>
                <input
                  className="admin-input"
                  type="text"
                  required
                  maxLength={40}
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="banner"
                />
                <span className="admin-hint">Único, max 40 caracteres.</span>
              </label>

              <label className="admin-field">
                <span className="admin-label">
                  Rótulo <span className="admin-req">*</span>
                </span>
                <input
                  className="admin-input"
                  type="text"
                  required
                  maxLength={160}
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Banner principal"
                />
              </label>

              <label className="admin-field">
                <span className="admin-label">
                  Ícone (Lucide) <span className="admin-req">*</span>
                </span>
                <div className="admin-icon-row">
                  <input
                    className="admin-input"
                    type="text"
                    required
                    maxLength={40}
                    value={form.icon_name}
                    onChange={(e) => setForm((f) => ({ ...f, icon_name: e.target.value }))}
                    placeholder="Flag"
                  />
                  <span className="admin-icon-preview" aria-hidden>
                    <ItemIcon name={form.icon_name} size={18} />
                  </span>
                </div>
                <span className="admin-hint">
                  Nome do ícone no{" "}
                  <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer">
                    lucide.dev
                  </a>
                  , ex: <code>Flag</code>, <code>LayoutGrid</code>.
                </span>
              </label>

              <label className="admin-field">
                <span className="admin-label">Ordem</span>
                <input
                  className="admin-input"
                  type="number"
                  step={1}
                  min={-32768}
                  max={32767}
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      display_order: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>

              <label className="admin-field admin-field--row">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span className="admin-label" style={{ marginBottom: 0 }}>
                  Item ativo
                </span>
              </label>
            </div>

            {submitErr && (
              <div className="admin-alert" role="alert">
                <AlertTriangle size={16} strokeWidth={2} />
                <span>{submitErr}</span>
              </div>
            )}

            <footer className="admin-modal-foot">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={14} strokeWidth={2} className="admin-spin" />
                ) : (
                  <Check size={14} strokeWidth={2.25} />
                )}
                {editing.mode === "create" ? "Criar" : "Salvar"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
