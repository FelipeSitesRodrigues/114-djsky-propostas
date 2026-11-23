"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { registrar } from "@/lib/dados";

type Resposta = { ok: true } | { ok: false; erro: string };

export type DadosParceiro = {
  id?: string;
  nome: string;
  tipo: string;
  whatsapp: string;
  email: string;
  descontoPadrao: number;
  observacoes: string;
  ativo: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CAMINHO = "/painel/parceiros";

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function salvarParceiro(d: DadosParceiro): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (d.id !== undefined && !UUID.test(String(d.id))) return { ok: false, erro: "Parceiro não encontrado." };
  const nome = texto(d.nome, 120);
  if (!nome) return { ok: false, erro: "Dê um nome ao parceiro." };
  const tipo = texto(d.tipo, 40);
  if (!tipo) return { ok: false, erro: "Escolha o tipo do parceiro." };
  const whatsapp = texto(d.whatsapp, 30);
  if (whatsapp && !/^[\d\s()+-]{8,30}$/.test(whatsapp)) return { ok: false, erro: "WhatsApp inválido. Use só números, com DDD." };
  const email = texto(d.email, 160).toLowerCase();
  if (email && !EMAIL.test(email)) return { ok: false, erro: "E-mail inválido." };
  const desconto = Number(d.descontoPadrao);
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) return { ok: false, erro: "O desconto padrão tem que ser de 0 a 100%." };

  const linha = {
    nome,
    tipo,
    whatsapp,
    email,
    desconto_padrao: Math.round(desconto * 100) / 100,
    observacoes: texto(d.observacoes, 2000),
    ativo: d.ativo === true,
  };
  const db = supabaseAdmin();
  let id = d.id;
  if (id) {
    const { data, error } = await db.from("parceiros").update(linha).eq("id", id).select("id").maybeSingle();
    if (error) return { ok: false, erro: "Não deu pra salvar o parceiro. Tente de novo." };
    if (!data) return { ok: false, erro: "Parceiro não encontrado." };
  } else {
    const { data, error } = await db.from("parceiros").insert(linha).select("id").single();
    if (error || !data) return { ok: false, erro: "Não deu pra criar o parceiro. Tente de novo." };
    id = data.id as string;
  }
  await registrar(null, "parceiro_salvo", { id, nome, novo: !d.id }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}

export async function ativarParceiro(id: string, ativo: boolean): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (!UUID.test(String(id))) return { ok: false, erro: "Parceiro não encontrado." };
  const { data, error } = await supabaseAdmin().from("parceiros").update({ ativo: ativo === true }).eq("id", id).select("id, nome").maybeSingle();
  if (error) return { ok: false, erro: "Não deu pra mudar o parceiro. Tente de novo." };
  if (!data) return { ok: false, erro: "Parceiro não encontrado." };
  await registrar(null, ativo ? "parceiro_ativado" : "parceiro_desativado", { id, nome: data.nome }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}

// Só apaga parceiro sem nenhuma proposta (arquivadas contam): com proposta, desativar.
export async function apagarParceiro(id: string): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (!UUID.test(String(id))) return { ok: false, erro: "Parceiro não encontrado." };
  const db = supabaseAdmin();
  const { count, error: erroConta } = await db.from("propostas").select("id", { count: "exact", head: true }).eq("parceiro_id", id);
  if (erroConta) return { ok: false, erro: "Não deu pra conferir as propostas do parceiro. Tente de novo." };
  if ((count ?? 0) > 0) return { ok: false, erro: "Esse parceiro tem propostas. Desative em vez de apagar." };
  const { data, error } = await db.from("parceiros").delete().eq("id", id).select("id, nome").maybeSingle();
  if (error) return { ok: false, erro: "Não deu pra apagar o parceiro. Tente de novo." };
  if (!data) return { ok: false, erro: "Parceiro não encontrado." };
  await registrar(null, "parceiro_apagado", { id, nome: data.nome }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}
