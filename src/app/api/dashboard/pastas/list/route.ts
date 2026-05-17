import { NextResponse, type NextRequest } from "next/server";

import { fetchPastasPessoasPage, PASTAS_PAGE_SIZE } from "@/lib/dashboard/bigquery-pastas";

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function parseNomes(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("||")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseCodigos(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Falha ao consultar BigQuery.";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams;
  const nomes = parseNomes(sp.get("nomes") ?? sp.get("nome"));
  const codigos = parseCodigos(sp.get("codigos") ?? sp.get("codigo"));
  const fromParam = sp.get("from");
  const toParam = sp.get("to");
  const pageRaw = sp.get("page");
  const page = pageRaw != null ? Number.parseInt(pageRaw, 10) : 1;
  const pessoa = (sp.get("pessoa") ?? "").trim();
  const corretor = (sp.get("corretor") ?? "").trim();
  const empreendimento = (sp.get("empreendimento") ?? "").trim();
  const situacaoRaw = (sp.get("situacao") ?? "").trim();
  const situacao = ["andamento", "concluidas", "distratadas"].includes(situacaoRaw)
    ? situacaoRaw
    : "";

  if (nomes.length < 1) {
    return NextResponse.json(
      { error: "Parâmetro nomes é obrigatório (||-separado)." },
      { status: 400 },
    );
  }
  if (!isIsoDate(fromParam) || !isIsoDate(toParam)) {
    return NextResponse.json(
      { error: "Parâmetros from/to são obrigatórios no formato YYYY-MM-DD." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Parâmetro page deve ser um inteiro ≥ 1." }, { status: 400 });
  }

  try {
    const payload = await fetchPastasPessoasPage({
      empreendimentoCodigos: codigos,
      empreendimentoNomes: nomes,
      dateFrom: fromParam,
      dateTo: toParam,
      page,
      pageSize: PASTAS_PAGE_SIZE,
      pessoa,
      corretor,
      empreendimento,
      situacao,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
