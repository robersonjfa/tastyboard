import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

export async function POST(request: Request) {
  const response = await fetch(backendUrl("/recipes"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authenticatedHeaders()) },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
