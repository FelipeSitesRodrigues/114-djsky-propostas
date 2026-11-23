import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GERAL_PADRAO, hojeISO, normalizar, type Apresentacoes, type Geral, type RegraDesconto } from "@/lib/proposta/padrao";
import type { DadosProposta, Status } from "@/lib/proposta/tipos";

export type Servico = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  duracao_min: number | null;
  duracao_max_min: number | null;
  preco: number;
  unidade: string;
  ativo: boolean;
  ordem: number;
};
export type ItemPacote = { servicoId: string; quantidade: number; duracaoMin: number | null; precoUnit: number; tipo: "base" | "adicional" };
export type Pacote = { id: string; nome: string; descricao: string; itens: ItemPacote[]; ativo: boolean; ordem: number };
export type Parceiro = { id: string; nome: string; tipo: string; whatsapp: string; email: string; desconto_padrao: number; observacoes: string; ativo: boolean };

export type PropostaLinha = {
  id: string;
  numero: number;
  codigo: string;
  status: Status;
  cliente_nome: string;
  cliente_whatsapp: string;
  evento_tipo: string;
  evento_nome: string;
  evento_data: string | null;
  evento_cidade: string;
  total: number;
  desconto: number;
  validade: string | null;
  parceiro_id: string | null;
  versao_atual: number;
  versao_publicada: number | null;
  versao_aceita: number | null;
  arquivada: boolean;
  enviada_em: string | null;
  visualizada_em: string | null;
  aceita_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const COLUNAS_PROPOSTA =
  "id, numero, codigo, status, cliente_nome, cliente_whatsapp, evento_tipo, evento_nome, evento_data, evento_cidade, total, desconto, validade, parceiro_id, versao_atual, versao_publicada, versao_aceita, arquivada, enviada_em, visualizada_em, aceita_em, criado_em, atualizado_em";

const ABERTAS: Status[] = ["enviada", "visualizada", "negociacao"];

// Vencida é calculada na leitura também (o cron diário grava no banco)
export function statusEfetivo(p: Pick<PropostaLinha, "status" | "validade">): Status {
  if (ABERTAS.includes(p.status) && p.validade && p.validade < hojeISO()) return "vencida";
  return p.status;
}

export async function configuracoes() {
  const { data } = await supabaseAdmin().from("configuracoes").select("chave, valor");
  const m = new Map((data ?? []).map((l: { chave: string; valor: unknown }) => [l.chave, l.valor]));
  return {
    geral: { ...GERAL_PADRAO, ...((m.get("geral") as Partial<Geral>) ?? {}) } as Geral,
    regras: ((m.get("regrasDesconto") as RegraDesconto[]) ?? []) as RegraDesconto[],
    apresentacoes: ((m.get("apresentacoes") as Apresentacoes) ?? {}) as Apresentacoes,
  };
}

export async function servicos(soAtivos = false) {
  let q = supabaseAdmin().from("servicos").select("*").order("ordem").order("nome");
  if (soAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as Servico[];
}

export async function pacotes(soAtivos = false) {
  let q = supabaseAdmin().from("pacotes").select("*").order("ordem").order("nome");
  if (soAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as Pacote[];
}

export async function parceiros(soAtivos = false) {
  let q = supabaseAdmin().from("parceiros").select("*").order("nome");
  if (soAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []) as Parceiro[];
}

export type Versao = { versao: number; dados: DadosProposta; total: number; nota: string; criado_em: string; criado_por: string | null };

export function normalizarVersao(data: Record<string, unknown>): Versao {
  return { ...data, dados: normalizar(data.dados as DadosProposta) } as Versao;
}

export async function versao(propostaId: string, numero: number) {
  const { data } = await supabaseAdmin().from("proposta_versoes").select("versao, dados, total, nota, criado_em, criado_por").eq("proposta_id", propostaId).eq("versao", numero).maybeSingle();
  if (!data) return null;
  return normalizarVersao(data);
}

export async function propostaPorId(id: string) {
  const { data } = await supabaseAdmin().from("propostas").select(COLUNAS_PROPOSTA).eq("id", id).maybeSingle();
  return (data as PropostaLinha | null) ?? null;
}

export async function propostaPorCodigo(codigo: string) {
  if (!/^[A-Za-z0-9]{20,40}$/.test(codigo)) return null;
  const { data } = await supabaseAdmin().from("propostas").select(COLUNAS_PROPOSTA).eq("codigo", codigo).maybeSingle();
  return (data as PropostaLinha | null) ?? null;
}

export async function registrar(propostaId: string | null, tipo: string, detalhe: Record<string, unknown> = {}, usuarioId: string | null = null) {
  await supabaseAdmin().from("historico").insert({ proposta_id: propostaId, tipo, detalhe, usuario_id: usuarioId });
}

export async function avisar(propostaId: string | null, titulo: string, texto: string) {
  await supabaseAdmin().from("notificacoes").insert({ proposta_id: propostaId, titulo, texto });
}

export async function naoLidas() {
  const { count } = await supabaseAdmin().from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false);
  return count ?? 0;
}

// Conflito de agenda: outra proposta fechada (aceita em diante) ou em aberto na mesma data
export async function conflitosAgenda(data: string, exceto?: string) {
  if (!data) return [] as Pick<PropostaLinha, "id" | "numero" | "status" | "cliente_nome" | "evento_nome" | "evento_cidade">[];
  let q = supabaseAdmin()
    .from("propostas")
    .select("id, numero, status, cliente_nome, evento_nome, evento_cidade")
    .eq("evento_data", data)
    .eq("arquivada", false)
    .in("status", ["aceita", "contrato_enviado", "contratada", "enviada", "visualizada", "negociacao"]);
  if (exceto) q = q.neq("id", exceto);
  const { data: linhas } = await q;
  return (linhas ?? []) as Pick<PropostaLinha, "id" | "numero" | "status" | "cliente_nome" | "evento_nome" | "evento_cidade">[];
}
