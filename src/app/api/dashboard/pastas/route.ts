import { NextResponse, type NextRequest } from "next/server";

import { fetchPastasTotais } from "@/lib/dashboard/bigquery-pastas";

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

  if (nomes.length === 0) {
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

  try {
    const payload = await fetchPastasTotais({
      empreendimentoCodigos: codigos,
      empreendimentoNomes: nomes,
      dateFrom: fromParam,
      dateTo: toParam,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
