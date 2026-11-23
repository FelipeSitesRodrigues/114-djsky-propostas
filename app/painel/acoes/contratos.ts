"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/painel/sessao";
import { registrar } from "@/lib/dados";
import { cifrar, decifrar } from "@/lib/seguranca/cifra";
import { validarAceite, type DadosAceite } from "@/lib/proposta/aceite";
import { soDigitos } from "@/lib/proposta/cpf";

export type Endereco = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string };
export type DadosContrato = { nome: string; cpf: string; endereco: Endereco };

type Linha = { id: string; proposta_id: string; nome: string; cpf_cifrado: string | null; endereco_cifrado: string | null; dados_apagados_em: string | null };

async function aceite(id: string) {
  const { data } = await supabaseAdmin().from("aceites").select("id, proposta_id, nome, cpf_cifrado, endereco_cifrado, dados_apagados_em").eq("id", id).maybeSingle();
  return data as Linha | null;
}

// Mostra CPF e endereço completos: só administrador, e cada abertura fica na trilha
export async function abrirDadosContrato(aceiteId: string): Promise<{ ok: true; dados: DadosContrato } | { ok: false; erro: string }> {
  const u = await exigirAdmin();
  const a = await aceite(aceiteId);
  if (!a) return { ok: false, erro: "Aceite não encontrado." };
  if (a.dados_apagados_em || !a.cpf_cifrado || !a.endereco_cifrado) return { ok: false, erro: "Os dados pessoais desse aceite foram apagados." };
  try {
    const dados = { nome: a.nome, cpf: decifrar<string>(a.cpf_cifrado), endereco: decifrar<Endereco>(a.endereco_cifrado) };
    await registrar(a.proposta_id, "viu_dados_contrato", {}, u.id);
    return { ok: true, dados };
  } catch {
    return { ok: false, erro: "Não foi possível abrir os dados (chave de criptografia diferente da usada no aceite)." };
  }
}

export async function registrarCopia(aceiteId: string, campo: string) {
  const u = await exigirAdmin();
  const a = await aceite(aceiteId);
  if (a) await registrar(a.proposta_id, "copiou_dados_contrato", { campo: String(campo).slice(0, 30) }, u.id);
}

export async function corrigirDadosContrato(aceiteId: string, novo: DadosContrato, motivo: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const u = await exigirAdmin();
  const a = await aceite(aceiteId);
  if (!a || !a.cpf_cifrado || !a.endereco_cifrado || a.dados_apagados_em) return { ok: false, erro: "Aceite não encontrado ou sem dados." };
  if (String(motivo ?? "").trim().length < 3) return { ok: false, erro: "Escreva o motivo da correção." };
  const e = novo.endereco;
  const campos = validarAceite({ nome: novo.nome, cpf: novo.cpf, cep: e.cep, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento, bairro: e.bairro, cidade: e.cidade, uf: e.uf, ciente: true } as DadosAceite);
  if (Object.keys(campos).length) return { ok: false, erro: Object.values(campos).join(" ") };
  const antes = { nome: a.nome, cpf: decifrar<string>(a.cpf_cifrado), endereco: decifrar<Endereco>(a.endereco_cifrado) };
  const cpf = soDigitos(novo.cpf);
  const endereco: Endereco = { cep: soDigitos(e.cep), logradouro: e.logradouro.trim(), numero: e.numero.trim(), complemento: (e.complemento ?? "").trim(), bairro: e.bairro.trim(), cidade: e.cidade.trim(), uf: e.uf.toUpperCase() };
  const depois = { nome: novo.nome.trim().replace(/\s+/g, " "), cpf, endereco };
  const db = supabaseAdmin();
  await db.from("aceite_correcoes").insert({ aceite_id: a.id, antes_cifrado: cifrar(antes), depois_cifrado: cifrar(depois), motivo: motivo.trim().slice(0, 300), feito_por: u.id });
  await db.from("aceites").update({ nome: depois.nome, cpf_cifrado: cifrar(cpf), cpf_finais: cpf.slice(-2), endereco_cifrado: cifrar(endereco), cidade_uf: `${endereco.cidade}/${endereco.uf}` }).eq("id", a.id);
  await registrar(a.proposta_id, "corrigiu_dados_contrato", { motivo: motivo.trim().slice(0, 300) }, u.id);
  revalidatePath(`/painel/aceitas/${a.id}`);
  return { ok: true };
}

// LGPD: apaga CPF, endereço e o histórico de correções; o registro do aceite (quem, quando, valor) fica
export async function apagarDadosPessoais(aceiteId: string, confirmacao: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const u = await exigirAdmin();
  if (confirmacao !== "APAGAR") return { ok: false, erro: 'Digite APAGAR para confirmar.' };
  const a = await aceite(aceiteId);
  if (!a) return { ok: false, erro: "Aceite não encontrado." };
  const db = supabaseAdmin();
  await db.from("aceite_correcoes").delete().eq("aceite_id", a.id);
  await db.from("aceites").update({ cpf_cifrado: null, endereco_cifrado: null, cpf_finais: null, cidade_uf: "", ip_hash: null, navegador: null, dados_apagados_em: new Date().toISOString() }).eq("id", a.id);
  await registrar(a.proposta_id, "apagou_dados_pessoais", {}, u.id);
  revalidatePath(`/painel/aceitas/${a.id}`);
  return { ok: true };
}
