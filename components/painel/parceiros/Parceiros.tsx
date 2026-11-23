"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Parceiro } from "@/lib/dados";
import { apagarParceiro, ativarParceiro, salvarParceiro } from "@/app/painel/acoes/parceiros";
import { Janela, fecharJanela } from "@/components/painel/catalogo/Janela";
import { TIPOS_PARCEIRO, nomeTipoParceiro } from "./tipos";

export type Contagem = { total: number; aceitas: number; qualquer: number };
type Resposta = { ok: true } | { ok: false; erro: string };

const pct = (n: number) => `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

// Link do WhatsApp: só dígitos, com 55 na frente quando vier só DDD + número
function linkWhats(w: string) {
  const d = w.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

export function Parceiros({ parceiros, contagem }: { parceiros: Parceiro[]; contagem: Record<string, Contagem> }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Parceiro | "novo" | null>(null);
  const [erro, setErro] = useState("");
  const [indo, comecar] = useTransition();

  const executar = (acao: () => Promise<Resposta>) => {
    setErro("");
    comecar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  };
  const apagar = (p: Parceiro) => {
    if (!window.confirm(`Apagar "${p.nome}"? Isso não tem volta.`)) return;
    executar(() => apagarParceiro(p.id));
  };

  return (
    <>
      <header className="pn-topo">
        <div>
          <h1>Parceiros</h1>
          <p>Cerimonialistas, assessorias e espaços que indicam a SKY, com o desconto que cada um costuma levar.</p>
        </div>
        <div className="pn-acoes">
          <button type="button" className="botao botao--magenta" onClick={() => setEditando("novo")}>Novo parceiro</button>
        </div>
      </header>
      <section className="pn-cartao">
        {erro && <div className="aviso aviso--erro cat-aviso" role="alert">{erro}</div>}
        {parceiros.length === 0 ? (
          <p className="pn-vazio">Nenhum parceiro ainda. Cadastre em &quot;Novo parceiro&quot;.</p>
        ) : (
          <div className="pn-rolagem">
            <table className="pn-tabela">
              <thead>
                <tr>
                  <th>Parceiro</th>
                  <th>Tipo</th>
                  <th>Contato</th>
                  <th>Desconto</th>
                  <th>Propostas</th>
                  <th>Situação</th>
                  <th><span className="cat-oculto">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {parceiros.map((p) => {
                  const c = contagem[p.id] ?? { total: 0, aceitas: 0, qualquer: 0 };
                  const whats = linkWhats(p.whatsapp);
                  return (
                    <tr key={p.id} className={p.ativo ? undefined : "cat-inativo"}>
                      <td className="cat-nome">
                        <b>{p.nome}</b>
                        {p.observacoes && <span className="pn-sub">{p.observacoes}</span>}
                      </td>
                      <td>{nomeTipoParceiro(p.tipo)}</td>
                      <td className="par-contato">
                        {p.whatsapp ? (whats ? <a href={whats} target="_blank" rel="noopener noreferrer">{p.whatsapp}</a> : p.whatsapp) : "-"}
                        {p.email && <span className="pn-sub"><a href={`mailto:${p.email}`}>{p.email}</a></span>}
                      </td>
                      <td className="pn-num">{pct(p.desconto_padrao)}</td>
                      <td className="pn-num par-propostas">
                        <b>{c.total}</b>
                        <span className="pn-sub">{c.aceitas === 1 ? "1 aceita" : `${c.aceitas} aceitas`}</span>
                      </td>
                      <td><span className={`pn-status cat-ativo cat-ativo--${p.ativo ? "sim" : "nao"}`}>{p.ativo ? "Ativo" : "Inativo"}</span></td>
                      <td>
                        <div className="cat-linha-acoes">
                          <button type="button" className="botao botao--sm" onClick={() => setEditando(p)}>Editar</button>
                          <button type="button" className="botao botao--texto" disabled={indo} onClick={() => executar(() => ativarParceiro(p.id, !p.ativo))}>{p.ativo ? "Desativar" : "Ativar"}</button>
                          {c.qualquer === 0 && (
                            <button type="button" className="botao botao--texto cat-perigo" disabled={indo} onClick={() => apagar(p)}>Apagar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editando && (
        <JanelaParceiro
          key={editando === "novo" ? "novo" : editando.id}
          parceiro={editando === "novo" ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => router.refresh()}
        />
      )}
    </>
  );
}

function JanelaParceiro({ parceiro, onFechar, onSalvo }: { parceiro: Parceiro | null; onFechar: () => void; onSalvo: () => void }) {
  const tipoInicial = parceiro?.tipo ?? "cerimonialista";
  const naLista = TIPOS_PARCEIRO.some(([v]) => v === tipoInicial);
  const [tipo, setTipo] = useState(naLista ? tipoInicial : "outro");
  const [tipoLivre, setTipoLivre] = useState(naLista ? "" : tipoInicial);
  const [nome, setNome] = useState(parceiro?.nome ?? "");
  const [whatsapp, setWhatsapp] = useState(parceiro?.whatsapp ?? "");
  const [email, setEmail] = useState(parceiro?.email ?? "");
  const [desconto, setDesconto] = useState(parceiro ? String(Number(parceiro.desconto_padrao)).replace(".", ",") : "0");
  const [observacoes, setObservacoes] = useState(parceiro?.observacoes ?? "");
  const [ativo, setAtivo] = useState(parceiro?.ativo ?? true);
  const [erro, setErro] = useState("");
  const [indo, comecar] = useTransition();

  return (
    <Janela titulo={parceiro ? "Editar parceiro" : "Novo parceiro"} onFechar={onFechar}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setErro("");
            const t = desconto.trim().replace("%", "").replace(",", ".");
            const d = t === "" ? 0 : Number(t);
            if (!Number.isFinite(d) || d < 0 || d > 100) return setErro("O desconto padrão tem que ser de 0 a 100%.");
            const tipoFinal = tipo === "outro" && tipoLivre.trim() ? tipoLivre.trim() : tipo;
            comecar(async () => {
              const r = await salvarParceiro({ id: parceiro?.id, nome, tipo: tipoFinal, whatsapp, email, descontoPadrao: d, observacoes, ativo });
              if (!r.ok) return setErro(r.erro);
              onSalvo();
              fecharJanela(form);
            });
          }}
        >
          <h2>{parceiro ? "Editar parceiro" : "Novo parceiro"}</h2>
          <div className="pn-grade pn-grade--2">
            <label className="campo pn-col-todo">
              <span>Nome</span>
              <input className="entrada" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className="campo">
              <span>Tipo</span>
              <select className="entrada" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_PARCEIRO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Desconto padrão (%)</span>
              <input className="entrada" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </label>
            {tipo === "outro" && (
              <label className="campo pn-col-todo">
                <span>Qual tipo? (opcional)</span>
                <input className="entrada" maxLength={40} placeholder="Ex.: fotógrafo" value={tipoLivre} onChange={(e) => setTipoLivre(e.target.value)} />
              </label>
            )}
            <label className="campo">
              <span>WhatsApp</span>
              <input className="entrada" type="tel" inputMode="tel" maxLength={30} placeholder="(79) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </label>
            <label className="campo">
              <span>E-mail</span>
              <input className="entrada" type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="campo pn-col-todo">
              <span>Observações</span>
              <textarea className="entrada" rows={3} maxLength={2000} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </label>
            <label className="cat-marcar pn-col-todo">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>Ativo (aparece pra escolher nas propostas)</span>
            </label>
          </div>
          {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
          <div className="pn-acoes cat-rodape">
            <button type="button" className="botao" onClick={(e) => fecharJanela(e.currentTarget)}>Cancelar</button>
            <button className="botao botao--magenta" disabled={indo}>{indo ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
    </Janela>
  );
}
