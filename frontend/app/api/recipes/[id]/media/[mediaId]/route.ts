import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

type Context = { params: Promise<{ id: string; mediaId: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { id, mediaId } = await context.params;
  const response = await fetch(
    backendUrl(`/recipes/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`),
    {
      method: "DELETE",
      headers: await authenticatedHeaders(),
      cache: "no-store",
    },
  );
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
