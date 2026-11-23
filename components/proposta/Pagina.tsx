import type { CSSProperties, ReactNode } from "react";
import type { DadosProposta } from "@/lib/proposta/tipos";
import { TIPOS_EVENTO } from "@/lib/proposta/tipos";
import { calcular, reais, valorItem } from "@/lib/proposta/calculo";
import { duracaoBloco, duracaoTexto, hora, minutos, ordenarBlocos } from "@/lib/proposta/cronograma";
import { dataBR } from "@/lib/proposta/padrao";
import { foto } from "@/lib/midia";
import { BotaoAceite, JanelaAceite } from "./Aceite";
import { PedirAlteracao } from "./PedirAlteracao";

export type EstadoPagina = "aberta" | "aceita" | "vencida" | "encerrada" | "previa";

type Props = {
  dados: DadosProposta;
  numero: number;
  versao: number;
  codigo: string;
  estado: EstadoPagina;
  whatsapp: string;
  aceitaEm?: string | null;
};

const nomeTipo = (t: string) => TIPOS_EVENTO.find(([k]) => k === t)?.[1] ?? "Evento";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Fotos de show que ilustram os cartões de serviço, em rodízio
const FOTOS_SERVICO = ["galeria-rq13-560", "galeria-bracos-660", "galeria-rq30-660", "galeria-rq24-560", "galeria-telao-660", "galeria-rq10-560", "galeria-casino-660", "galeria-rq2-560"];
// Faixa de fotos que corre no meio da página
const FAIXA = ["galeria-rq14-560", "galeria-festival-660", "galeria-rq15-560", "galeria-casino-660", "galeria-rq21-560", "galeria-rq30-660", "galeria-rq23-560", "galeria-bracos-660", "galeria-rq7-660", "galeria-telao-660"];

const NUMEROS = [
  ["+1 mi", "reproduções nas plataformas"],
  ["8", "estados com show"],
  ["+9", "artistas com quem dividiu o palco"],
  ["DJ + produtor", "as versões saem do estúdio dele"],
] as const;

function Icone({ nome }: { nome: "agenda" | "relogio" | "pino" | "seta" | "carteira" | "ampulheta" | "nota" | "pessoa" }) {
  const p: Record<string, ReactNode> = {
    agenda: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
    relogio: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    pino: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
    seta: <path d="M12 5v14m0 0-5.5-5.5M12 19l5.5-5.5" />,
    carteira: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 14.5h2" /></>,
    ampulheta: <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />,
    nota: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
    pessoa: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  };
  return <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[nome]}</svg>;
}

// Última palavra do título em magenta, como o "Nordeste." do site
function Titulo({ texto }: { texto: string }) {
  const partes = texto.trim().split(/\s+/);
  if (partes.length < 2) return <>{texto}</>;
  const ultima = partes.pop();
  return <>{partes.join(" ")} <span className="m">{ultima}</span></>;
}

