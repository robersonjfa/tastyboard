import { NextResponse } from "next/server";
import { authenticatedHeaders, backendUrl, proxyJson } from "@/lib/backend";

export async function GET() {
  const response = await fetch(backendUrl("/auth/me"), {
    headers: await authenticatedHeaders(),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
