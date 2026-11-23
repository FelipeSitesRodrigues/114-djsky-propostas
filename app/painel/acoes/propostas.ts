"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exigirUsuario } from "@/lib/painel/sessao";
import { configuracoes, conflitosAgenda, propostaPorId, registrar, versao as lerVersao } from "@/lib/dados";
import { codigoPublico } from "@/lib/seguranca/cifra";
import { calcular } from "@/lib/proposta/calculo";
import { hojeISO, propostaVazia, somarDias } from "@/lib/proposta/padrao";
import { pendenciasPublicar, sanear } from "@/lib/proposta/sanear";
import type { DadosProposta, Status, TipoEvento } from "@/lib/proposta/tipos";

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

const agora = () => new Date().toISOString();

function copias(d: DadosProposta) {
  const c = calcular(d.itens, d.financeiro);
  return {
    cliente_nome: d.cliente.nome,
    cliente_whatsapp: d.cliente.whatsapp,
    evento_tipo: d.evento.tipo,
    evento_nome: d.evento.nome,
    evento_data: d.evento.data || null,
    evento_cidade: d.evento.cidade,
    total: c.total,
    desconto: Math.max(0, c.subtotal - c.total),
    validade: d.condicoes.validade || null,
  };
}

export async function criarProposta(tipo: TipoEvento = "casamento") {
  const u = await exigirUsuario();
  const { geral, apresentacoes } = await configuracoes();
  const dados = propostaVazia(geral, apresentacoes, tipo);
  const db = supabaseAdmin();
  const { data, error } = await db.from("propostas").insert({ codigo: codigoPublico(), criado_por: u.id, ...copias(dados) }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "não criou");
  await db.from("proposta_versoes").insert({ proposta_id: data.id, versao: 1, dados, total: 0, criado_por: u.id });
  await registrar(data.id, "criada", {}, u.id);
  redirect(`/painel/propostas/${data.id}`);
}

// Salva o que está no editor. Enquanto a versão atual não foi publicada, ela é reescrita; se já
// foi (o cliente pode estar vendo), nasce uma versão nova e a anterior fica no histórico.
export async function salvarProposta(id: string, entrada: unknown, parceiroId: string | null, nota = ""): Promise<R<{ versao: number; novaVersao: boolean }>> {
  const u = await exigirUsuario();
  const p = await propostaPorId(id);
  if (!p) return { ok: false, erro: "Proposta não encontrada." };
  if (p.arquivada) return { ok: false, erro: "Proposta arquivada. Desarquive para editar." };
  const dados = sanear(entrada);
  const atual = await lerVersao(id, p.versao_atual);

  // valor final manual: só administrador, e sempre com justificativa
  const manualAntes = atual?.dados.financeiro.valorManual ?? null;
  const manualAgora = dados.financeiro.valorManual;
  if (manualAgora !== manualAntes) {
    if (u.papel !== "admin") return { ok: false, erro: "Só um administrador pode definir o valor final manual." };
    if (manualAgora !== null && !dados.financeiro.justificativaManual) return { ok: false, erro: "Escreva a justificativa do valor final manual." };
  }

  const db = supabaseAdmin();
  const conta = calcular(dados.itens, dados.financeiro);
  const publicadaEhAtual = p.versao_publicada !== null && p.versao_publicada >= p.versao_atual;
  let numero = p.versao_atual;
  if (publicadaEhAtual) {
    numero = p.versao_atual + 1;
    const { error } = await db.from("proposta_versoes").insert({ proposta_id: id, versao: numero, dados, total: conta.total, nota: nota.slice(0, 200), criado_por: u.id });
    if (error) return { ok: false, erro: "Não salvou. Tente de novo." };
    await registrar(id, "nova_versao", { versao: numero, total: conta.total }, u.id);
  } else {
    const { error } = await db.from("proposta_versoes").update({ dados, total: conta.total, criado_por: u.id, criado_em: agora() }).eq("proposta_id", id).eq("versao", numero);
    if (error) return { ok: false, erro: "Não salvou. Tente de novo." };
  }
  if (manualAgora !== manualAntes) await registrar(id, "valor_manual", { de: manualAntes, para: manualAgora, calculado: conta.calculado, justificativa: dados.financeiro.justificativaManual }, u.id);

  // a lista, a busca e os relatórios usam as cópias; depois do aceite, valor e validade ficam os
  // da versão aceita (a versão nova é só interna, o cliente segue vendo a aceita)
  const c = copias(dados);
  if (p.versao_aceita) {
    delete (c as Partial<typeof c>).total;
    delete (c as Partial<typeof c>).desconto;
    delete (c as Partial<typeof c>).validade;
  }
  await db.from("propostas").update({ ...c, parceiro_id: parceiroId || null, versao_atual: numero, atualizado_em: agora() }).eq("id", id);
  revalidatePath(`/painel/propostas/${id}`);
  return { ok: true, versao: numero, novaVersao: publicadaEhAtual };
}

