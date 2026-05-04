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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.search;
  const url = `${backendBase()}/api/v1/premiacoes-categories${search}`;
  const upstream = await fetch(url, { cache: "no-store" });
  return relay(upstream);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const upstream = await fetch(`${backendBase()}/api/v1/premiacoes-categories`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  return relay(upstream);
}
