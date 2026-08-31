import { NextResponse } from "next/server";
import { backendUrl, proxyJson } from "@/lib/backend";

export async function POST(request: Request) {
  const response = await fetch(backendUrl("/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  return NextResponse.json(body, { status });
}
