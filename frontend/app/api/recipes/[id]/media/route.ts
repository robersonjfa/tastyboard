import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!file) {
    return NextResponse.json({ message: 'Envie um arquivo no campo "file"' }, { status: 400 });
  }

  const outgoing = new FormData();
  outgoing.set("file", file);

  const response = await fetch(backendUrl(`/recipes/${encodeURIComponent(id)}/media`), {
    method: "POST",
    headers: await authenticatedHeaders(),
    body: outgoing,
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
