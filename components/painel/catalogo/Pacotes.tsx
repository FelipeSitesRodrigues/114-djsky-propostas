"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ItemPacote, Pacote, Servico } from "@/lib/dados";
import { reais, lerReais, valorItem } from "@/lib/proposta/calculo";
import { duracaoTexto } from "@/lib/proposta/cronograma";
import { apagarPacote, ativarPacote, salvarPacote } from "@/app/painel/acoes/catalogo";
import { Janela, fecharJanela, lerMinutos } from "./Janela";

const totalItens = (itens: Pick<ItemPacote, "quantidade" | "precoUnit">[]) => itens.reduce((s, i) => s + valorItem(i), 0);

export function Pacotes({ pacotes, servicos }: { pacotes: Pacote[]; servicos: Servico[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Pacote | "novo" | null>(null);
  const [erro, setErro] = useState("");
  const [indo, comecar] = useTransition();
  const porId = new Map(servicos.map((s) => [s.id, s]));
  const temAtivos = servicos.some((s) => s.ativo);

  const executar = (acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) => {
    setErro("");
    comecar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  };
  const apagar = (p: Pacote) => {
    if (!window.confirm(`Apagar o pacote "${p.nome}"? As propostas que já usaram ele não mudam.`)) return;
    executar(() => apagarPacote(p.id));
  };

  return (
    <section className="pn-cartao">
      <h2>
        Pacotes
        <button type="button" className="botao botao--magenta botao--sm" disabled={!temAtivos} title={temAtivos ? undefined : "Cadastre um serviço ativo antes"} onClick={() => setEditando("novo")}>Novo pacote</button>
      </h2>
      {erro && <div className="aviso aviso--erro cat-aviso" role="alert">{erro}</div>}
      {pacotes.length === 0 ? (
        <p className="pn-vazio">Nenhum pacote ainda. Pacote junta serviços que costumam ir juntos e entra na proposta de uma vez.</p>
      ) : (
        <div className="cat-pacotes">
          {pacotes.map((p) => (
            <article key={p.id} className={`cat-pacote${p.ativo ? "" : " cat-inativo"}`}>
              <header className="cat-pacote__topo">
                <div>
                  <h3>{p.nome}</h3>
                  {p.descricao && <span className="pn-sub">{p.descricao}</span>}
                </div>
                <span className={`pn-status cat-ativo cat-ativo--${p.ativo ? "sim" : "nao"}`}>{p.ativo ? "Ativo" : "Inativo"}</span>
              </header>
              <ul className="cat-itens">
                {p.itens.map((i, n) => {
                  const s = porId.get(i.servicoId);
                  return (
                    <li key={`${i.servicoId}-${n}`}>
                      <span className="cat-itens__nome">
                        {i.quantidade}x {s?.nome ?? "Serviço removido"}
                        {i.tipo === "adicional" && <em className="cat-tag">adicional</em>}
                        {s && !s.ativo && <em className="cat-tag cat-tag--aviso">inativo</em>}
                        {i.duracaoMin !== null && <span className="pn-sub">{duracaoTexto(i.duracaoMin)}</span>}
                      </span>
                      <span className="pn-num">{reais(valorItem(i))}</span>
                    </li>
                  );
                })}
              </ul>
              <footer className="cat-pacote__base">
                <span>Total <b className="pn-num">{reais(totalItens(p.itens))}</b></span>
                <div className="cat-linha-acoes">
                  <button type="button" className="botao botao--sm" onClick={() => setEditando(p)}>Editar</button>
                  <button type="button" className="botao botao--texto" disabled={indo} onClick={() => executar(() => ativarPacote(p.id, !p.ativo))}>{p.ativo ? "Desativar" : "Ativar"}</button>
                  <button type="button" className="botao botao--texto cat-perigo" disabled={indo} onClick={() => apagar(p)}>Apagar</button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
      {editando && (
        <JanelaPacote
          key={editando === "novo" ? "novo" : editando.id}
          pacote={editando === "novo" ? null : editando}
          servicos={servicos}
          onFechar={() => setEditando(null)}
          onSalvo={() => router.refresh()}
        />
      )}
    </section>
  );
}

type Linha = { chave: number; servicoId: string; quantidade: string; duracao: string; preco: string; tipo: "base" | "adicional" };

function JanelaPacote({ pacote, servicos, onFechar, onSalvo }: { pacote: Pacote | null; servicos: Servico[]; onFechar: () => void; onSalvo: () => void }) {
  const porId = new Map(servicos.map((s) => [s.id, s]));
  const [nome, setNome] = useState(pacote?.nome ?? "");
  const [descricao, setDescricao] = useState(pacote?.descricao ?? "");
  const [ordem, setOrdem] = useState(String(pacote?.ordem ?? 0));
  const [ativo, setAtivo] = useState(pacote?.ativo ?? true);
  const [proxima, setProxima] = useState((pacote?.itens.length ?? 0) + 1);
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    (pacote?.itens ?? []).map((i, n) => ({
      chave: n + 1,
      servicoId: i.servicoId,
      quantidade: String(i.quantidade),
      duracao: i.duracaoMin === null ? "" : String(i.duracaoMin),
      preco: reais(i.precoUnit),
      tipo: i.tipo,
    })),
  );
  const [erro, setErro] = useState("");
  const [indo, comecar] = useTransition();

  // ativos + os inativos que o pacote já usa (pra não sumir do select)
  const opcoes = servicos.filter((s) => s.ativo || linhas.some((l) => l.servicoId === s.id));
  const qtd = (l: Linha) => (/^\d+$/.test(l.quantidade.trim()) ? Number(l.quantidade) : 0);
  const total = linhas.reduce((s, l) => s + valorItem({ quantidade: qtd(l), precoUnit: lerReais(l.preco) }), 0);

  const mudar = (chave: number, campo: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...campo } : l)));
  const escolher = (chave: number, servicoId: string) => {
    const s = porId.get(servicoId);
    mudar(chave, { servicoId, duracao: s?.duracao_min != null ? String(s.duracao_min) : "", preco: s ? reais(s.preco) : "" });
  };
  const adicionar = () => {
    const s = servicos.find((x) => x.ativo);
    setLinhas((ls) => [...ls, { chave: proxima, servicoId: s?.id ?? "", quantidade: "1", duracao: s?.duracao_min != null ? String(s.duracao_min) : "", preco: s ? reais(s.preco) : "", tipo: "base" }]);
    setProxima((n) => n + 1);
  };

  const enviar = (form: HTMLFormElement) => {
    setErro("");
    const itens: ItemPacote[] = [];
    for (const [n, l] of linhas.entries()) {
      const d = lerMinutos(l.duracao);
      if (!l.servicoId) return setErro(`Item ${n + 1}: escolha um serviço.`);
      if (qtd(l) < 1) return setErro(`Item ${n + 1}: quantidade de pelo menos 1.`);
      if (Number.isNaN(d)) return setErro(`Item ${n + 1}: duração em minutos, só números.`);
      itens.push({ servicoId: l.servicoId, quantidade: qtd(l), duracaoMin: d, precoUnit: lerReais(l.preco), tipo: l.tipo });
    }
    if (!itens.length) return setErro("Coloque pelo menos um serviço no pacote.");
    const o = Number(ordem.trim() || "0");
    if (!Number.isInteger(o)) return setErro("A ordem tem que ser um número inteiro.");
    comecar(async () => {
      const r = await salvarPacote({ id: pacote?.id, nome, descricao, ordem: o, ativo, itens });
      if (!r.ok) return setErro(r.erro);
      onSalvo();
      fecharJanela(form);
    });
  };

  return (
    <Janela titulo={pacote ? "Editar pacote" : "Novo pacote"} larga onFechar={onFechar}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(e.currentTarget);
          }}
        >
          <h2>{pacote ? "Editar pacote" : "Novo pacote"}</h2>
          <div className="pn-grade pn-grade--2">
            <label className="campo pn-col-todo">
              <span>Nome</span>
              <input className="entrada" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className="campo pn-col-todo">
              <span>Descrição</span>
              <textarea className="entrada" rows={2} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </label>
            <label className="campo">
              <span>Ordem</span>
              <input className="entrada" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
            </label>
            <label className="cat-marcar">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>Ativo</span>
            </label>
          </div>

          <fieldset className="cat-editor">
            <legend>Serviços do pacote</legend>
            {linhas.length === 0 && <p className="pn-sub">Nenhum serviço ainda.</p>}
            {linhas.map((l, n) => {
              const d = lerMinutos(l.duracao);
              return (
                <div key={l.chave} className="cat-item">
                  <label className="campo cat-item__servico">
                    <span>Serviço {n + 1}</span>
                    <select className="entrada" value={l.servicoId} onChange={(e) => escolher(l.chave, e.target.value)}>
                      {!l.servicoId && <option value="">Escolha</option>}
                      {opcoes.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}{s.ativo ? "" : " (inativo)"}</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Qtd.</span>
                    <input className="entrada" inputMode="numeric" value={l.quantidade} aria-invalid={qtd(l) < 1 || undefined} onChange={(e) => mudar(l.chave, { quantidade: e.target.value })} />
                  </label>
                  <label className="campo">
                    <span>Duração (min)</span>
                    <input className="entrada" inputMode="numeric" value={l.duracao} aria-invalid={Number.isNaN(d) || undefined} onChange={(e) => mudar(l.chave, { duracao: e.target.value })} />
                    {d !== null && !Number.isNaN(d) && <small>{duracaoTexto(d)}</small>}
                  </label>
                  <label className="campo">
                    <span>Preço unit.</span>
                    <input className="entrada" inputMode="decimal" value={l.preco} onChange={(e) => mudar(l.chave, { preco: e.target.value })} onBlur={() => mudar(l.chave, { preco: reais(lerReais(l.preco)) })} />
                  </label>
                  <label className="campo">
                    <span>Tipo</span>
                    <select className="entrada" value={l.tipo} onChange={(e) => mudar(l.chave, { tipo: e.target.value === "adicional" ? "adicional" : "base" })}>
                      <option value="base">Base</option>
                      <option value="adicional">Adicional</option>
                    </select>
                  </label>
                  <button type="button" className="pn-icone-btn cat-item__tirar" aria-label={`Tirar serviço ${n + 1}`} onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              );
            })}
            <div className="cat-editor__base">
              <button type="button" className="botao botao--sm" onClick={adicionar}>Adicionar serviço</button>
              <span>Total do pacote <b className="pn-num">{reais(total)}</b></span>
            </div>
          </fieldset>

          {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
          <div className="pn-acoes cat-rodape">
            <button type="button" className="botao" onClick={(e) => fecharJanela(e.currentTarget)}>Cancelar</button>
            <button className="botao botao--magenta" disabled={indo}>{indo ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
    </Janela>
  );
}
