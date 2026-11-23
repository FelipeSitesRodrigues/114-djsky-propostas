"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/painel/sessao";
import { registrar } from "@/lib/dados";
import { soNumeros, type Apresentacoes, type Geral, type RegraDesconto } from "@/lib/proposta/padrao";
import { TIPOS_EVENTO } from "@/lib/proposta/tipos";
import { FOTOS } from "@/lib/midia";

type R = { ok: true } | { ok: false; erro: string };

const EMAIL = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const numero = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".")));

async function gravar(chave: string, valor: unknown) {
  const { error } = await supabaseAdmin()
    .from("configuracoes")
    .upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: "chave" });
  return !error;
}

function pronto() {
  revalidatePath("/painel/ajustes");
  revalidatePath("/painel", "layout");
}

export async function salvarGeral(g: Geral): Promise<R> {
  const u = await exigirAdmin();
  const whatsapp = soNumeros(g?.whatsapp ?? "");
  if (whatsapp.length < 12 || whatsapp.length > 15) return { ok: false, erro: "WhatsApp com DDI e DDD, só números. Ex.: 5579999662758." };
  const sinal = numero(g?.sinalPercentual);
  if (!Number.isInteger(sinal) || sinal < 0 || sinal > 100) return { ok: false, erro: "O sinal é um número inteiro de 0 a 100." };
  const validade = numero(g?.validadeDias);
  if (!Number.isInteger(validade) || validade < 1 || validade > 365) return { ok: false, erro: "A validade vai de 1 a 365 dias." };
  const formaPagamento = texto(g?.formaPagamento, 120);
  if (!formaPagamento) return { ok: false, erro: "Preencha a forma de pagamento." };
  const condicoesPagamento = texto(g?.condicoesPagamento, 1500);
  const emails = String(g?.emailAvisos ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const invalido = emails.find((e) => !EMAIL.test(e));
  if (invalido) return { ok: false, erro: `E-mail inválido: ${invalido}` };
  if (emails.length > 10) return { ok: false, erro: "No máximo 10 e-mails para aviso." };

  const valor: Geral = { whatsapp, sinalPercentual: sinal, validadeDias: validade, formaPagamento, condicoesPagamento, emailAvisos: [...new Set(emails)].join(", ") };
  if (!(await gravar("geral", valor))) return { ok: false, erro: "Não foi possível salvar agora. Tente de novo." };
  await registrar(null, "ajustes_salvos", { secao: "geral", ...valor }, u.id);
  pronto();
  return { ok: true };
}

export async function salvarRegras(regras: RegraDesconto[]): Promise<R> {
  const u = await exigirAdmin();
  if (!Array.isArray(regras)) return { ok: false, erro: "Lista de regras inválida." };
  if (regras.length > 30) return { ok: false, erro: "No máximo 30 regras." };
  const limpas: RegraDesconto[] = [];
  const nomes = new Set<string>();
  for (const r of regras) {
    const nome = texto(r?.nome, 60);
    const percentual = Math.round(numero(r?.percentual) * 100) / 100;
    if (!nome) return { ok: false, erro: "Toda regra precisa de um nome." };
    if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) return { ok: false, erro: `O percentual de "${nome}" vai de 0,01 a 100.` };
    const chave = nome.toLowerCase();
    if (nomes.has(chave)) return { ok: false, erro: `A regra "${nome}" aparece duas vezes.` };
    nomes.add(chave);
    limpas.push({ nome, percentual });
  }
  if (!(await gravar("regrasDesconto", limpas))) return { ok: false, erro: "Não foi possível salvar agora. Tente de novo." };
  await registrar(null, "ajustes_salvos", { secao: "regrasDesconto", regras: limpas }, u.id);
  pronto();
  return { ok: true };
}

export async function salvarApresentacoes(a: Apresentacoes): Promise<R> {
  const u = await exigirAdmin();
  const capas = new Set<string>(FOTOS.map((f) => f.id));
  const limpas: Apresentacoes = {};
  for (const [tipo, rotulo] of TIPOS_EVENTO) {
    const ap = a?.[tipo];
    if (!ap) continue;
    const titulo = texto(ap.titulo, 120);
    if (!titulo) return { ok: false, erro: `Preencha o título de ${rotulo}.` };
    const capa = String(ap.capa ?? "");
    if (!capas.has(capa)) return { ok: false, erro: `Escolha uma capa para ${rotulo}.` };
    limpas[tipo] = { titulo, texto: texto(ap.texto, 1500), capa };
  }
  if (!(await gravar("apresentacoes", limpas))) return { ok: false, erro: "Não foi possível salvar agora. Tente de novo." };
  await registrar(null, "ajustes_salvos", { secao: "apresentacoes", tipos: Object.keys(limpas) }, u.id);
  pronto();
  return { ok: true };
}
