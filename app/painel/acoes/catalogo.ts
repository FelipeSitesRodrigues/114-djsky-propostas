"use server";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { registrar, type ItemPacote } from "@/lib/dados";
import { categoriaValida } from "@/components/painel/catalogo/categorias";

type Resposta = { ok: true } | { ok: false; erro: string };

export type DadosServico = {
  id?: string;
  nome: string;
  categoria: string;
  descricao: string;
  duracaoMin: number | null;
  duracaoMaxMin: number | null;
  preco: number;
  unidade: string;
  ordem: number;
  ativo: boolean;
};

export type DadosPacote = {
  id?: string;
  nome: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
  itens: ItemPacote[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRECO_MAX = 2_000_000_000; // R$ 20 milhões em centavos: cabe no int do banco
const MINUTOS_MAX = 24 * 60;

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const inteiroOk = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
const duracaoOk = (n: unknown) => n === null || inteiroOk(n, 0, MINUTOS_MAX);

const CAMINHO = "/painel/catalogo";

// ---------------------------------------------------------------- serviços

export async function salvarServico(d: DadosServico): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (d.id !== undefined && !UUID.test(String(d.id))) return { ok: false, erro: "Serviço não encontrado." };
  const nome = texto(d.nome, 120);
  if (!nome) return { ok: false, erro: "Dê um nome ao serviço." };
  const categoria = String(d.categoria ?? "");
  if (!categoriaValida(categoria)) return { ok: false, erro: "Escolha uma categoria da lista." };
  if (!duracaoOk(d.duracaoMin)) return { ok: false, erro: "A duração padrão tem que ser de 0 a 24 horas, em minutos." };
  if (!duracaoOk(d.duracaoMaxMin)) return { ok: false, erro: "A duração máxima tem que ser de 0 a 24 horas, em minutos." };
  if (d.duracaoMin !== null && d.duracaoMaxMin !== null && d.duracaoMaxMin < d.duracaoMin) return { ok: false, erro: "A duração máxima não pode ser menor que a padrão." };
  if (!inteiroOk(d.preco, 0, PRECO_MAX)) return { ok: false, erro: "Preço inválido." };
  if (!inteiroOk(d.ordem, -9999, 9999)) return { ok: false, erro: "A ordem tem que ser um número inteiro." };

  const linha = {
    nome,
    categoria,
    descricao: texto(d.descricao, 2000),
    duracao_min: d.duracaoMin,
    duracao_max_min: d.duracaoMaxMin,
    preco: d.preco,
    unidade: texto(d.unidade, 30) || "un",
    ordem: d.ordem,
    ativo: d.ativo === true,
  };
  const db = supabaseAdmin();
  let id = d.id;
  if (id) {
    const { data, error } = await db.from("servicos").update(linha).eq("id", id).select("id").maybeSingle();
    if (error) return { ok: false, erro: "Não deu pra salvar o serviço. Tente de novo." };
    if (!data) return { ok: false, erro: "Serviço não encontrado." };
  } else {
    const { data, error } = await db.from("servicos").insert(linha).select("id").single();
    if (error || !data) return { ok: false, erro: "Não deu pra criar o serviço. Tente de novo." };
    id = data.id as string;
  }
  await registrar(null, "servico_salvo", { id, nome, novo: !d.id }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}

// Serviço nunca é apagado: as propostas guardam o id dele no jsonb. Só sai do catálogo.
export async function ativarServico(id: string, ativo: boolean): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (!UUID.test(String(id))) return { ok: false, erro: "Serviço não encontrado." };
  const { data, error } = await supabaseAdmin().from("servicos").update({ ativo: ativo === true }).eq("id", id).select("id, nome").maybeSingle();
  if (error) return { ok: false, erro: "Não deu pra mudar o serviço. Tente de novo." };
  if (!data) return { ok: false, erro: "Serviço não encontrado." };
  await registrar(null, ativo ? "servico_ativado" : "servico_desativado", { id, nome: data.nome }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}

// ---------------------------------------------------------------- pacotes

export async function salvarPacote(d: DadosPacote): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (d.id !== undefined && !UUID.test(String(d.id))) return { ok: false, erro: "Pacote não encontrado." };
  const nome = texto(d.nome, 120);
  if (!nome) return { ok: false, erro: "Dê um nome ao pacote." };
  if (!inteiroOk(d.ordem, -9999, 9999)) return { ok: false, erro: "A ordem tem que ser um número inteiro." };
  if (!Array.isArray(d.itens) || d.itens.length === 0) return { ok: false, erro: "Coloque pelo menos um serviço no pacote." };
  if (d.itens.length > 60) return { ok: false, erro: "Pacote com itens demais." };

  const itens: ItemPacote[] = [];
  for (const [n, i] of d.itens.entries()) {
    const pos = `Item ${n + 1}`;
    if (!i || !UUID.test(String(i.servicoId))) return { ok: false, erro: `${pos}: escolha um serviço.` };
    if (!inteiroOk(i.quantidade, 1, 999)) return { ok: false, erro: `${pos}: a quantidade tem que ser de 1 a 999.` };
    if (!duracaoOk(i.duracaoMin)) return { ok: false, erro: `${pos}: a duração tem que ser de 0 a 24 horas, em minutos.` };
    if (!inteiroOk(i.precoUnit, 0, PRECO_MAX)) return { ok: false, erro: `${pos}: preço inválido.` };
    if (i.tipo !== "base" && i.tipo !== "adicional") return { ok: false, erro: `${pos}: escolha base ou adicional.` };
    itens.push({ servicoId: i.servicoId, quantidade: i.quantidade, duracaoMin: i.duracaoMin, precoUnit: i.precoUnit, tipo: i.tipo });
  }

  const db = supabaseAdmin();
  const ids = [...new Set(itens.map((i) => i.servicoId))];
  const { data: achados, error: erroServ } = await db.from("servicos").select("id").in("id", ids);
  if (erroServ) return { ok: false, erro: "Não deu pra conferir os serviços. Tente de novo." };
  if ((achados ?? []).length !== ids.length) return { ok: false, erro: "Um dos serviços do pacote não existe mais. Recarregue a página." };

  const linha = { nome, descricao: texto(d.descricao, 2000), ordem: d.ordem, ativo: d.ativo === true, itens };
  let id = d.id;
  if (id) {
    const { data, error } = await db.from("pacotes").update(linha).eq("id", id).select("id").maybeSingle();
    if (error) return { ok: false, erro: "Não deu pra salvar o pacote. Tente de novo." };
    if (!data) return { ok: false, erro: "Pacote não encontrado." };
  } else {
    const { data, error } = await db.from("pacotes").insert(linha).select("id").single();
    if (error || !data) return { ok: false, erro: "Não deu pra criar o pacote. Tente de novo." };
    id = data.id as string;
  }
  await registrar(null, "pacote_salvo", { id, nome, itens: itens.length, novo: !d.id }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}

export async function ativarPacote(id: string, ativo: boolean): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (!UUID.test(String(id))) return { ok: false, erro: "Pacote não encontrado." };
  const { data, error } = await supabaseAdmin().from("pacotes").update({ ativo: ativo === true }).eq("id", id).select("id, nome").maybeSingle();
  if (error) return { ok: false, erro: "Não deu pra mudar o pacote. Tente de novo." };
  if (!data) return { ok: false, erro: "Pacote não encontrado." };
  await registrar(null, ativo ? "pacote_ativado" : "pacote_desativado", { id, nome: data.nome }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}

// Pacote pode ser apagado: aplicar um pacote copia os itens pra proposta, nada aponta pra ele.
export async function apagarPacote(id: string): Promise<Resposta> {
  const usuario = await exigirUsuario();
  if (!UUID.test(String(id))) return { ok: false, erro: "Pacote não encontrado." };
  const { data, error } = await supabaseAdmin().from("pacotes").delete().eq("id", id).select("id, nome").maybeSingle();
  if (error) return { ok: false, erro: "Não deu pra apagar o pacote. Tente de novo." };
  if (!data) return { ok: false, erro: "Pacote não encontrado." };
  await registrar(null, "pacote_apagado", { id, nome: data.nome }, usuario.id);
  revalidatePath(CAMINHO);
  return { ok: true };
}
