import "server-only";
import { headers } from "next/headers";

// Link público da proposta: SITE_URL em produção (propostas.sigasky.com.br); no local, o host da requisição
export async function linkPublico(codigo: string) {
  const base = process.env.SITE_URL?.replace(/\/$/, "");
  if (base && !base.includes("localhost")) return `${base}/p/${codigo}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3416";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/p/${codigo}`;
}

