/**
 * Gera um arquivo Excel (SpreadsheetML) compatível com o importador de auditoria.
 * Abre direto no Excel/LibreOffice sem dependências extras no frontend.
 */

const HEADERS = [
  "Data",
  "Nome",
  "Telefone",
  "Origem",
  "Situação",
  "", // coluna de observação do CV (cabeçalho vazio)
  "Liguei?",
  "WhatsApp",
  "Como foi o atendimento?",
  "Alguém entrou em contato?",
  "Quer conhecer?",
  "Conectei com o time de vendas?",
] as const;

/** Linhas de exemplo — podem ser apagadas antes do upload real. */
const SAMPLE_ROWS: string[][] = [
  [
    "08/04/2026",
    "Michele",
    "+5511951068325",
    "Facebook",
    "Aguardando Atendimento",
    "tem interesse",
    "Sim",
    "-",
    "tem interesse e quer saber mais a respeito do projeto",
    "Não",
    "Sim",
    "Agendado",
  ],
  [
    "09/04/2026",
    "Roseli",
    "+5511951680021",
    "Facebook",
    "Aguardando Atendimento",
    "caixa postal",
    "Caixa postal",
    "Sim",
    "não tem interesse",
    "Não",
    "Não",
    "Recusou",
  ],
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowXml(cells: readonly string[]): string {
  const inner = cells
    .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
    .join("");
  return `<Row>${inner}</Row>`;
}

function buildSpreadsheetXml(): string {
  const headerRow = rowXml(HEADERS);
  const dataRows = SAMPLE_ROWS.map((r) => rowXml(r)).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Auditoria">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

export const LEAD_AUDIT_TEMPLATE_FILENAME = "modelo-auditoria-leads.xls";

export function downloadLeadAuditTemplate(): void {
  const xml = buildSpreadsheetXml();
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
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

export const LEAD_AUDIT_TEMPLATE_COLUMNS = HEADERS.filter(Boolean).join(", ");
