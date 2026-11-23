"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Servico } from "@/lib/dados";
import { reais, lerReais } from "@/lib/proposta/calculo";
import { duracaoTexto } from "@/lib/proposta/cronograma";
import { ativarServico, salvarServico } from "@/app/painel/acoes/catalogo";
import { CATEGORIAS, nomeCategoria } from "./categorias";
import { Janela, fecharJanela, lerMinutos } from "./Janela";

const dur = (m: number | null) => (m === null ? "-" : duracaoTexto(m));

export function Servicos({ servicos }: { servicos: Servico[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Servico | "novo" | null>(null);
  const [filtro, setFiltro] = useState<string>("todas");
  const [erro, setErro] = useState("");
  const [indo, comecar] = useTransition();

  const usadas = CATEGORIAS.filter(([c]) => servicos.some((s) => s.categoria === c));
  const lista = filtro === "todas" ? servicos : servicos.filter((s) => s.categoria === filtro);

  const alternar = (s: Servico) => {
    setErro("");
    comecar(async () => {
      const r = await ativarServico(s.id, !s.ativo);
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  };

  return (
    <section className="pn-cartao">
      <h2>
        Serviços
        <button type="button" className="botao botao--magenta botao--sm" onClick={() => setEditando("novo")}>Novo serviço</button>
      </h2>
      {usadas.length > 1 && (
        <div className="pn-chips cat-filtro" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="pn-chip" aria-pressed={filtro === "todas"} onClick={() => setFiltro("todas")}>Todas</button>
          {usadas.map(([c, rotulo]) => (
            <button key={c} type="button" className="pn-chip" aria-pressed={filtro === c} onClick={() => setFiltro(c)}>{rotulo}</button>
          ))}
        </div>
      )}
      {erro && <div className="aviso aviso--erro cat-aviso" role="alert">{erro}</div>}
      {lista.length === 0 ? (
        <p className="pn-vazio">{servicos.length ? "Nenhum serviço nessa categoria." : "Nenhum serviço ainda. Cadastre o primeiro em \"Novo serviço\"."}</p>
      ) : (
        <div className="pn-rolagem">
          <table className="pn-tabela">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Categoria</th>
                <th>Duração</th>
                <th>Máxima</th>
                <th>Preço</th>
                <th>Situação</th>
                <th><span className="cat-oculto">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className={s.ativo ? undefined : "cat-inativo"}>
                  <td className="cat-nome">
                    <b>{s.nome}</b>
                    {s.descricao && <span className="pn-sub">{s.descricao}</span>}
                  </td>
                  <td>{nomeCategoria(s.categoria)}</td>
                  <td className="pn-num">{dur(s.duracao_min)}</td>
                  <td className="pn-num">{dur(s.duracao_max_min)}</td>
                  <td className="pn-num">
                    {reais(s.preco)}
                    {s.unidade && s.unidade !== "un" && <span className="pn-sub">por {s.unidade}</span>}
                  </td>
                  <td><span className={`pn-status cat-ativo cat-ativo--${s.ativo ? "sim" : "nao"}`}>{s.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="cat-linha-acoes">
                      <button type="button" className="botao botao--sm" onClick={() => setEditando(s)}>Editar</button>
                      <button type="button" className="botao botao--texto" disabled={indo} onClick={() => alternar(s)}>{s.ativo ? "Desativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && (
        <JanelaServico
          key={editando === "novo" ? "novo" : editando.id}
          servico={editando === "novo" ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => router.refresh()}
        />
      )}
    </section>
  );
}

function JanelaServico({ servico, onFechar, onSalvo }: { servico: Servico | null; onFechar: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState(servico?.nome ?? "");
  const [categoria, setCategoria] = useState(servico?.categoria ?? "show");
  const [descricao, setDescricao] = useState(servico?.descricao ?? "");
  const [duracao, setDuracao] = useState(servico?.duracao_min != null ? String(servico.duracao_min) : "");
  const [duracaoMax, setDuracaoMax] = useState(servico?.duracao_max_min != null ? String(servico.duracao_max_min) : "");
  const [preco, setPreco] = useState(servico ? reais(servico.preco) : "");
  const [unidade, setUnidade] = useState(servico?.unidade ?? "un");
  const [ordem, setOrdem] = useState(String(servico?.ordem ?? 0));
  const [ativo, setAtivo] = useState(servico?.ativo ?? true);
  const [erro, setErro] = useState("");
  const [indo, comecar] = useTransition();

  const dMin = lerMinutos(duracao);
  const dMax = lerMinutos(duracaoMax);

  return (
    <Janela titulo={servico ? "Editar serviço" : "Novo serviço"} onFechar={onFechar}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setErro("");
            if (Number.isNaN(dMin) || Number.isNaN(dMax)) return setErro("Duração em minutos, só números.");
            const o = Number(ordem.trim() || "0");
            if (!Number.isInteger(o)) return setErro("A ordem tem que ser um número inteiro.");
            comecar(async () => {
              const r = await salvarServico({
                id: servico?.id,
                nome,
                categoria,
                descricao,
                duracaoMin: dMin,
                duracaoMaxMin: dMax,
                preco: lerReais(preco),
                unidade,
                ordem: o,
                ativo,
              });
              if (!r.ok) return setErro(r.erro);
              onSalvo();
              fecharJanela(form);
            });
          }}
        >
          <h2>{servico ? "Editar serviço" : "Novo serviço"}</h2>
          <div className="pn-grade pn-grade--2">
            <label className="campo pn-col-todo">
              <span>Nome</span>
              <input className="entrada" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className="campo">
              <span>Categoria</span>
              <select className="entrada" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Preço</span>
              <input className="entrada" inputMode="decimal" placeholder="R$ 0,00" value={preco} onChange={(e) => setPreco(e.target.value)} onBlur={() => setPreco(reais(lerReais(preco)))} />
            </label>
            <label className="campo pn-col-todo">
              <span>Descrição</span>
              <textarea className="entrada" rows={3} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </label>
            <label className="campo">
              <span>Duração padrão (min)</span>
              <input className="entrada" inputMode="numeric" placeholder="Sem duração" value={duracao} aria-invalid={Number.isNaN(dMin) || undefined} onChange={(e) => setDuracao(e.target.value)} />
              <small>{dMin === null ? "Deixe vazio se não tiver duração." : Number.isNaN(dMin) ? "Só números." : duracaoTexto(dMin)}</small>
            </label>
            <label className="campo">
              <span>Duração máxima (min)</span>
              <input className="entrada" inputMode="numeric" placeholder="Sem limite" value={duracaoMax} aria-invalid={Number.isNaN(dMax) || undefined} onChange={(e) => setDuracaoMax(e.target.value)} />
              <small>{dMax === null ? "Passou disso, o cronograma avisa." : Number.isNaN(dMax) ? "Só números." : duracaoTexto(dMax)}</small>
            </label>
            <label className="campo">
              <span>Unidade</span>
              <input className="entrada" maxLength={30} placeholder="un, hora, metro" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            </label>
            <label className="campo">
              <span>Ordem</span>
              <input className="entrada" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
              <small>Menor aparece primeiro.</small>
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
