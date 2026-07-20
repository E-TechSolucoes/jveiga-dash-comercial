/**
 * Modelo mínimo da auditoria: só dados do CV.
 * Liguei? / WhatsApp / Atendimento / Contato / Quer conhecer? / Reconectar
 * são preenchidos na tela depois do upload.
 */

const HEADERS = ["Data", "Nome", "Telefone", "Origem", "Situação", "Obs"] as const;

/** Linhas de exemplo — apague antes do upload real. */
const SAMPLE_ROWS: string[][] = [
  [
    "08/04/2026",
    "Michele",
    "+5511951068325",
    "Facebook",
    "Aguardando Atendimento",
    "tem interesse",
  ],
  ["09/04/2026", "Roseli", "+5511951680021", "Facebook", "Aguardando Atendimento", "caixa postal"],
];

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(): string {
  const lines = [HEADERS.map(csvEscape).join(",")];
  for (const row of SAMPLE_ROWS) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

export const LEAD_AUDIT_TEMPLATE_FILENAME = "modelo-auditoria-leads.csv";

export function downloadLeadAuditTemplate(): void {
  const csv = `\uFEFF${buildCsv()}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = LEAD_AUDIT_TEMPLATE_FILENAME;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const LEAD_AUDIT_TEMPLATE_COLUMNS = HEADERS.join(", ");