// Publica a versão atual: o link passa a mostrar ela. 1ª vez muda rascunho → enviada.
export async function publicarProposta(id: string): Promise<R<{ codigo: string }>> {
  const u = await exigirUsuario();
  const p = await propostaPorId(id);
  if (!p) return { ok: false, erro: "Proposta não encontrada." };
  if (p.arquivada) return { ok: false, erro: "Proposta arquivada." };
  if (p.versao_aceita) return { ok: false, erro: "Essa proposta já foi aceita: o cliente continua vendo a versão aceita. Para mudar as condições, duplique a proposta." };
  const v = await lerVersao(id, p.versao_atual);
  if (!v) return { ok: false, erro: "Versão não encontrada." };
  const falta = pendenciasPublicar(v.dados);
  if (falta.length) return { ok: false, erro: `Antes de enviar, preencha: ${falta.join(", ")}.` };
  if (v.dados.condicoes.validade < hojeISO()) return { ok: false, erro: "A validade já passou. Ajuste a data de validade." };
  const status: Status = ["rascunho", "vencida", "recusada"].includes(p.status) ? "enviada" : p.status;
  await supabaseAdmin()
    .from("propostas")
    .update({ versao_publicada: p.versao_atual, status, enviada_em: p.enviada_em ?? agora(), atualizado_em: agora() })
    .eq("id", id);
  await registrar(id, "publicada", { versao: p.versao_atual, total: v.total }, u.id);
  revalidatePath(`/painel/propostas/${id}`);
  return { ok: true, codigo: p.codigo };
}

export async function registrarEnvioWhatsapp(id: string) {
  const u = await exigirUsuario();
  await registrar(id, "whatsapp_aberto", {}, u.id);
}

export async function duplicarProposta(id: string) {
  const u = await exigirUsuario();
  const p = await propostaPorId(id);
  if (!p) throw new Error("não encontrada");
  const v = await lerVersao(id, p.versao_atual);
  const { geral } = await configuracoes();
  if (!v) throw new Error("sem versão");
  const dados: DadosProposta = { ...v.dados, condicoes: { ...v.dados.condicoes, validade: somarDias(hojeISO(), geral.validadeDias) } };
  const db = supabaseAdmin();
  const { data, error } = await db.from("propostas").insert({ codigo: codigoPublico(), criado_por: u.id, parceiro_id: p.parceiro_id, ...copias(dados) }).select("id, numero").single();
  if (error || !data) throw new Error(error?.message ?? "não duplicou");
  await db.from("proposta_versoes").insert({ proposta_id: data.id, versao: 1, dados, total: calcular(dados.itens, dados.financeiro).total, criado_por: u.id });
  await registrar(data.id, "criada", { duplicada_de: p.numero }, u.id);
  await registrar(id, "duplicada", { nova: data.numero }, u.id);
  redirect(`/painel/propostas/${data.id}`);
}

export async function arquivarProposta(id: string, arquivar: boolean): Promise<R> {
  const u = await exigirUsuario();
  await supabaseAdmin().from("propostas").update({ arquivada: arquivar, atualizado_em: agora() }).eq("id", id);
  await registrar(id, arquivar ? "arquivada" : "desarquivada", {}, u.id);
  revalidatePath("/painel/propostas");
  revalidatePath(`/painel/propostas/${id}`);
  return { ok: true };
}

const MANUAIS: Status[] = ["enviada", "negociacao", "recusada", "contrato_enviado", "contratada"];

export async function mudarStatus(id: string, status: Status): Promise<R> {
  const u = await exigirUsuario();
  if (!MANUAIS.includes(status)) return { ok: false, erro: "Status inválido." };
  const p = await propostaPorId(id);
  if (!p) return { ok: false, erro: "Proposta não encontrada." };
  if ((status === "contrato_enviado" || status === "contratada") && !p.versao_aceita) return { ok: false, erro: "Só depois do aceite do cliente." };
  if ((status === "enviada" || status === "negociacao") && p.versao_aceita) return { ok: false, erro: "Proposta já aceita." };
  if (status === "enviada" && !p.versao_publicada) return { ok: false, erro: "Envie a proposta primeiro." };
  await supabaseAdmin().from("propostas").update({ status, atualizado_em: agora() }).eq("id", id);
  await registrar(id, "status", { de: p.status, para: status }, u.id);
  revalidatePath(`/painel/propostas/${id}`);
  revalidatePath("/painel/aceitas");
  return { ok: true };
}

export async function verificarAgenda(data: string, exceto: string) {
  await exigirUsuario();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return [];
  return conflitosAgenda(data, exceto);
}
