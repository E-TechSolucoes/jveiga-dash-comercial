import { NextResponse, type NextRequest } from "next/server";

function backendBase(): string {
  const base = process.env.URL_API;
  if (!base) {
    throw new Error("URL_API environment variable is not set");
  }
  return base.replace(/\/+$/, "");
}

async function relay(upstream: Response): Promise<NextResponse> {
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const text = await upstream.text();
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return new NextResponse(text || null, {
    status: upstream.status,
    headers,
  });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  const upstream = await fetch(
    `${backendBase()}/api/v1/premiacoes-categories/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
    },
  );
  return relay(upstream);
}

export async function PUT(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  const body = await request.text();
  const upstream = await fetch(
    `${backendBase()}/api/v1/premiacoes-categories/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    },
  );
  return relay(upstream);
}

export async function DELETE(_request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { id } = await ctx.params;
  const upstream = await fetch(
    `${backendBase()}/api/v1/premiacoes-categories/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
  return relay(upstream);
}
