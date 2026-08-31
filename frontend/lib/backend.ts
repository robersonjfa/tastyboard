import { cookies } from "next/headers";

export const sessionCookie = "tastyboard_session";

export function backendUrl(path: string) {
  const baseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function authenticatedHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(sessionCookie)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function proxyJson(response: Response) {
  const body = await response.json().catch(() => ({ message: "Resposta inválida da API" }));
  return { body, status: response.status };
}
