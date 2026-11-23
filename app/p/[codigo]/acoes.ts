"use server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { propostaPorCodigo, registrar, statusEfetivo, versao as lerVersao, configuracoes } from "@/lib/dados";
import { calcular } from "@/lib/proposta/calculo";
import { soDigitos } from "@/lib/proposta/cpf";
import { TEXTO_DECLARACAO, validarAceite, type DadosAceite, type RespostaAceite } from "@/lib/proposta/aceite";
import { cifrar, hashSecreto } from "@/lib/seguranca/cifra";
import { enviarAvisoEmail } from "@/lib/avisos";

const LIMITE = 8; // tentativas por IP a cada 15 min

async function origem() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return { ip, navegador: (h.get("user-agent") ?? "").slice(0, 180) };
}

export async function aceitarProposta(codigo: string, versao: number, d: DadosAceite): Promise<RespostaAceite> {
  // robôs: campo escondido preenchido ou formulário enviado rápido demais
  if (d.site) return { ok: false, erro: "Não foi possível enviar. Atualize a página e tente de novo." };
  if (!d.abertoEm || Date.now() - Number(d.abertoEm) < 4000) return { ok: false, erro: "Confira os dados antes de enviar e tente de novo." };
  if (!/^[A-Za-z0-9-]{16,64}$/.test(String(d.chave ?? ""))) return { ok: false, erro: "Atualize a página e tente de novo." };

  const { ip, navegador } = await origem();
  const ipHash = hashSecreto(ip);
  const db = supabaseAdmin();
  const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db.from("tentativas").select("id", { count: "exact", head: true }).eq("chave", `aceite:${ipHash}`).gte("criado_em", desde);
  if ((count ?? 0) >= LIMITE) return { ok: false, erro: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };
  await db.from("tentativas").insert({ chave: `aceite:${ipHash}` });

  const campos = validarAceite(d);
  if (Object.keys(campos).length) return { ok: false, erro: "Confira os campos destacados.", campos };

  const p = await propostaPorCodigo(codigo);
  if (!p || p.arquivada || !p.versao_publicada) return { ok: false, erro: "Proposta não encontrada." };
  const st = statusEfetivo(p);
  if (p.versao_aceita) return { ok: false, erro: "Essa proposta já foi aceita." };
  if (st === "vencida") return { ok: false, erro: "Essa proposta venceu. Fale com a equipe SKY pelo WhatsApp." };
  if (st === "recusada") return { ok: false, erro: "Essa proposta foi encerrada. Fale com a equipe SKY pelo WhatsApp." };
  if (p.versao_publicada !== versao) return { ok: false, erro: "A proposta foi atualizada enquanto você lia. Recarregue a página para ver a versão nova." };

  const v = await lerVersao(p.id, versao);
  if (!v) return { ok: false, erro: "Proposta não encontrada." };
  const conta = calcular(v.dados.itens, v.dados.financeiro);
  const cpf = soDigitos(d.cpf);
  const endereco = {
    cep: soDigitos(d.cep),
    logradouro: d.logradouro.trim(),
    numero: d.numero.trim(),
    complemento: (d.complemento ?? "").trim(),
    bairro: d.bairro.trim(),
    cidade: d.cidade.trim(),
    uf: d.uf.toUpperCase(),
  };
  const nome = d.nome.trim().replace(/\s+/g, " ");

  const { data, error } = await db.rpc("registrar_aceite", {
    p_codigo: codigo,
    p_versao: versao,
    p_retrato: { versao, dados: v.dados, conta, aceitoEm: new Date().toISOString(), declaracao: TEXTO_DECLARACAO },
    p_total: conta.total,
    p_nome: nome,
    p_cpf_cifrado: cifrar(cpf),
    p_cpf_finais: cpf.slice(-2),
    p_endereco_cifrado: cifrar(endereco),
    p_cidade_uf: `${endereco.cidade}/${endereco.uf}`,
    p_ip_hash: ipHash,
    p_navegador: navegador,
    p_idempotencia: d.chave,
  });
  if (error) {
    console.error("aceite", error.message);
    return { ok: false, erro: "Não foi possível registrar agora. Tente de novo em instantes." };
  }
  const r = data as { ok: boolean; erro?: string; repetido?: boolean };
  if (!r.ok) {
    const msg: Record<string, string> = {
      ja_aceita: "Essa proposta já foi aceita.",
      vencida: "Essa proposta venceu. Fale com a equipe SKY pelo WhatsApp.",
      versao_mudou: "A proposta foi atualizada enquanto você lia. Recarregue a página para ver a versão nova.",
      nao_encontrada: "Proposta não encontrada.",
    };
    return { ok: false, erro: msg[r.erro ?? ""] ?? "Não foi possível registrar agora." };
  }
  if (!r.repetido) {
    const { geral } = await configuracoes();
    await enviarAvisoEmail(geral.emailAvisos, `Proposta nº ${p.numero} aceita`, `A proposta nº ${p.numero} foi aceita. Os dados para o contrato estão no painel, em "Aguardando contrato".`).catch(() => {});
  }
  return { ok: true };
}

// "Pedir alteração": registra o clique (status vira "em negociação") antes de abrir o WhatsApp
export async function registrarPedidoAlteracao(codigo: string) {
  const p = await propostaPorCodigo(codigo);
  if (!p || p.arquivada) return;
  if (["enviada", "visualizada"].includes(p.status)) await supabaseAdmin().from("propostas").update({ status: "negociacao", atualizado_em: new Date().toISOString() }).eq("id", p.id);
  await registrar(p.id, "pedido_alteracao", { versao: p.versao_publicada });
  await supabaseAdmin().from("notificacoes").insert({ proposta_id: p.id, titulo: "Pedido de alteração", texto: `O cliente da proposta nº ${p.numero} tocou em "Pedir alteração" e foi pro WhatsApp.` });
}
