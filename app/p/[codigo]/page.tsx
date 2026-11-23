import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { configuracoes, propostaPorCodigo, statusEfetivo, versao as lerVersao } from "@/lib/dados";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseSessao } from "@/lib/supabase/servidor";
import { hashSecreto } from "@/lib/seguranca/cifra";
import { Pagina, type EstadoPagina } from "@/components/proposta/Pagina";
import "../proposta.css";

export const metadata: Metadata = { title: "Proposta", robots: { index: false, follow: false, nocache: true } };

export default async function PaginaPublica({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const p = await propostaPorCodigo(codigo);
  if (!p || p.arquivada || !p.versao_publicada) notFound();

  // depois do aceite, o cliente vê sempre a versão que aceitou
  const numeroVersao = p.versao_aceita ?? p.versao_publicada;
  const [v, { geral }] = await Promise.all([lerVersao(p.id, numeroVersao), configuracoes()]);
  if (!v) notFound();

  const st = statusEfetivo(p);
  const estado: EstadoPagina = p.versao_aceita || ["aceita", "contrato_enviado", "contratada"].includes(st) ? "aceita" : st === "vencida" ? "vencida" : st === "recusada" ? "encerrada" : "aberta";

  // acesso conta como visualização do cliente só se não for alguém logado no painel
  // (um acesso ao link não prova quem é a pessoa: fica só data, hora e hash do IP)
  const { data: sessao } = await (await supabaseSessao()).auth.getClaims();
  if (!sessao?.claims) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
    await supabaseAdmin().rpc("registrar_visita", { p_id: p.id, p_versao: numeroVersao, p_ip_hash: hashSecreto(ip), p_navegador: (h.get("user-agent") ?? "").slice(0, 180) });
  }

  return <Pagina dados={v.dados} numero={p.numero} versao={numeroVersao} codigo={codigo} estado={estado} whatsapp={geral.whatsapp} aceitaEm={p.aceita_em} />;
}
