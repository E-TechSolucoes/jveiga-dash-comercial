import { NextResponse, type NextRequest } from "next/server";

import { fetchHistoricalTaxas } from "@/lib/dashboard/bigquery-taxas";

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

  if (nomes.length === 0) {
    return NextResponse.json(
      { error: "Parâmetro nomes é obrigatório (||-separado)." },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchHistoricalTaxas({
      empreendimentoCodigos: codigos,
      empreendimentoNomes: nomes,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
