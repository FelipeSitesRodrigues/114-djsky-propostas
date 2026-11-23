"use client";
import { DataVidro } from "../DataVidro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Bloco, DadosProposta, Item, Status as TStatus, TipoEvento } from "@/lib/proposta/tipos";
import { TIPOS_EVENTO } from "@/lib/proposta/tipos";
import { calcular, reais, valorItem } from "@/lib/proposta/calculo";
import { alertasCronograma, minutos } from "@/lib/proposta/cronograma";
import { dataBR, diaDeSemana, idCurto, whatsappInternacional, type Apresentacoes, type RegraDesconto } from "@/lib/proposta/padrao";
import { FOTOS } from "@/lib/midia";
import { arquivarProposta, duplicarProposta, mudarStatus, publicarProposta, registrarEnvioWhatsapp, salvarProposta, verificarAgenda } from "@/app/painel/acoes/propostas";
import { Horas, Lixeira, Reais } from "./Campos";
import { Status, rotuloStatus } from "../Status";
import { pendenciasPublicar } from "@/lib/proposta/sanear";

type Servico = { id: string; nome: string; categoria: string; descricao: string; duracao_min: number | null; duracao_max_min: number | null; preco: number };
type Pacote = { id: string; nome: string; itens: { servicoId: string; quantidade: number; duracaoMin: number | null; precoUnit: number; tipo: "base" | "adicional" }[] };
type Parceiro = { id: string; nome: string; desconto_padrao: number };
type Conflito = { id: string; numero: number; status: string; cliente_nome: string; evento_nome: string; evento_cidade: string };
export type Hist = { id: number; tipo: string; detalhe: Record<string, unknown>; criado_em: string; quem: string };

type Props = {
  id: string;
  numero: number;
  codigo: string;
  status: TStatus;
  arquivada: boolean;
  versaoAtual: number;
  versaoPublicada: number | null;
  versaoAceita: number | null;
  aceiteId: string | null;
  dadosIniciais: DadosProposta;
  parceiroInicial: string | null;
  servicos: Servico[];
  pacotes: Pacote[];
  parceiros: Parceiro[];
  regras: RegraDesconto[];
  apresentacoes: Apresentacoes;
  papel: "admin" | "comercial";
  link: string;
  conflitosIniciais: Conflito[];
  historico: Hist[];
  versoes: { versao: number; total: number; criado_em: string }[];
  acessos: { total: number; ultimo: string | null };
};

