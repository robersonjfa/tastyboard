import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

type Context = { params: Promise<{ id: string }> };

async function forward(request: Request, context: Context, method: "PATCH" | "DELETE") {
  const { id } = await context.params;
  const response = await fetch(backendUrl(`/recipes/${encodeURIComponent(id)}`), {
    method,
    headers: { "Content-Type": "application/json", ...(await authenticatedHeaders()) },
    ...(method === "PATCH" && { body: JSON.stringify(await request.json()) }),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}

export function PATCH(request: Request, context: Context) {
  return forward(request, context, "PATCH");
}

export function DELETE(request: Request, context: Context) {
  return forward(request, context, "DELETE");
}
