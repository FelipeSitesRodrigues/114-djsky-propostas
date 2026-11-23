import Link from "next/link";
import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { COLUNAS_PROPOSTA, statusEfetivo, type PropostaLinha } from "@/lib/dados";
import { reais } from "@/lib/proposta/calculo";
import { dataBR, hojeISO } from "@/lib/proposta/padrao";
import { STATUS, TIPOS_EVENTO } from "@/lib/proposta/tipos";
import { Status } from "@/components/painel/Status";
import { NovaProposta } from "@/components/painel/NovaProposta";

export const metadata: Metadata = { title: "Início" };

const FECHADAS = ["aceita", "contrato_enviado", "contratada"];

export default async function Inicio() {
  const u = await exigirUsuario();
  const db = supabaseAdmin();
  const [{ data }, { data: avisos }] = await Promise.all([
    db.from("propostas").select(COLUNAS_PROPOSTA).eq("arquivada", false).order("atualizado_em", { ascending: false }).limit(1000),
    db.from("notificacoes").select("id, titulo, texto, criado_em, proposta_id, lida").order("criado_em", { ascending: false }).limit(6),
  ]);
  const todas = ((data ?? []) as PropostaLinha[]).map((p) => ({ ...p, efetivo: statusEfetivo(p) }));
  const conta = (s: string) => todas.filter((p) => p.efetivo === s).length;
  const enviadas = todas.filter((p) => p.versao_publicada !== null);
  const fechadas = todas.filter((p) => FECHADAS.includes(p.efetivo));
  const conversao = enviadas.length ? Math.round((fechadas.length / enviadas.length) * 100) : 0;
  const hoje = hojeISO();
  const proximos = fechadas.filter((p) => p.evento_data && p.evento_data >= hoje).sort((a, b) => String(a.evento_data).localeCompare(String(b.evento_data))).slice(0, 6);
  const recentes = todas.slice(0, 8);
  const nomeTipo = new Map<string, string>(TIPOS_EVENTO.map(([k, v]) => [k, v]));
  const primeiro = u.nome.split(/\s+/)[0];

  return (
    <>
      <div className="pn-topo">
        <div>
          <h1>Olá, {primeiro}</h1>
          <p>{conta("aceita") ? `${conta("aceita")} ${conta("aceita") === 1 ? "proposta aceita espera" : "propostas aceitas esperam"} contrato.` : "Nenhum contrato pendente."}</p>
        </div>
        <div className="pn-acoes"><NovaProposta /></div>
      </div>

      {/* o que pede ação agora, com o que fazer em cada caso */}
      <h2 className="pn-secao-titulo">Precisa de você</h2>
      <div className="pn-agora">
        <Link className="pn-agora__item pn-agora__item--forte" href="/painel/aceitas">
          <b>{conta("aceita")}</b>
          <span>Aguardando contrato</span>
          <small>Aceitas pelo cliente. Abra a ficha e faça o contrato.</small>
        </Link>
        <Link className="pn-agora__item" href="/painel/propostas?status=negociacao">
          <b>{conta("negociacao")}</b>
          <span>Em negociação</span>
          <small>O cliente pediu alteração pelo WhatsApp.</small>
        </Link>
        <Link className="pn-agora__item" href="/painel/propostas?status=rascunho">
          <b>{conta("rascunho")}</b>
          <span>Rascunhos</span>
          <small>Ainda não foram enviadas. Termine e envie.</small>
        </Link>
      </div>

      {/* caminho de uma proposta, da ida ao contrato */}
      <h2 className="pn-secao-titulo">Funil</h2>
      <div className="pn-funil">
        {(["enviada", "visualizada", "aceita", "contratada"] as const).map((k) => (
          <Link key={k} className="pn-funil__passo" href={`/painel/propostas?status=${k}`}>
            <b>{conta(k)}</b>
            <span>{STATUS.find(([x]) => x === k)?.[1]}</span>
          </Link>
        ))}
        <div className="pn-funil__resultado">
          <div><small>Conversão</small><b>{conversao}%</b><span>das enviadas viraram aceite</span></div>
          <div><small>Valor fechado</small><b>{reais(fechadas.reduce((s, p) => s + p.total, 0))}</b>{conta("vencida") > 0 && <Link href="/painel/propostas?status=vencida">{conta("vencida")} vencida{conta("vencida") > 1 ? "s" : ""}</Link>}</div>
        </div>
      </div>

      <div className="pn-grade pn-grade--2" style={{ alignItems: "start" }}>
        <div className="pn-cartao pn-rolagem">
          <h2>Mexidas por último <Link className="botao botao--texto" href="/painel/propostas">Ver todas</Link></h2>
          {recentes.length ? (
            <table className="pn-tabela">
              <tbody>
                {recentes.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/painel/propostas/${p.id}`}>{p.cliente_nome || "Sem nome"}</Link><span className="pn-sub">{[nomeTipo.get(p.evento_tipo), dataBR(p.evento_data)].filter(Boolean).join(" · ")}</span></td>
                    <td><Status s={p.efetivo} /></td>
                    <td className="pn-num" style={{ textAlign: "right" }}>{reais(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="pn-vazio">Nenhuma proposta ainda. Comece pela primeira.</p>
          )}
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div className="pn-cartao">
            <h2>Próximos eventos fechados</h2>
            {proximos.length ? (
              <ul className="pn-lista-hist">
                {proximos.map((p) => (
                  <li key={p.id}><Link href={`/painel/propostas/${p.id}`} style={{ fontWeight: 600 }}>{p.evento_nome || p.cliente_nome}</Link><time>{dataBR(p.evento_data, true)}{p.evento_cidade ? ` · ${p.evento_cidade}` : ""}</time></li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--texto-2)" }}>Nenhum evento fechado pela frente.</p>
            )}
          </div>
          <div className="pn-cartao">
            <h2>Avisos <Link className="botao botao--texto" href="/painel/avisos">Ver todos</Link></h2>
            {avisos?.length ? (
              <ul className="pn-lista-hist">
                {(avisos as { id: number; titulo: string; texto: string; criado_em: string; proposta_id: string | null; lida: boolean }[]).map((a) => (
                  <li key={a.id} style={{ borderLeftColor: a.lida ? undefined : "var(--magenta)" }}>
                    {a.proposta_id ? <Link href={`/painel/propostas/${a.proposta_id}`} style={{ fontWeight: 600 }}>{a.titulo}</Link> : <b>{a.titulo}</b>}
                    <span style={{ color: "var(--texto)" }}>{a.texto}</span>
                    <time>{new Date(a.criado_em).toLocaleString("pt-BR", { timeZone: "America/Maceio", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--texto-2)" }}>Sem avisos.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