const TEXTO_HIST: Record<string, string> = {
  criada: "Proposta criada",
  nova_versao: "Nova versão",
  publicada: "Enviada ao cliente (link atualizado)",
  whatsapp_aberto: "WhatsApp aberto para envio",
  visualizada: "Cliente abriu o link pela 1ª vez",
  pedido_alteracao: "Cliente pediu alteração pelo WhatsApp",
  aceite: "Cliente aceitou e enviou os dados",
  status: "Status alterado",
  valor_manual: "Valor final manual alterado",
  arquivada: "Arquivada",
  desarquivada: "Desarquivada",
  duplicada: "Duplicada",
  viu_dados_contrato: "Dados do contrato abertos",
  copiou_dados_contrato: "Dados do contrato copiados",
  corrigiu_dados_contrato: "Dados do contrato corrigidos",
  apagou_dados_pessoais: "Dados pessoais apagados (LGPD)",
};

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Maceio", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Editor(p: Props) {
  const router = useRouter();
  const [d, setD] = useState<DadosProposta>(p.dadosIniciais);
  const [parceiroId, setParceiroId] = useState(p.parceiroInicial ?? "");
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [conflitos, setConflitos] = useState<Conflito[]>(p.conflitosIniciais);
  const [envio, setEnvio] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const envioRef = useRef<HTMLDialogElement>(null);

  const up = useCallback((fn: (x: DadosProposta) => void) => {
    setD((atual) => {
      const novo = structuredClone(atual);
      fn(novo);
      return novo;
    });
    setSujo(true);
  }, []);

  const conta = useMemo(() => calcular(d.itens, d.financeiro), [d.itens, d.financeiro]);
  const alertas = useMemo(() => alertasCronograma(d.cronograma, d.itens, d.evento), [d.cronograma, d.itens, d.evento]);
  const aceita = !!p.versaoAceita;
  const temRascunhoNovo = p.versaoPublicada !== null && p.versaoAtual > p.versaoPublicada;
  const ehAdmin = p.papel === "admin";

  // aviso ao sair com alteração não salva
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (sujo) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  const salvar = useCallback(async () => {
    setSalvando(true);
    setMsg(null);
    const r = await salvarProposta(p.id, d, parceiroId || null);
    setSalvando(false);
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: r.erro });
      return false;
    }
    setSujo(false);
    setMsg({ tipo: "ok", texto: r.novaVersao ? (aceita ? `Salvo como versão ${r.versao}, interna. O cliente continua vendo a versão aceita.` : `Salvo como versão ${r.versao}. O cliente ainda vê a versão enviada até você enviar de novo.`) : "Salvo." });
    router.refresh();
    return true;
  }, [p.id, d, parceiroId, router, aceita]);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!salvando) salvar();
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, [salvar, salvando]);

  const publicar = async () => {
    if (sujo && !(await salvar())) return;
    setSalvando(true);
    const r = await publicarProposta(p.id);
    setSalvando(false);
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: r.erro });
      return;
    }
    const primeiro = d.cliente.nome.trim().split(/\s+/)[0] ?? "";
    setMensagem(`Olá${primeiro ? `, ${primeiro}` : ""}! Aqui é da equipe SKY. Segue a proposta para ${d.evento.nome || "o seu evento"}${d.evento.data ? ` (${dataBR(d.evento.data)})` : ""}:\n\n${p.link}\n\nPor lá você vê serviços, cronograma e valores, e pode aceitar direto na página. Qualquer dúvida, é só chamar.`);
    setEnvio(true);
    setTimeout(() => envioRef.current?.showModal(), 0);
    router.refresh();
  };

  const mudarData = async (data: string) => {
    up((x) => {
      x.evento.data = data;
    });
    setConflitos(data ? await verificarAgenda(data, p.id) : []);
  };

  const mudarTipo = (tipo: TipoEvento) => {
    up((x) => {
      const antigo = p.apresentacoes[x.evento.tipo];
      const novo = p.apresentacoes[tipo];
      // só troca o texto se ele ainda for o do modelo (não apaga o que alguém escreveu)
      if (novo && (!x.apresentacao.titulo || x.apresentacao.titulo === antigo?.titulo)) x.apresentacao = { ...novo };
      x.evento.tipo = tipo;
    });
  };

  const addServico = (s: Servico) =>
    up((x) => {
      x.itens.push({ id: idCurto(), servicoId: s.id, nome: s.nome, descricao: s.descricao, quantidade: 1, duracaoMin: s.duracao_min, duracaoMaxMin: s.duracao_max_min, precoUnit: s.preco, tipo: x.itens.some((i) => i.tipo === "base") ? "adicional" : "base" });
    });
  const addLivre = () => up((x) => void x.itens.push({ id: idCurto(), servicoId: null, nome: "", descricao: "", quantidade: 1, duracaoMin: null, duracaoMaxMin: null, precoUnit: 0, tipo: "adicional" }));
  const aplicarPacote = (pc: Pacote) =>
    up((x) => {
      for (const it of pc.itens) {
        const s = p.servicos.find((v) => v.id === it.servicoId);
        if (!s) continue;
        x.itens.push({ id: idCurto(), servicoId: s.id, nome: s.nome, descricao: s.descricao, quantidade: it.quantidade, duracaoMin: it.duracaoMin ?? s.duracao_min, duracaoMaxMin: s.duracao_max_min, precoUnit: it.precoUnit, tipo: it.tipo });
      }
    });
  const mudaItem = (i: number, fn: (it: Item) => void) => up((x) => fn(x.itens[i]));
  const tiraItem = (i: number) =>
    up((x) => {
      const [fora] = x.itens.splice(i, 1);
      x.cronograma.forEach((b) => {
        if (b.itemId === fora.id) b.itemId = null;
      });
    });

  const gerarCronograma = () =>
    up((x) => {
      let m = minutos(x.evento.inicio) ?? 19 * 60;
      const blocos: Bloco[] = [];
      for (const it of x.itens.filter((i) => i.duracaoMin)) {
        const ini = m % 1440;
        m += it.duracaoMin as number;
        const fim = m % 1440;
        const f = (v: number) => `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
        blocos.push({ id: idCurto(), itemId: it.id, titulo: it.nome, inicio: f(ini), fim: f(fim), descricao: "" });
      }
      x.cronograma = blocos;
    });
  const addBloco = () => up((x) => void x.cronograma.push({ id: idCurto(), itemId: null, titulo: "", inicio: "", fim: "", descricao: "" }));
  const mudaBloco = (i: number, fn: (b: Bloco) => void) => up((x) => fn(x.cronograma[i]));

  const parceiro = p.parceiros.find((x) => x.id === parceiroId);
  const sugestaoSemana = diaDeSemana(d.evento.data) ? p.regras.find((r) => /semana/i.test(r.nome)) : undefined;
  const aplicarRegra = (nome: string, pct: number) =>
    up((x) => {
      x.financeiro.descontoTipo = "percentual";
      x.financeiro.descontoValor = pct;
      x.financeiro.descontoMotivo = nome;
      x.financeiro.valorManual = null;
    });

  const acao = async (fn: () => Promise<{ ok: boolean; erro?: string } | void>) => {
    if (sujo && !confirm("Há alterações não salvas. Continuar mesmo assim?")) return;
    const r = await fn();
    if (r && !r.ok) setMsg({ tipo: "erro", texto: r.erro ?? "Não deu certo." });
    router.refresh();
  };

  const wa = whatsappInternacional(d.cliente.whatsapp);

  // Passos do editor: cada um diz se já está pronto, pra quem monta a proposta saber o que falta
  const pendencias = pendenciasPublicar(d);
  const semPreco = d.itens.filter((i) => !i.precoUnit).length;
  const passos = [
    { id: "ed-cliente", n: "01", nome: "Cliente", ok: !!d.cliente.nome },
    { id: "ed-evento", n: "02", nome: "Evento", ok: !!d.evento.data },
    { id: "ed-servicos", n: "03", nome: "Serviços", ok: d.itens.length > 0 && !semPreco },
    { id: "ed-cronograma", n: "04", nome: "Cronograma", ok: d.cronograma.length > 0 && !alertas.length, opcional: true },
    { id: "ed-financeiro", n: "05", nome: "Valores", ok: conta.total > 0 },
    { id: "ed-condicoes", n: "06", nome: "Condições", ok: !!d.condicoes.validade },
    { id: "ed-capa", n: "07", nome: "Capa", ok: !!d.apresentacao.titulo },
  ];
  const irPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="pn-topo">
        <div>
          <span className="rotulo">Proposta nº {String(p.numero).padStart(4, "0")} · versão {p.versaoAtual}</span>
          <h1 style={{ marginTop: 6 }}>{d.cliente.nome || "Nova proposta"}</h1>
          <p style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Status s={p.status} />
            {p.arquivada && <span className="pn-status">Arquivada</span>}
            {temRascunhoNovo && !aceita && <span className="pn-salvo pn-salvo--pendente">Versão {p.versaoAtual} ainda não enviada (o cliente vê a {p.versaoPublicada})</span>}
            <span className={`pn-salvo ${sujo ? "pn-salvo--pendente" : ""}`}>{sujo ? "Alterações não salvas" : "Tudo salvo"}</span>
          </p>
        </div>
        <div className="pn-acoes">
          <a className="botao" href={`/painel/previa/${p.id}`} target="_blank" rel="noopener">Pré-visualizar</a>
          <button type="button" className="botao" onClick={salvar} disabled={salvando || p.arquivada}>{salvando ? <span className="girando" /> : "Salvar"}</button>
          {!aceita && (
            <button type="button" className="botao botao--magenta" onClick={publicar} disabled={salvando || p.arquivada}>
              {p.versaoPublicada ? (temRascunhoNovo || sujo ? "Enviar versão nova" : "Reenviar") : "Enviar ao cliente"}
            </button>
          )}
        </div>
      </div>

      {msg && <div className={`aviso aviso--${msg.tipo}`} role={msg.tipo === "erro" ? "alert" : "status"} style={{ marginBottom: 14 }}>{msg.texto}</div>}
      {aceita && (
        <div className="aviso aviso--ok" style={{ marginBottom: 14 }}>
          Aceita pelo cliente na versão {p.versaoAceita}. O link continua mostrando a versão aceita; mudanças aqui viram versões internas.{" "}
          {p.aceiteId && <Link href={`/painel/aceitas/${p.aceiteId}`} style={{ fontWeight: 700, textDecoration: "underline" }}>Ver dados para o contrato</Link>}
        </div>
      )}

      <nav className="pn-passos" aria-label="Partes da proposta">
        {passos.map((x) => (
          <button key={x.id} type="button" onClick={() => irPara(x.id)} data-ok={x.ok || undefined}>
            <span className="pn-passos__n">{x.ok ? "✓" : x.n}</span>
            {x.nome}
          </button>
        ))}
      </nav>

      <div className="pn-editor">
        <div>
          {/* ---------------------------------------- cliente */}
          <section className="pn-secao-ed" id="ed-cliente">
            <header><div><h2><span>01</span> Cliente</h2><p className="pn-dica">Quem recebe a proposta. O nome aparece na capa.</p></div></header>
            <div className="pn-grade pn-grade--2">
              <label className="campo"><span>Nome</span><input className="entrada" value={d.cliente.nome} onChange={(e) => up((x) => void (x.cliente.nome = e.target.value))} /></label>
              <label className="campo"><span>WhatsApp</span><input className="entrada" inputMode="tel" value={d.cliente.whatsapp} onChange={(e) => up((x) => void (x.cliente.whatsapp = e.target.value))} placeholder="(79) 99999-9999" /></label>
              <label className="campo"><span>E-mail</span><input className="entrada" type="email" value={d.cliente.email} onChange={(e) => up((x) => void (x.cliente.email = e.target.value))} /></label>
              <label className="campo"><span>Responsável <small>(quem fala pelo evento)</small></span><input className="entrada" value={d.cliente.responsavel} onChange={(e) => up((x) => void (x.cliente.responsavel = e.target.value))} /></label>
              <label className="campo">
                <span>Parceiro / cerimonialista</span>
                <select className="entrada" value={parceiroId} onChange={(e) => { setParceiroId(e.target.value); setSujo(true); }}>
                  <option value="">Nenhum</option>
                  {p.parceiros.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </label>
            </div>
          </section>

          {/* ---------------------------------------- evento */}
          <section className="pn-secao-ed" id="ed-evento">
            <header><div><h2><span>02</span> Evento</h2><p className="pn-dica">Quando e onde. A data só aceita de hoje em diante.</p></div></header>
            <div className="pn-grade pn-grade--3">
              <label className="campo">
                <span>Tipo</span>
                <select className="entrada" value={d.evento.tipo} onChange={(e) => mudarTipo(e.target.value as TipoEvento)}>
                  {TIPOS_EVENTO.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="campo pn-col-2"><span>Nome do evento</span><input className="entrada" value={d.evento.nome} onChange={(e) => up((x) => void (x.evento.nome = e.target.value))} placeholder="Ex.: 15 anos da Maria Eduarda" /></label>
              <div className="campo"><span>Data</span><DataVidro rotulo="Data do evento" min="hoje" value={d.evento.data} onChange={mudarData} /></div>
              <label className="campo"><span>Início</span><input className="entrada" type="time" value={d.evento.inicio} onChange={(e) => up((x) => void (x.evento.inicio = e.target.value))} /></label>
              <label className="campo"><span>Término</span><input className="entrada" type="time" value={d.evento.termino} onChange={(e) => up((x) => void (x.evento.termino = e.target.value))} /></label>
              <label className="campo"><span>Local</span><input className="entrada" value={d.evento.local} onChange={(e) => up((x) => void (x.evento.local = e.target.value))} placeholder="Nome do espaço" /></label>
              <label className="campo"><span>Cidade</span><input className="entrada" value={d.evento.cidade} onChange={(e) => up((x) => void (x.evento.cidade = e.target.value))} /></label>
              <label className="campo"><span>Endereço</span><input className="entrada" value={d.evento.endereco} onChange={(e) => up((x) => void (x.evento.endereco = e.target.value))} /></label>
            </div>
            {conflitos.length > 0 && (
              <div className="aviso aviso--alerta">
                <b>Atenção à agenda:</b> já existe proposta nesse dia:{" "}
                {conflitos.map((c, i) => (
                  <span key={c.id}>{i ? "; " : ""}<Link href={`/painel/propostas/${c.id}`} style={{ textDecoration: "underline" }}>nº {String(c.numero).padStart(4, "0")} {c.cliente_nome || c.evento_nome}{c.evento_cidade ? ` (${c.evento_cidade})` : ""}</Link>, {rotuloStatus(c.status).toLowerCase()}</span>
                ))}
              </div>
            )}
          </section>

          {/* ---------------------------------------- serviços */}
          <section className="pn-secao-ed" id="ed-servicos">
            <header>
              <div><h2><span>03</span> Serviços</h2><p className="pn-dica">Só aparece pro cliente o que estiver nesta lista.</p></div>
              <button type="button" className="botao botao--sm" onClick={addLivre}>+ Item livre</button>
            </header>
            {p.pacotes.length > 0 && (
              <div className="campo">
                <span>Aplicar pacote</span>
                <div className="pn-chips">{p.pacotes.map((pc) => <button key={pc.id} type="button" className="pn-chip" onClick={() => aplicarPacote(pc)}>{pc.nome}</button>)}</div>
              </div>
            )}
            <div className="campo">
              <span>Adicionar do catálogo</span>
              <div className="pn-chips">
                {p.servicos.map((s) => <button key={s.id} type="button" className="pn-chip" onClick={() => addServico(s)}>+ {s.nome}</button>)}
                {!p.servicos.length && <small>Nenhum serviço no catálogo. <Link href="/painel/catalogo">Cadastrar</Link></small>}
              </div>
            </div>
            {d.itens.length > 0 && (
              <>
                <div className="pn-cabeca-item"><span>Serviço</span><span>Qtd.</span><span>Duração (h)</span><span>Preço un.</span><span>Total</span><span /></div>
                {d.itens.map((it, i) => (
                  <div className="pn-item" key={it.id}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <input className="entrada" aria-label="Nome do serviço" value={it.nome} onChange={(e) => mudaItem(i, (x) => void (x.nome = e.target.value))} />
                      <div className="pn-segmento" role="group" aria-label="Base ou adicional">
                        <button type="button" aria-pressed={it.tipo === "base"} onClick={() => mudaItem(i, (x) => void (x.tipo = "base"))}>Base</button>
                        <button type="button" aria-pressed={it.tipo === "adicional"} onClick={() => mudaItem(i, (x) => void (x.tipo = "adicional"))}>Adicional</button>
                      </div>
                    </div>
                    <input className="entrada" aria-label="Quantidade" type="number" min={1} value={it.quantidade} onChange={(e) => mudaItem(i, (x) => void (x.quantidade = Math.max(1, Number(e.target.value) || 1)))} />
                    <Horas aria-label="Duração em horas" minutos={it.duracaoMin} onChange={(m) => mudaItem(i, (x) => void (x.duracaoMin = m))} />
                    <Reais aria-label="Preço unitário" valor={it.precoUnit} onChange={(c) => mudaItem(i, (x) => void (x.precoUnit = c))} />
                    <span className="pn-item__total">{reais(valorItem(it))}</span>
                    <Lixeira rotulo="Tirar serviço" onClick={() => tiraItem(i)} />
                    <textarea className="entrada pn-item__desc" aria-label="Descrição" rows={1} placeholder="Descrição que o cliente vê" value={it.descricao} onChange={(e) => mudaItem(i, (x) => void (x.descricao = e.target.value))} />
                  </div>
                ))}
              </>
            )}
            {!d.itens.length && <p className="pn-vazio" style={{ padding: 12 }}>Nenhum serviço ainda. Só aparece na proposta o que estiver aqui.</p>}
          </section>

          {/* ---------------------------------------- cronograma */}
          <section className="pn-secao-ed" id="ed-cronograma">
            <header>
              <div><h2><span>04</span> Cronograma</h2><p className="pn-dica">Opcional. Vira o line-up da noite na proposta.</p></div>
              <div className="pn-acoes">
                <button type="button" className="botao botao--sm" onClick={() => (!d.cronograma.length || confirm("Substituir o cronograma atual pelos serviços em sequência?")) && gerarCronograma()} disabled={!d.itens.some((i) => i.duracaoMin)}>Montar pelos serviços</button>
                <button type="button" className="botao botao--sm" onClick={addBloco}>+ Bloco</button>
              </div>
            </header>
            {d.cronograma.length > 0 && <div className="pn-cabeca-bloco"><span>Momento</span><span>Início</span><span>Fim</span><span>Serviço</span><span>Descrição</span><span /></div>}
            {d.cronograma.map((b, i) => (
              <div className="pn-bloco" key={b.id}>
                <input className="entrada" aria-label="Título do bloco" placeholder="Ex.: DJ de abertura" value={b.titulo} onChange={(e) => mudaBloco(i, (x) => void (x.titulo = e.target.value))} />
                <input className="entrada" aria-label="Início" type="time" value={b.inicio} onChange={(e) => mudaBloco(i, (x) => void (x.inicio = e.target.value))} />
                <input className="entrada" aria-label="Fim" type="time" value={b.fim} onChange={(e) => mudaBloco(i, (x) => void (x.fim = e.target.value))} />
                <select className="entrada" aria-label="Serviço do bloco" value={b.itemId ?? ""} onChange={(e) => mudaBloco(i, (x) => void (x.itemId = e.target.value || null))}>
                  <option value="">Sem serviço</option>
                  {d.itens.map((it) => <option key={it.id} value={it.id}>{it.nome || "Serviço"}</option>)}
                </select>
                <input className="entrada" aria-label="Descrição do bloco" placeholder="Ex.: recepção e protocolos" value={b.descricao} onChange={(e) => mudaBloco(i, (x) => void (x.descricao = e.target.value))} />
                <Lixeira rotulo="Tirar bloco" onClick={() => up((x) => void x.cronograma.splice(i, 1))} />
              </div>
            ))}
            {!d.cronograma.length && <p className="pn-vazio" style={{ padding: 12 }}>Sem cronograma. Se ficar vazio, a seção não aparece pro cliente.</p>}
            {alertas.length > 0 && <div className="pn-alertas">{alertas.map((a, i) => <div key={i} className="aviso aviso--alerta">{a.texto}</div>)}</div>}
          </section>

          {/* ---------------------------------------- financeiro */}
          <section className="pn-secao-ed" id="ed-financeiro">
            <header><div><h2><span>05</span> Financeiro</h2><p className="pn-dica">Desconto, sinal e vencimentos. O total atualiza ao lado.</p></div></header>
            <div className="campo">
              <span>Desconto</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="pn-segmento" role="group" aria-label="Tipo de desconto">
                  {(["nenhum", "percentual", "valor"] as const).map((t) => (
                    <button key={t} type="button" aria-pressed={d.financeiro.descontoTipo === t} onClick={() => up((x) => { x.financeiro.descontoTipo = t; x.financeiro.descontoValor = 0; })}>
                      {t === "nenhum" ? "Sem desconto" : t === "percentual" ? "%" : "R$"}
                    </button>
                  ))}
                </div>
                {d.financeiro.descontoTipo !== "nenhum" && (
                  <>
                    <div style={{ width: 140 }}>
                      {d.financeiro.descontoTipo === "percentual" ? (
                        <input className="entrada" aria-label="Percentual de desconto" type="number" min={0} max={100} step="0.5" value={d.financeiro.descontoValor} onChange={(e) => up((x) => void (x.financeiro.descontoValor = Number(e.target.value)))} />
                      ) : (
                        <Reais aria-label="Valor do desconto" valor={d.financeiro.descontoValor} onChange={(c) => up((x) => void (x.financeiro.descontoValor = c))} />
                      )}
                    </div>
                    <div className="pn-segmento" role="group" aria-label="Sobre o quê">
                      <button type="button" aria-pressed={d.financeiro.descontoSobre === "total"} onClick={() => up((x) => void (x.financeiro.descontoSobre = "total"))}>Sobre o total</button>
                      <button type="button" aria-pressed={d.financeiro.descontoSobre === "base"} onClick={() => up((x) => void (x.financeiro.descontoSobre = "base"))}>Só sobre a base</button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {(p.regras.length > 0 || parceiro) && (
              <div className="pn-chips">
                {p.regras.map((r) => <button key={r.nome} type="button" className="pn-chip" onClick={() => aplicarRegra(r.nome, r.percentual)}>{r.nome} · {r.percentual}%</button>)}
                {parceiro && parceiro.desconto_padrao > 0 && <button type="button" className="pn-chip" onClick={() => aplicarRegra(`Parceria ${parceiro.nome}`, Number(parceiro.desconto_padrao))}>{parceiro.nome} · {parceiro.desconto_padrao}%</button>}
              </div>
            )}
            {sugestaoSemana && d.financeiro.descontoMotivo !== sugestaoSemana.nome && <div className="aviso">O evento cai num dia de semana: a regra &quot;{sugestaoSemana.nome}&quot; ({sugestaoSemana.percentual}%) pode valer.</div>}
            {d.financeiro.descontoTipo !== "nenhum" && (
              <label className="campo"><span>Motivo do desconto <small>(aparece pro cliente)</small></span><input className="entrada" value={d.financeiro.descontoMotivo} onChange={(e) => up((x) => void (x.financeiro.descontoMotivo = e.target.value))} placeholder="Ex.: parceria, cliente novo" /></label>
            )}
            <div className="pn-grade pn-grade--3">
              <label className="campo"><span>Sinal (%)</span><input className="entrada" type="number" min={0} max={100} value={d.financeiro.sinalPercentual} onChange={(e) => up((x) => void (x.financeiro.sinalPercentual = Number(e.target.value)))} /></label>
              <div className="campo"><span>Vencimento do sinal</span><DataVidro rotulo="Vencimento do sinal" min="hoje" value={d.financeiro.sinalVencimento} onChange={(v) => up((x) => void (x.financeiro.sinalVencimento = v))} /></div>
              <div className="campo"><span>Vencimento do saldo</span><DataVidro rotulo="Vencimento do saldo" min="hoje" value={d.financeiro.saldoVencimento} onChange={(v) => up((x) => void (x.financeiro.saldoVencimento = v))} /></div>
              <label className="campo pn-col-todo"><span>Forma de pagamento</span><input className="entrada" value={d.financeiro.formaPagamento} onChange={(e) => up((x) => void (x.financeiro.formaPagamento = e.target.value))} /></label>
            </div>
            <details open={d.financeiro.valorManual !== null}>
              <summary style={{ cursor: "pointer", color: "var(--texto)", fontSize: 13.5, fontWeight: 600 }}>Valor final manual {ehAdmin ? "" : "(só administrador)"}</summary>
              <div className="pn-grade pn-grade--2" style={{ marginTop: 12 }}>
                <label className="campo">
                  <span>Valor final</span>
                  {d.financeiro.valorManual === null ? (
                    <button type="button" className="botao botao--sm" disabled={!ehAdmin} onClick={() => up((x) => void (x.financeiro.valorManual = conta.calculado))}>Definir à mão</button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Reais aria-label="Valor final manual" valor={d.financeiro.valorManual} disabled={!ehAdmin} onChange={(c) => up((x) => void (x.financeiro.valorManual = c))} />
                      <button type="button" className="botao botao--sm" disabled={!ehAdmin} onClick={() => up((x) => { x.financeiro.valorManual = null; x.financeiro.justificativaManual = ""; })}>Voltar ao calculado</button>
                    </div>
                  )}
                </label>
                {d.financeiro.valorManual !== null && (
                  <label className="campo"><span>Justificativa <small>(fica no histórico, o cliente não vê)</small></span><input className="entrada" disabled={!ehAdmin} value={d.financeiro.justificativaManual} onChange={(e) => up((x) => void (x.financeiro.justificativaManual = e.target.value))} /></label>
                )}
              </div>
            </details>
          </section>

          {/* ---------------------------------------- condições */}
          <section className="pn-secao-ed" id="ed-condicoes">
            <header><div><h2><span>06</span> Condições</h2><p className="pn-dica">Validade e regras de pagamento que o cliente lê.</p></div></header>
            <div className="pn-grade pn-grade--3">
              <div className="campo"><span>Válida até</span><DataVidro rotulo="Proposta válida até" min="hoje" value={d.condicoes.validade} onChange={(v) => up((x) => void (x.condicoes.validade = v))} /></div>
              <label className="campo pn-col-2"><span>Condições de pagamento</span><textarea className="entrada" rows={2} value={d.condicoes.condicoesPagamento} onChange={(e) => up((x) => void (x.condicoes.condicoesPagamento = e.target.value))} /></label>
              <label className="campo pn-col-todo"><span>Observações</span><textarea className="entrada" rows={3} value={d.condicoes.observacoes} onChange={(e) => up((x) => void (x.condicoes.observacoes = e.target.value))} placeholder="Ex.: alimentação da equipe, camarim, rider técnico" /></label>
            </div>
          </section>

          {/* ---------------------------------------- apresentação */}
          <section className="pn-secao-ed" id="ed-capa">
            <header><div><h2><span>07</span> Apresentação e capa</h2><p className="pn-dica">Título da capa, texto de boas-vindas e a foto do topo.</p></div></header>
            <label className="campo"><span>Título da capa</span><input className="entrada" value={d.apresentacao.titulo} onChange={(e) => up((x) => void (x.apresentacao.titulo = e.target.value))} /></label>
            <label className="campo"><span>Texto de apresentação</span><textarea className="entrada" rows={4} value={d.apresentacao.texto} onChange={(e) => up((x) => void (x.apresentacao.texto = e.target.value))} /></label>
            <div className="campo">
              <span>Foto da capa</span>
              <div className="pn-capas">
                {FOTOS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={d.apresentacao.capa === f.id} title={f.rotulo} onClick={() => up((x) => void (x.apresentacao.capa = f.id))}>
                    <img src={f.arquivo} alt={f.rotulo} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ---------------------------------------- lateral */}
        <aside className="pn-editor__lado">
          {!aceita && (
            <div className={`pn-cartao pn-pronta ${pendencias.length ? "" : "pn-pronta--ok"}`}>
              <h2>{pendencias.length ? "Falta pra enviar" : "Pronta pra enviar"}</h2>
              {pendencias.length ? (
                <ul className="pn-pronta__lista">{pendencias.map((x) => <li key={x}>{x}</li>)}</ul>
              ) : (
                <p>Tudo que é obrigatório está preenchido.{p.versaoPublicada ? "" : " Clique em Enviar ao cliente."}</p>
              )}
              {semPreco > 0 && <p className="pn-pronta__aviso">{semPreco === 1 ? "1 serviço está" : `${semPreco} serviços estão`} sem preço.</p>}
            </div>
          )}
          <div className="pn-cartao">
            <h2>Valores</h2>
            <div className="pn-resumo-valor">
              <div><span>Base</span><b>{reais(conta.base)}</b></div>
              <div><span>Adicionais</span><b>{reais(conta.adicionais)}</b></div>
              {conta.desconto > 0 && <div><span>Desconto</span><b style={{ color: "var(--lima)" }}>− {reais(conta.desconto)}</b></div>}
              {conta.manual && <div><span>Calculado</span><b>{reais(conta.calculado)}</b></div>}
              <div className="pn-total-linha"><span>Total{conta.manual ? " (manual)" : ""}</span><b>{reais(conta.total)}</b></div>
              <div><span>Sinal ({d.financeiro.sinalPercentual}%)</span><b>{reais(conta.sinal)}</b></div>
              <div><span>Saldo</span><b>{reais(conta.saldo)}</b></div>
            </div>
          </div>

          <div className="pn-cartao">
            <h2>Link do cliente</h2>
            {p.versaoPublicada ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="pn-link">
                  <code>{p.link}</code>
                  <button type="button" className="botao botao--sm" onClick={() => navigator.clipboard.writeText(p.link)}>Copiar</button>
                </div>
                <small style={{ color: "var(--texto-2)" }}>
                  {p.acessos.total ? `Aberto ${p.acessos.total} ${p.acessos.total === 1 ? "vez" : "vezes"}, a última em ${quando(p.acessos.ultimo as string)}. Abrir o link não prova quem abriu.` : "O cliente ainda não abriu o link."}
                </small>
                {!aceita && <button type="button" className="botao botao--sm" onClick={publicar}>Mandar no WhatsApp</button>}
              </div>
            ) : (
              <small style={{ color: "var(--texto-2)" }}>O link nasce quando você toca em &quot;Enviar ao cliente&quot;. Até lá a proposta é rascunho.</small>
            )}
          </div>

          <div className="pn-cartao">
            <h2>Andamento</h2>
            <div className="pn-chips">
              {!aceita && p.versaoPublicada && <button type="button" className="pn-chip" onClick={() => acao(() => mudarStatus(p.id, "negociacao"))}>Em negociação</button>}
              {!aceita && p.versaoPublicada && <button type="button" className="pn-chip" onClick={() => confirm("Marcar como recusada? O cliente deixa de poder aceitar.") && acao(() => mudarStatus(p.id, "recusada"))}>Recusada</button>}
              {aceita && <button type="button" className="pn-chip" onClick={() => acao(() => mudarStatus(p.id, "contrato_enviado"))}>Contrato enviado</button>}
              {aceita && <button type="button" className="pn-chip" onClick={() => acao(() => mudarStatus(p.id, "contratada"))}>Contratada</button>}
              <button type="button" className="pn-chip" onClick={() => acao(() => duplicarProposta(p.id))}>Duplicar</button>
              <button type="button" className="pn-chip" onClick={() => acao(() => arquivarProposta(p.id, !p.arquivada))}>{p.arquivada ? "Desarquivar" : "Arquivar"}</button>
            </div>
          </div>

          <div className="pn-cartao">
            <h2>Versões</h2>
            <ul className="pn-lista-hist">
              {p.versoes.map((v) => (
                <li key={v.versao}>
                  <span>
                    <Link href={`/painel/previa/${p.id}?v=${v.versao}`} target="_blank" style={{ fontWeight: 600 }}>Versão {v.versao}</Link> · {reais(v.total)}
                    {v.versao === p.versaoPublicada ? " · enviada" : ""}
                    {v.versao === p.versaoAceita ? " · aceita" : ""}
                  </span>
                  <time>{quando(v.criado_em)}</time>
                </li>
              ))}
            </ul>
          </div>

          <div className="pn-cartao">
            <h2>Histórico</h2>
            <ul className="pn-lista-hist">
              {p.historico.map((h) => (
                <li key={h.id}>
                  <span>
                    {TEXTO_HIST[h.tipo] ?? h.tipo}
                    {h.tipo === "status" ? `: ${rotuloStatus(String(h.detalhe.para))}` : ""}
                    {h.tipo === "nova_versao" || h.tipo === "publicada" ? ` (v${h.detalhe.versao})` : ""}
                    {h.tipo === "valor_manual" ? `: ${h.detalhe.para === null ? "voltou ao calculado" : reais(Number(h.detalhe.para))}${h.detalhe.justificativa ? `, "${h.detalhe.justificativa}"` : ""}` : ""}
                  </span>
                  <time>{quando(h.criado_em)}{h.quem ? ` · ${h.quem}` : ""}</time>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {envio && (
        <dialog ref={envioRef} className="pn-janela" onClose={() => setEnvio(false)}>
          <div>
            <h2>Proposta enviada</h2>
            <p style={{ color: "var(--texto)", fontSize: 14 }}>O link já mostra a versão {p.versaoAtual}. Ajuste a mensagem se quiser e mande pelo WhatsApp.</p>
            <textarea className="entrada" rows={8} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
            <div className="pn-acoes">
              {wa ? (
                <a className="botao botao--magenta" href={`https://wa.me/${wa}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer" onClick={() => registrarEnvioWhatsapp(p.id)}>Abrir WhatsApp do cliente</a>
              ) : (
                <span className="pn-salvo pn-salvo--pendente">Sem WhatsApp do cliente: copie a mensagem.</span>
              )}
              <button type="button" className="botao" onClick={() => navigator.clipboard.writeText(mensagem)}>Copiar mensagem</button>
              <button type="button" className="botao botao--texto" onClick={() => envioRef.current?.close()}>Fechar</button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
