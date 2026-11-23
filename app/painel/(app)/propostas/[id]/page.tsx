import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { configuracoes, conflitosAgenda, normalizarVersao, pacotes, parceiros, propostaPorId, servicos, statusEfetivo, versao } from "@/lib/dados";
import { Editor, type Hist } from "@/components/painel/editor/Editor";
import { linkPublico } from "@/lib/link";

export const metadata: Metadata = { title: "Proposta" };

export default async function PaginaProposta({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirUsuario();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  // Uma rodada só pro banco: a última versão sai ordenando (versao_atual é sempre a maior),
  // então nada aqui espera a proposta chegar antes de pedir o resto.
  const db = supabaseAdmin();
  const [p, ult, cfg, sv, pc, pa, hist, vers, acessos, ultimo, aceite, { data: perfis }] = await Promise.all([
    propostaPorId(id),
    db.from("proposta_versoes").select("versao, dados, total, nota, criado_em, criado_por").eq("proposta_id", id).order("versao", { ascending: false }).limit(1).maybeSingle(),
    configuracoes(),
    servicos(true),
    pacotes(true),
    parceiros(),
    db.from("historico").select("id, tipo, detalhe, criado_em, usuario_id").eq("proposta_id", id).order("criado_em", { ascending: false }).limit(80),
    db.from("proposta_versoes").select("versao, total, criado_em").eq("proposta_id", id).order("versao", { ascending: false }),
    db.from("acessos").select("id", { count: "exact", head: true }).eq("proposta_id", id),
    db.from("acessos").select("criado_em").eq("proposta_id", id).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    db.from("aceites").select("id").eq("proposta_id", id).maybeSingle(),
    db.from("perfis").select("user_id, nome"),
  ]);
  if (!p) notFound();
  const v = ult.data && (ult.data as { versao: number }).versao === p.versao_atual ? normalizarVersao(ult.data) : await versao(id, p.versao_atual);
  if (!v) notFound();
  const conflitos = await conflitosAgenda(v.dados.evento.data, id);
  const nomes = new Map((perfis ?? []).map((x: { user_id: string; nome: string }) => [x.user_id, x.nome]));
  const historico: Hist[] = (hist.data ?? []).map((h: { id: number; tipo: string; detalhe: Record<string, unknown>; criado_em: string; usuario_id: string | null }) => ({ id: h.id, tipo: h.tipo, detalhe: h.detalhe ?? {}, criado_em: h.criado_em, quem: h.usuario_id ? nomes.get(h.usuario_id) ?? "" : "" }));

  return (
    <Editor
      key={id}
      id={id}
      numero={p.numero}
      codigo={p.codigo}
      status={statusEfetivo(p)}
      arquivada={p.arquivada}
      versaoAtual={p.versao_atual}
      versaoPublicada={p.versao_publicada}
      versaoAceita={p.versao_aceita}
      aceiteId={(aceite.data as { id: string } | null)?.id ?? null}
      dadosIniciais={v.dados}
      parceiroInicial={p.parceiro_id}
      servicos={sv}
      pacotes={pc}
      parceiros={pa.filter((x) => x.ativo || x.id === p.parceiro_id)}
      regras={cfg.regras}
      apresentacoes={cfg.apresentacoes}
      papel={u.papel}
      link={await linkPublico(p.codigo)}
      conflitosIniciais={conflitos}
      historico={historico}
      versoes={(vers.data ?? []) as { versao: number; total: number; criado_em: string }[]}
      acessos={{ total: acessos.count ?? 0, ultimo: (ultimo.data as { criado_em: string } | null)?.criado_em ?? null }}
    />
  );
}
