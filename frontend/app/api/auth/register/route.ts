import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendUrl, proxyJson, sessionCookie } from "@/lib/backend";

export async function POST(request: Request) {
  const response = await fetch(backendUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
  const { body, status } = await proxyJson(response);
  if (!response.ok) return NextResponse.json(body, { status });

  (await cookies()).set(sessionCookie, body.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return NextResponse.json(body.user, { status: 201 });
}
