import { NextResponse, type NextRequest } from "next/server";

import { fetchRecepPayload } from "@/lib/recep/bigquery-recep";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const nome = request.nextUrl.searchParams.get("nome")?.trim() ?? "";
  if (!nome) {
    return NextResponse.json({ error: "Parâmetro nome é obrigatório." }, { status: 400 });
  }

  try {
    const payload = await fetchRecepPayload(nome);
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
