import type { Metadata } from "next";
import Link from "next/link";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MarcarLida, MarcarTodas } from "@/components/painel/avisos/Marcar";
import "./avisos.css";

export const metadata: Metadata = { title: "Avisos" };

type Aviso = { id: number; proposta_id: string | null; titulo: string; texto: string; lida: boolean; criado_em: string };

const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Maceio", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function PaginaAvisos() {
  await exigirUsuario();
  const { data } = await supabaseAdmin()
    .from("notificacoes")
    .select("id, proposta_id, titulo, texto, lida, criado_em")
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);
  const avisos = (data ?? []) as Aviso[];
  const naoLidos = avisos.filter((a) => !a.lida).length;

  return (
    <>
      <header className="pn-topo">
        <div>
          <h1>Avisos</h1>
          <p>{naoLidos ? `${naoLidos} ${naoLidos === 1 ? "aviso não lido" : "avisos não lidos"}.` : "Tudo lido."} Mostrando os últimos 100.</p>
        </div>
        {naoLidos ? (
          <div className="pn-acoes">
            <MarcarTodas />
          </div>
        ) : null}
      </header>

      {avisos.length ? (
        <ul className="av-lista">
          {avisos.map((a) => (
            <li key={a.id} className="av-item" data-nao-lido={!a.lida || undefined}>
              <div className="av-item__corpo">
                <div className="av-item__topo">
                  {!a.lida ? <><span className="av-ponto" aria-hidden="true" /><span className="sr-only">Não lido:</span></> : null}
                  <b>{a.titulo}</b>
                  <time dateTime={a.criado_em}>{quando.format(new Date(a.criado_em))}</time>
                </div>
                {a.texto ? <p>{a.texto}</p> : null}
              </div>
              <div className="av-item__acoes">
                {a.proposta_id ? (
                  <Link className="botao botao--sm" href={`/painel/propostas/${a.proposta_id}`}>
                    Abrir proposta
                  </Link>
                ) : null}
                {!a.lida ? <MarcarLida id={a.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="pn-cartao">
          <p className="pn-vazio">Nenhum aviso ainda. Quando um cliente abrir ou aceitar uma proposta, aparece aqui.</p>
        </div>
      )}
    </>
  );
}
