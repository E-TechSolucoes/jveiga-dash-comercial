import { NextResponse, type NextRequest } from "next/server";

import { fetchConversaoHistorica } from "@/lib/dashboard/bigquery-conversao-historica";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const codigoParam = request.nextUrl.searchParams.get("codigo");
  const nomeParam = request.nextUrl.searchParams.get("nome")?.trim() ?? "";

  if (!nomeParam) {
    return NextResponse.json({ error: "Parâmetro nome é obrigatório." }, { status: 400 });
  }

  try {
    const payload = await fetchConversaoHistorica({
      empreendimentoCodigo: codigoParam?.trim() || null,
      empreendimentoNome: nomeParam,
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
