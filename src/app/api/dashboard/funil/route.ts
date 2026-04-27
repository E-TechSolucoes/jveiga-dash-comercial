import { NextResponse, type NextRequest } from "next/server";

import { fetchFunnelPeriod } from "@/lib/dashboard/bigquery-funil";

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const codigoParam = request.nextUrl.searchParams.get("codigo");
  const nomeParam = request.nextUrl.searchParams.get("nome")?.trim() ?? "";
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!nomeParam) {
    return NextResponse.json({ error: "Parâmetro nome é obrigatório." }, { status: 400 });
  }
  if (!isIsoDate(fromParam) || !isIsoDate(toParam)) {
    return NextResponse.json(
      { error: "Parâmetros from/to são obrigatórios no formato YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchFunnelPeriod({
      empreendimentoCodigo: codigoParam?.trim() || null,
      empreendimentoNome: nomeParam,
      dateFrom: fromParam,
      dateTo: toParam,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : "Falha ao consultar BigQuery.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
