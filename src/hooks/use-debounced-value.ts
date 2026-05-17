"use client";

import { useEffect, useState } from "react";

/** Atrasa a propagação de `value` em `delay` ms — usado em campos de busca. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
