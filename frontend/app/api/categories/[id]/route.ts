import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/categories/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authenticatedHeaders()) },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/categories/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: await authenticatedHeaders(),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
