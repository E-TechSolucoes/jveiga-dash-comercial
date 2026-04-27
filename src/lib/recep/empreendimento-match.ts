/** Fold for accent-insensitive empreendimento matching (Visitas / Plantão). */
export function foldEmpreendimentoNome(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type EmpreendimentoRef = { id: number; nome: string };

export function resolveEmpreendimentoFromRows(
  nomeSelecionado: string,
  rows: EmpreendimentoRef[],
): EmpreendimentoRef | null {
  const key = foldEmpreendimentoNome(nomeSelecionado);
  if (!key) return null;
  for (const row of rows) {
    if (foldEmpreendimentoNome(row.nome) === key) return row;
  }
  return null;
}
