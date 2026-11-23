import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reais } from "@/lib/proposta/calculo";
import { dataBR } from "@/lib/proposta/padrao";
import { mascararCpf } from "@/lib/proposta/cpf";
import { hora } from "@/lib/proposta/cronograma";
import { TIPOS_EVENTO, type DadosProposta } from "@/lib/proposta/tipos";
import { Status } from "@/components/painel/Status";
import { FichaContrato } from "@/components/painel/FichaContrato";

export const metadata: Metadata = { title: "Dados para o contrato" };

type Aceite = {
  id: string;
  proposta_id: string;
  versao: number;
  retrato: { dados: DadosProposta; conta: { total: number; sinal: number; saldo: number; desconto: number; subtotal: number }; declaracao?: string; aceitoEm?: string };
  total: number;
  nome: string;
  cpf_finais: string | null;
  cidade_uf: string;
  dados_apagados_em: string | null;
  criado_em: string;
};

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirUsuario();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = supabaseAdmin();
  const { data } = await db.from("aceites").select("id, proposta_id, versao, retrato, total, nome, cpf_finais, cidade_uf, dados_apagados_em, criado_em").eq("id", id).maybeSingle();
  const a = data as Aceite | null;
  if (!a) notFound();
  const [{ data: p }, { count: correcoes }] = await Promise.all([
    db.from("propostas").select("id, numero, status").eq("id", a.proposta_id).single(),
    db.from("aceite_correcoes").select("id", { count: "exact", head: true }).eq("aceite_id", id),
  ]);
  const d = a.retrato.dados;
  const c = a.retrato.conta;
  const tipo = TIPOS_EVENTO.find(([k]) => k === d.evento.tipo)?.[1] ?? "Evento";
  const prop = p as { id: string; numero: number; status: string };

  return (
    <>
      <div className="pn-topo">
        <div>
          <span className="rotulo">Proposta nº {String(prop.numero).padStart(4, "0")} · versão aceita {a.versao}</span>
          <h1 style={{ marginTop: 6 }}>{a.nome}</h1>
          <p style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Status s={prop.status} />
            Aceita em {new Date(a.criado_em).toLocaleString("pt-BR", { timeZone: "America/Maceio" })}
          </p>
        </div>
        <div className="pn-acoes">
          <Link className="botao" href={`/painel/propostas/${prop.id}`}>Abrir proposta</Link>
          <a className="botao" href={`/painel/previa/${prop.id}?v=${a.versao}`} target="_blank" rel="noopener">Ver versão aceita</a>
        </div>
      </div>

      <div className="pn-grade pn-grade--2" style={{ alignItems: "start" }}>
        <FichaContrato
          aceiteId={a.id}
          ehAdmin={u.papel === "admin"}
          nome={a.nome}
          cpfMascarado={a.cpf_finais ? mascararCpf(a.cpf_finais) : ""}
          cidadeUf={a.cidade_uf}
          apagado={!!a.dados_apagados_em}
          correcoes={correcoes ?? 0}
          referencia={`Proposta nº ${String(prop.numero).padStart(4, "0")}, ${d.evento.nome || tipo}, ${dataBR(d.evento.data)}${d.evento.local ? `, ${d.evento.local}` : ""}${d.evento.cidade ? `, ${d.evento.cidade}` : ""}. Valor ${reais(c.total)}.`}
        />

        <div className="pn-cartao pn-ficha">
          <h2>O que foi aceito</h2>
          <dl>
            <div><dt>Evento</dt><dd>{d.evento.nome || tipo}</dd></div>
            <div><dt>Tipo</dt><dd>{tipo}</dd></div>
            <div><dt>Data e horário</dt><dd>{dataBR(d.evento.data, true)}, {hora(d.evento.inicio)} às {hora(d.evento.termino)}</dd></div>
            <div><dt>Local</dt><dd>{[d.evento.local, d.evento.endereco, d.evento.cidade].filter(Boolean).join(", ")}</dd></div>
            <div><dt>Serviços</dt><dd>{d.itens.map((i) => `${i.quantidade > 1 ? `${i.quantidade}× ` : ""}${i.nome}`).join(", ")}</dd></div>
            <div><dt>Subtotal</dt><dd>{reais(c.subtotal)}</dd></div>
            {c.subtotal > c.total && <div><dt>Desconto</dt><dd>{reais(c.subtotal - c.total)}{d.financeiro.descontoMotivo ? ` (${d.financeiro.descontoMotivo})` : ""}</dd></div>}
            <div><dt>Total</dt><dd>{reais(c.total)}</dd></div>
            <div><dt>Sinal</dt><dd>{reais(c.sinal)} ({d.financeiro.sinalPercentual}%){d.financeiro.sinalVencimento ? `, até ${dataBR(d.financeiro.sinalVencimento)}` : ""}</dd></div>
            <div><dt>Saldo</dt><dd>{reais(c.saldo)}{d.financeiro.saldoVencimento ? `, até ${dataBR(d.financeiro.saldoVencimento)}` : ""}</dd></div>
            <div><dt>Pagamento</dt><dd>{d.financeiro.formaPagamento}</dd></div>
            <div><dt>Contato</dt><dd>{[d.cliente.whatsapp, d.cliente.email].filter(Boolean).join(" · ")}</dd></div>
          </dl>
          {a.retrato.declaracao && <p style={{ marginTop: 14, color: "var(--texto-2)", fontSize: 12.5 }}>Declaração aceita: &quot;{a.retrato.declaracao}&quot;</p>}
        </div>
      </div>
    </>
  );
}
