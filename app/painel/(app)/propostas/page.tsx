import Link from "next/link";
import { DataVidro } from "@/components/painel/DataVidro";
import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { COLUNAS_PROPOSTA, parceiros as listarParceiros, statusEfetivo, type PropostaLinha } from "@/lib/dados";
import { STATUS, TIPOS_EVENTO } from "@/lib/proposta/tipos";
import { reais } from "@/lib/proposta/calculo";
import { dataBR } from "@/lib/proposta/padrao";
import { Status } from "@/components/painel/Status";
import { NovaProposta } from "@/components/painel/NovaProposta";

export const metadata: Metadata = { title: "Propostas" };

type Busca = { q?: string; status?: string; tipo?: string; parceiro?: string; de?: string; ate?: string; arquivadas?: string };

export default async function Propostas({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirUsuario();
  const b = await searchParams;
  const db = supabaseAdmin();
  let q = db.from("propostas").select(COLUNAS_PROPOSTA).eq("arquivada", b.arquivadas === "1").order("atualizado_em", { ascending: false }).limit(500);
  const termo = String(b.q ?? "").replace(/[^\p{L}\p{N} ]/gu, " ").trim().slice(0, 60);
  if (termo) {
    const n = Number(termo);
    q = Number.isInteger(n) && n > 0 ? q.eq("numero", n) : q.or(`cliente_nome.ilike.%${termo}%,evento_nome.ilike.%${termo}%,evento_cidade.ilike.%${termo}%`);
  }
  if (b.tipo) q = q.eq("evento_tipo", b.tipo);
  if (b.parceiro) q = q.eq("parceiro_id", b.parceiro);
  if (b.de && /^\d{4}-\d{2}-\d{2}$/.test(b.de)) q = q.gte("evento_data", b.de);
  if (b.ate && /^\d{4}-\d{2}-\d{2}$/.test(b.ate)) q = q.lte("evento_data", b.ate);
  const [{ data }, parceiros] = await Promise.all([q, listarParceiros()]);
  const linhas = ((data ?? []) as PropostaLinha[]).map((p) => ({ ...p, efetivo: statusEfetivo(p) })).filter((p) => !b.status || p.efetivo === b.status);
  const nomeParceiro = new Map(parceiros.map((p) => [p.id, p.nome]));
  const nomeTipo = new Map<string, string>(TIPOS_EVENTO.map(([k, v]) => [k, v]));

  return (
    <>
      <div className="pn-topo">
        <div>
          <h1>Propostas</h1>
          <p>{linhas.length} {linhas.length === 1 ? "proposta" : "propostas"}{b.arquivadas === "1" ? " arquivadas" : ""}. Clique numa linha pra abrir, editar e enviar.</p>
        </div>
        <div className="pn-acoes"><NovaProposta /></div>
      </div>

      <form className="pn-filtros" method="get">
        <label className="campo pn-busca">
          <span>Buscar</span>
          <input className="entrada" name="q" defaultValue={b.q ?? ""} placeholder="Cliente, evento, cidade ou nº" />
        </label>
        <label className="campo">
          <span>Status</span>
          <select className="entrada" name="status" defaultValue={b.status ?? ""}>
            <option value="">Todos</option>
            {STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Tipo</span>
          <select className="entrada" name="tipo" defaultValue={b.tipo ?? ""}>
            <option value="">Todos</option>
            {TIPOS_EVENTO.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Parceiro</span>
          <select className="entrada" name="parceiro" defaultValue={b.parceiro ?? ""}>
            <option value="">Todos</option>
            {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        <div className="campo">
          <span>Evento de</span>
          <DataVidro rotulo="Evento de" name="de" defaultValue={b.de ?? ""} />
        </div>
        <div className="campo">
          <span>até</span>
          <DataVidro rotulo="Evento até" name="ate" defaultValue={b.ate ?? ""} />
        </div>
        {b.arquivadas === "1" && <input type="hidden" name="arquivadas" value="1" />}
        <button className="botao">Filtrar</button>
        <Link className="botao botao--texto" href={b.arquivadas === "1" ? "/painel/propostas" : "/painel/propostas?arquivadas=1"}>{b.arquivadas === "1" ? "Ver ativas" : "Ver arquivadas"}</Link>
      </form>

      <div className="pn-cartao pn-rolagem" style={{ padding: 0 }}>
        {linhas.length === 0 ? (
          <p className="pn-vazio">Nenhuma proposta por aqui ainda.</p>
        ) : (
          <table className="pn-tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente e evento</th>
                <th>Data do evento</th>
                <th>Status</th>
                <th className="pn-esconde-cel">Parceiro</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <tr key={p.id}>
                  <td className="pn-num">{String(p.numero).padStart(4, "0")}</td>
                  <td>
                    <Link href={`/painel/propostas/${p.id}`}>{p.cliente_nome || "Sem nome"}</Link>
                    <span className="pn-sub">{[nomeTipo.get(p.evento_tipo), p.evento_nome, p.evento_cidade].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="pn-num">{dataBR(p.evento_data) || "sem data"}</td>
                  <td><Status s={p.efetivo} /></td>
                  <td className="pn-esconde-cel">{p.parceiro_id ? nomeParceiro.get(p.parceiro_id) ?? "" : ""}</td>
                  <td className="pn-num" style={{ textAlign: "right" }}>{reais(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
