import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionCookie } from "@/lib/backend";

export async function POST() {
  (await cookies()).delete(sessionCookie);
  return NextResponse.json({ ok: true });
}