export function Pagina({ dados, numero, versao, codigo, estado, whatsapp, aceitaEm }: Props) {
  const { cliente, evento, itens, financeiro, condicoes, apresentacao } = dados;
  const conta = calcular(itens, financeiro);
  const capa = foto(apresentacao.capa);
  const blocos = ordenarBlocos(dados.cronograma, evento.inicio);
  const primeiroNome = cliente.nome.trim().split(/\s+/)[0] ?? "";
  const n = String(numero).padStart(4, "0");
  const tipo = nomeTipo(evento.tipo);
  const nomeEvento = evento.nome || tipo;
  const local = [evento.local, evento.cidade].filter(Boolean).join(", ");
  const msgAlteracao = `Olá, equipe SKY! Sobre a proposta nº ${n} (${nomeEvento}), gostaria de pedir uma alteração: `;
  const linkAlteracao = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msgAlteracao)}`;
  const podeAceitar = estado === "aberta" || estado === "previa";
  const resumo = { numero: n, evento: nomeEvento, data: dataBR(evento.data, true), local, total: reais(conta.total), sinal: reais(conta.sinal), saldo: reais(conta.saldo), sinalPercentual: financeiro.sinalPercentual };

  const [ano, mes, dia] = /^\d{4}-\d{2}-\d{2}$/.test(evento.data) ? evento.data.split("-").map(Number) : [0, 0, 0];
  const semana = ano ? SEMANA[new Date(Date.UTC(ano, mes - 1, dia, 12)).getUTCDay()] : "";
  const ini = minutos(evento.inicio);
  const fim = minutos(evento.termino);
  const duracaoFesta = ini !== null && fim !== null ? (fim - ini + 1440) % 1440 || 1440 : 0;
  const temDesconto = conta.total < conta.subtotal;
  const descontoTexto = conta.manual
    ? "Condição especial"
    : `${financeiro.descontoTipo === "percentual" ? `${String(financeiro.descontoValor).replace(".", ",")}% de desconto` : `${reais(conta.desconto)} de desconto`}${financeiro.descontoSobre === "base" ? " na base" : ""}`;

  return (
    <div className="pp">
      {/* ================================================ capa: a mesma cena do site */}
      <header className="pc">
        <div className="pc__cena" aria-hidden="true">
          <picture>
            <source media="(max-width: 760px)" srcSet="/img/hero-fundo-celular-941.webp" />
            <img className="pc__fundo" src="/img/hero-fundo-1672.webp" alt="" />
          </picture>
          <div className="pc__seda"><img src="/img/hero-seda-1672.webp" alt="" /></div>
          <div className="pc__luz pc__luz--a" />
          <div className="pc__luz pc__luz--b" />
          <div className="pc__halo" />
          <img className="pc__marca" src="/img/logo-branco-1200.webp" alt="" />
          <picture className="pc__sky">
            <source media="(max-width: 760px)" srcSet="/img/sky-hero-cel-900.webp" />
            <img src="/img/sky-hero-1300.webp" alt="" fetchPriority="high" />
          </picture>
          <div className="pc__veu" />
        </div>

        <div className="pc__topo">
          <img className="pc__logo" src="/img/logo-branco-600.webp" alt="SKY" width={120} height={69} />
          <span className="pc__num">Proposta nº {n}</span>
        </div>

        <p className="pc__lado pc__lado--esq">Proposta exclusiva<br />{cliente.nome ? `para ${cliente.nome}` : "para o seu evento"}</p>
        <span className="pc__lado pc__lado--dir">{tipo}</span>

        <div className="pc__texto">
          <p className="pc__rotulo">SKY · DJ e produtor musical</p>
          <h1 className="pc__titulo"><Titulo texto={apresentacao.titulo || "O seu evento"} /></h1>
          <ul className="pc__chips">
            {evento.data && <li><Icone nome="agenda" />{dataBR(evento.data)}</li>}
            {(evento.inicio || evento.termino) && <li><Icone nome="relogio" />{hora(evento.inicio)} às {hora(evento.termino)}</li>}
            {local && <li><Icone nome="pino" />{local}</li>}
          </ul>
          {estado === "aceita" && <p className="pp-selo pp-selo--ok">Proposta aceita{aceitaEm ? ` em ${new Date(aceitaEm).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" })}` : ""}</p>}
          {estado === "vencida" && <p className="pp-selo pp-selo--alerta">Proposta vencida em {dataBR(condicoes.validade)}</p>}
          {estado === "encerrada" && <p className="pp-selo">Proposta encerrada</p>}
        </div>

        {condicoes.validade && estado !== "aceita" && <p className="pc__canto pc__canto--esq">Válida até {dataBR(condicoes.validade)}</p>}
        <a className="pc__canto pc__canto--dir" href="#ola">Role pra ver <Icone nome="seta" /></a>
      </header>

      <main>
        {/* ================================================ apresentação */}
        <section className="pp-secao pp-ola" id="ola">
          <div className="pp-caixa pp-ola__grade">
            <figure className="pp-ola__foto">
              <img src={capa.arquivo} alt="Sky em show" loading="lazy" />
              <figcaption><span className="pp-ao-vivo" />SKY ao vivo</figcaption>
            </figure>
            <div className="pp-ola__texto">
              <span className="rotulo">Apresentação</span>
              <h2 className="pp-titulo">{primeiroNome ? <>Olá, <span className="m">{primeiroNome}</span>.</> : "Olá."}</h2>
              {(apresentacao.texto || "").split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              <ul className="pp-numeros">
                {NUMEROS.map(([num, txt]) => (
                  <li key={num}><strong>{num}</strong><span>{txt}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================ o evento, como um ingresso */}
        <section className="pp-secao" id="evento">
          <div className="pp-caixa">
            <span className="rotulo pp-centro">O evento</span>
            <h2 className="pp-titulo pp-centro">A sua <span className="m">data</span></h2>
            <article className="pp-ingresso">
              <div className="pp-ingresso__data">
                {ano ? (
                  <>
                    <span className="pp-ingresso__semana">{semana}</span>
                    <strong>{String(dia).padStart(2, "0")}</strong>
                    <span className="pp-ingresso__mes">{MESES[mes - 1]} {ano}</span>
                  </>
                ) : (
                  <strong className="pp-ingresso__adefinir">Data a definir</strong>
                )}
              </div>
              <div className="pp-ingresso__corpo">
                <span className="pp-ingresso__tipo">{tipo} · Proposta nº {n}</span>
                <h3>{nomeEvento}</h3>
                <dl>
                  {(evento.inicio || evento.termino) && <div><dt><Icone nome="relogio" />Horário</dt><dd>{hora(evento.inicio)} às {hora(evento.termino)}{duracaoFesta ? <small>{duracaoTexto(duracaoFesta)} de festa</small> : null}</dd></div>}
                  {evento.local && <div><dt><Icone nome="pino" />Local</dt><dd>{evento.local}{evento.endereco ? <small>{evento.endereco}</small> : null}</dd></div>}
                  {evento.cidade && <div><dt><Icone nome="pino" />Cidade</dt><dd>{evento.cidade}</dd></div>}
                  {cliente.responsavel && <div><dt><Icone nome="pessoa" />Responsável</dt><dd>{cliente.responsavel}</dd></div>}
                </dl>
              </div>
              <div className="pp-ingresso__canhoto" aria-hidden="true">
                <img src="/img/logo-branco-200.webp" alt="" width={70} height={40} />
                <span>{n}</span>
              </div>
            </article>
          </div>
        </section>

        {/* ================================================ serviços */}
        {itens.length > 0 && (
          <section className="pp-secao" id="servicos">
            <div className="pp-caixa">
              <div className="pp-cabeca">
                <div>
                  <span className="rotulo">O que está incluso</span>
                  <h2 className="pp-titulo">O que a sua <span className="m">noite</span> tem</h2>
                </div>
                <p>{itens.length === 1 ? "Um serviço" : `${itens.length} serviços`} montados para o seu evento.</p>
              </div>
              <ul className={`pp-servicos ${itens.length >= 3 ? "pp-servicos--tres" : ""}`}>
                {itens.map((i, k) => (
                  <li key={i.id} className="pp-servico">
                    <div className="pp-servico__foto">
                      <img src={`/img/faixa/${FOTOS_SERVICO[k % FOTOS_SERVICO.length]}.webp`} alt="" loading="lazy" />
                      <span className="pp-servico__n">{String(k + 1).padStart(2, "0")}</span>
                      {i.duracaoMin ? <span className="pp-servico__dur"><Icone nome="relogio" />{duracaoTexto(i.duracaoMin)}</span> : null}
                    </div>
                    <div className="pp-servico__texto">
                      <span className="pp-servico__tipo">{i.tipo === "base" ? "Incluso" : "Adicional"}</span>
                      <h3>{i.quantidade > 1 ? `${i.quantidade}× ` : ""}{i.nome}</h3>
                      {i.descricao && <p>{i.descricao}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ================================================ cronograma: line-up de festival */}
        {blocos.length > 0 && (
          <section className="pp-secao pp-lineup" id="cronograma">
            <div className="pp-caixa">
              <div className="pp-cabeca">
                <div>
                  <span className="rotulo">Cronograma</span>
                  <h2 className="pp-titulo">Line-up da <span className="m">noite</span></h2>
                </div>
                {duracaoFesta ? <p>{hora(evento.inicio)} às {hora(evento.termino)}, {duracaoTexto(duracaoFesta)} de festa.</p> : null}
              </div>
              <ol className="pp-lineup__trilho" style={{ "--n": blocos.length } as CSSProperties}>
                {blocos.map((b, k) => {
                  const d = duracaoBloco(b);
                  return (
                    <li key={b.id} className={`pp-lineup__bloco ${k === blocos.length - 1 ? "pp-lineup__bloco--auge" : ""}`}>
                      <span className="pp-lineup__no" />
                      <span className="pp-lineup__hora">{hora(b.inicio)}</span>
                      <span className="pp-lineup__ate">até {hora(b.fim)}{d ? ` · ${duracaoTexto(d)}` : ""}</span>
                      <h3>{b.titulo}</h3>
                      {b.descricao && <p>{b.descricao}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        {/* ================================================ faixa de fotos */}
        <section className="pp-faixa" aria-label="Fotos de shows do Sky">
          <div className="pp-faixa__trilho">
            {[...FAIXA, ...FAIXA].map((f, k) => (
              <img key={k} src={`/img/faixa/${f}.webp`} alt="" loading="lazy" aria-hidden={k >= FAIXA.length} />
            ))}
          </div>
        </section>

        {/* ================================================ memória: o porquê antes do preço */}
        <section className="pp-memoria" aria-labelledby="memoria-titulo">
          <div className="pp-memoria__cena" aria-hidden="true">
            <img src="/img/galeria-bracos-1260.webp" alt="" loading="lazy" />
          </div>
          <div className="pp-caixa pp-memoria__caixa">
            <span className="rotulo">O que fica</span>
            <h2 className="pp-memoria__titulo" id="memoria-titulo">Daqui a 20 anos, é <span className="m">disso</span> que vão lembrar.</h2>
            <p>Da decoração e do cardápio, pouca gente lembra. Da pista cheia, da música certa na hora certa e de todo mundo dançando junto, ninguém esquece.</p>
            <p className="pp-memoria__frase">O que a gente leva dessa vida são as memórias. A sua noite merece ser uma delas.</p>
          </div>
        </section>

        {/* ================================================ investimento */}
        <section className="pp-secao pp-invest" id="investimento">
          {/* manchas de luz rosa atrás do cartão: é o que o vidro desfoca e tinge */}
          <div className="pp-invest__luzes" aria-hidden="true"><span /><span /><span /></div>
          <div className="pp-caixa">
            <span className="rotulo pp-centro">Investimento</span>
            <h2 className="pp-titulo pp-centro">O seu <span className="m">investimento</span></h2>
            <div className="pp-preco">
              <div className="pp-preco__topo">
                {temDesconto && (
                  <>
                    <span className="pp-preco__de">de <s>{reais(conta.subtotal)}</s></span>
                    <span className="pp-preco__selo">{descontoTexto}{financeiro.descontoMotivo && !conta.manual ? ` · ${financeiro.descontoMotivo}` : ""}</span>
                  </>
                )}
                <strong className="pp-preco__valor">{temDesconto && <small>por</small>}{reais(conta.total)}</strong>
                {temDesconto && <span className="pp-preco__economia">Você economiza {reais(conta.subtotal - conta.total)}</span>}
              </div>
              <div className="pp-preco__partes">
                <div>
                  <span>Sinal de {String(financeiro.sinalPercentual).replace(".", ",")}%</span>
                  <b>{reais(conta.sinal)}</b>
                  <small>{financeiro.sinalVencimento ? `até ${dataBR(financeiro.sinalVencimento)}` : "para reservar a data"}</small>
                </div>
                <div>
                  <span>Saldo</span>
                  <b>{reais(conta.saldo)}</b>
                  <small>{financeiro.saldoVencimento ? `até ${dataBR(financeiro.saldoVencimento)}` : "antes do evento"}</small>
                </div>
              </div>
              {financeiro.formaPagamento && <p className="pp-preco__forma"><Icone nome="carteira" />{financeiro.formaPagamento}</p>}
              <details className="pp-preco__detalhe">
                <summary>Ver o detalhamento</summary>
                <div className="pp-conta">
                  {itens.map((i) => (
                    <div className="pp-conta__linha" key={i.id}><span>{i.quantidade > 1 ? `${i.quantidade}× ` : ""}{i.nome}{i.tipo === "adicional" ? <em> adicional</em> : null}</span><b>{reais(valorItem(i))}</b></div>
                  ))}
                  <div className="pp-conta__linha pp-conta__sub"><span>Subtotal</span><b>{reais(conta.subtotal)}</b></div>
                  {temDesconto && <div className="pp-conta__linha pp-conta__desc"><span>{descontoTexto}{financeiro.descontoMotivo && !conta.manual ? ` (${financeiro.descontoMotivo})` : ""}</span><b>− {reais(conta.subtotal - conta.total)}</b></div>}
                  <div className="pp-conta__linha pp-conta__total"><span>Total</span><b>{reais(conta.total)}</b></div>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ================================================ condições */}
        <section className="pp-secao" id="condicoes">
          <div className="pp-caixa">
            <span className="rotulo">Condições</span>
            <h2 className="pp-titulo">Pagamento e <span className="m">validade</span></h2>
            <div className="pp-condicoes">
              {condicoes.condicoesPagamento && (
                <div className="pp-cond"><span className="pp-cond__icone"><Icone nome="carteira" /></span><h3>Pagamento</h3><p>{condicoes.condicoesPagamento}</p></div>
              )}
              {condicoes.validade && (
                <div className="pp-cond"><span className="pp-cond__icone"><Icone nome="ampulheta" /></span><h3>Válida até {dataBR(condicoes.validade)}</h3><p>Depois dessa data, valores e disponibilidade da agenda precisam ser confirmados de novo.</p></div>
              )}
              {condicoes.observacoes && (
                <div className="pp-cond"><span className="pp-cond__icone"><Icone nome="nota" /></span><h3>Observações</h3>{condicoes.observacoes.split(/\n+/).map((l, i) => <p key={i}>{l}</p>)}</div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================ fechamento */}
        <section className="pp-fecha" id="aceite">
          <div className="pp-fecha__cena" aria-hidden="true">
            <img src="/img/sobre-1000.webp" alt="" loading="lazy" />
            <div className="pp-fecha__veu" />
          </div>
          <div className="pp-caixa pp-fecha__caixa">
            {estado === "aceita" ? (
              <>
                <span className="rotulo">Tudo certo</span>
                <h2 className="pp-fecha__titulo">Proposta aceita. <span className="m">Obrigado!</span></h2>
                <p>Recebemos os seus dados e a equipe SKY vai preparar o contrato. O aceite registra a sua escolha, mas não substitui a assinatura do contrato.</p>
                <a className="botao botao--grande" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">Falar com a equipe</a>
              </>
            ) : estado === "vencida" || estado === "encerrada" ? (
              <>
                <span className="rotulo">{estado === "vencida" ? "Proposta vencida" : "Proposta encerrada"}</span>
                <h2 className="pp-fecha__titulo">{estado === "vencida" ? <>Essa proposta <span className="m">venceu</span></> : "Proposta encerrada"}</h2>
                <p>Fale com a equipe SKY pra confirmar data e valores e receber uma proposta atualizada.</p>
                <PedirAlteracao codigo={codigo} href={linkAlteracao} previa={false} texto="Falar no WhatsApp" destaque />
              </>
            ) : (
              <>
                <span className="rotulo">Último passo</span>
                <h2 className="pp-fecha__titulo">Bora fazer essa <span className="m">noite?</span></h2>
                <p>Ao aceitar, você informa os dados para o contrato e a data fica reservada pra você. Quer mudar algo? Peça a alteração pelo WhatsApp.</p>
                <div className="pp-fecha__botoes">
                  <BotaoAceite rotulo="Aceito a proposta" />
                  <PedirAlteracao codigo={codigo} href={linkAlteracao} previa={estado === "previa"} texto="Pedir alteração" />
                </div>
                <p className="pp-fecha__total">Investimento de <b>{reais(conta.total)}</b>{condicoes.validade ? `, válido até ${dataBR(condicoes.validade)}` : ""}</p>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="pp-rodape">
        <div className="pp-caixa pp-rodape__caixa">
          <img src="/img/logo-branco-200.webp" alt="SKY" width={80} height={46} />
          <p>Proposta nº {n} · versão {versao}</p>
          <a href="https://www.instagram.com/sigasky/" target="_blank" rel="noopener noreferrer">@sigasky</a>
        </div>
      </footer>

      {podeAceitar && (
        <div className="pp-barra">
          <div>
            <small>Investimento</small>
            <b>{reais(conta.total)}</b>
          </div>
          <BotaoAceite rotulo="Aceito a proposta" compacto />
        </div>
      )}
      {(podeAceitar || estado === "aceita") && <JanelaAceite codigo={codigo} versao={versao} resumo={resumo} previa={estado === "previa"} />}
    </div>
  );
}
