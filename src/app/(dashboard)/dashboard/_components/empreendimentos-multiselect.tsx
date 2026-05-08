"use client";

import { Building2, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { EmpresaOption } from "./types";

type Props = {
  options: EmpresaOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  ariaLabel?: string;
};

function diacriticFold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function EmpreendimentosMultiSelect({
  options,
  selected,
  onChange,
  ariaLabel = "Empreendimentos selecionados",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [popPos, setPopPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popoverId = useId();

  function closePopover() {
    setOpen(false);
    setQuery("");
  }
  function togglePopover() {
    if (open) {
      closePopover();
    } else {
      setOpen(true);
    }
  }

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedOptions = useMemo(
    () => options.filter((opt) => selectedSet.has(opt.value)),
    [options, selectedSet],
  );

  const filteredOptions = useMemo(() => {
    const q = diacriticFold(query.trim());
    if (!q) return options;
    return options.filter((opt) => diacriticFold(opt.label).includes(q));
  }, [options, query]);

  const allSelected = options.length > 0 && options.every((opt) => selectedSet.has(opt.value));

  // Close on outside click / Escape (popover é portalado, então checamos trigger E popover)
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = rootRef.current?.contains(target) ?? false;
      const insidePopover = popoverRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insidePopover) closePopover();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePopover();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // Posiciona o popover (fixed) ancorado no trigger; reposiciona em scroll/resize.
  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const minWidth = 300;
      const maxWidth = 440;
      const triggerWidth = rect.width;
      const desiredWidth = Math.min(maxWidth, Math.max(minWidth, triggerWidth));
      // Se estourar a direita da viewport, desloca pra esquerda.
      const margin = 12;
      let left = rect.left;
      if (left + desiredWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - desiredWidth - margin);
      }
      setPopPos({ top: rect.bottom + 10, left, width: desiredWidth });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  function toggleOne(value: string) {
    const next = new Set(selectedSet);
    if (next.has(value)) {
      // Não permitir esvaziar a seleção: se for o último, ignora.
      if (next.size <= 1) return;
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(options.filter((opt) => next.has(opt.value)).map((opt) => opt.value));
  }

  function toggleAll() {
    if (allSelected) {
      // Mantém invariante de pelo menos 1 selecionado: cai pro primeiro do catálogo.
      onChange(options[0]?.value ? [options[0].value] : []);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  }

  function clearAll() {
    if (options.length === 0) return;
    onChange([options[0]!.value]);
  }

  const triggerLabel = (() => {
    if (selectedOptions.length === 0) return "Selecione empreendimentos";
    if (selectedOptions.length === 1) return selectedOptions[0]!.label;
    if (selectedOptions.length === options.length) return "Todos os empreendimentos";
    return `${selectedOptions.length} selecionados`;
  })();

  return (
    <div className="empSelect" ref={rootRef} data-open={open}>
      <button
        ref={triggerRef}
        type="button"
        className="empSelect-trigger"
        onClick={togglePopover}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={ariaLabel}
      >
        <span className="empSelect-trigger-icon" aria-hidden>
          <Building2 size={13} strokeWidth={2.4} />
        </span>
        <span className="empSelect-trigger-label" title={triggerLabel}>
          {triggerLabel}
        </span>
        {selectedOptions.length > 1 ? (
          <span className="empSelect-trigger-count" aria-hidden>
            {selectedOptions.length}
          </span>
        ) : null}
        <span className="empSelect-trigger-chev" aria-hidden>
          <ChevronDown size={15} strokeWidth={2.4} />
        </span>
      </button>

      {open && popPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              className="empSelect-pop"
              role="listbox"
              aria-multiselectable="true"
              aria-label={ariaLabel}
              style={{ top: popPos.top, left: popPos.left, width: popPos.width }}
            >
              <div className="empSelect-search">
                <Search size={13} strokeWidth={2.2} aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar empreendimento…"
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Buscar empreendimento"
                />
                {query ? (
                  <button
                    type="button"
                    className="empSelect-search-clear"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="Limpar busca"
                  >
                    <X size={11} strokeWidth={2.4} />
                  </button>
                ) : null}
              </div>

              <div className="empSelect-list" role="presentation">
                {filteredOptions.length === 0 ? (
                  <div className="empSelect-empty">Nenhum empreendimento encontrado.</div>
                ) : (
                  filteredOptions.map((opt) => {
                    const checked = selectedSet.has(opt.value);
                    const isLastSelected = checked && selectedOptions.length === 1;
                    return (
                      <label
                        key={opt.value}
                        className="empSelect-item"
                        role="option"
                        aria-selected={checked}
                        data-checked={checked}
                      >
                        <input
                          type="checkbox"
                          className="empSelect-checkbox"
                          checked={checked}
                          onChange={() => toggleOne(opt.value)}
                          disabled={isLastSelected}
                          aria-label={opt.label}
                        />
                        <span className="empSelect-item-label">{opt.label}</span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="empSelect-foot">
                <button
                  type="button"
                  className="empSelect-foot-btn"
                  onClick={toggleAll}
                  disabled={options.length === 0}
                >
                  {allSelected ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
                <button
                  type="button"
                  className="empSelect-foot-btn"
                  onClick={clearAll}
                  disabled={selectedOptions.length <= 1}
                >
                  Limpar
                </button>
                <span className="empSelect-foot-meta">
                  {selectedOptions.length}/{options.length}
                </span>
                <button
                  type="button"
                  className="empSelect-foot-btn empSelect-foot-btn--primary"
                  onClick={() => {
                    closePopover();
                    triggerRef.current?.focus();
                  }}
                >
                  Filtrar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
