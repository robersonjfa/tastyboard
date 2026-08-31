import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/recipes/${encodeURIComponent(id)}/media/youtube`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authenticatedHeaders()) },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
