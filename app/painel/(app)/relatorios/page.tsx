import type { Metadata } from "next";
import { DataVidro } from "@/components/painel/DataVidro";
import Link from "next/link";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dataBR, hojeISO, somarDias } from "@/lib/proposta/padrao";
import { TIPOS_EVENTO } from "@/lib/proposta/tipos";
import { reais } from "@/lib/proposta/calculo";
import "./relatorios.css";

export const metadata: Metadata = { title: "Relatórios" };

type Linha = { evento_tipo: string; status: string; total: number; desconto: number; versao_publicada: number | null; parceiro_id: string | null; criado_em: string };
type Soma = { criadas: number; enviadas: number; aceitas: number; valor: number; desconto: number };

const ACEITAS = new Set(["aceita", "contrato_enviado", "contratada"]);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const mesMaceio = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit" });
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const vazia = (): Soma => ({ criadas: 0, enviadas: 0, aceitas: 0, valor: 0, desconto: 0 });
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const pctTexto = (a: number, b: number) => (b ? `${pct(a, b).toLocaleString("pt-BR")}%` : "-");

function somar(s: Soma, l: Linha) {
  s.criadas++;
  if (l.versao_publicada !== null) {
    s.enviadas++;
    s.desconto += l.desconto ?? 0;
  }
  if (ACEITAS.has(l.status)) {
    s.aceitas++;
    s.valor += l.total ?? 0;
  }
}

// Maceió é UTC-3 o ano inteiro (sem horário de verão)
async function buscar(de: string, ate: string) {
  const db = supabaseAdmin();
  const linhas: Linha[] = [];
  const passo = 1000;
  for (let i = 0; ; i += passo) {
    const { data } = await db
      .from("propostas")
      .select("evento_tipo, status, total, desconto, versao_publicada, parceiro_id, criado_em")
      .eq("arquivada", false)
      .gte("criado_em", `${de}T00:00:00-03:00`)
      .lt("criado_em", `${somarDias(ate, 1)}T00:00:00-03:00`)
      .order("criado_em")
      .range(i, i + passo - 1);
    const lote = (data ?? []) as Linha[];
    linhas.push(...lote);
    if (lote.length < passo || i > 50000) break;
  }
  return linhas;
}

function Barra({ valor, max }: { valor: number; max: number }) {
  const w = max ? Math.max(valor ? 2 : 0, Math.round((valor / max) * 100)) : 0;
  return (
    <span className="rel-barra" aria-hidden="true">
      <span style={{ width: `${w}%` }} />
    </span>
  );
}

function Tabela({ titulo, primeira, linhas }: { titulo: string; primeira: string; linhas: { chave: string; rotulo: string; s: Soma }[] }) {
  const maxValor = Math.max(0, ...linhas.map((l) => l.s.valor));
  return (
    <section className="pn-cartao">
      <h2>{titulo}</h2>
      {linhas.length ? (
        <div className="pn-rolagem">
          <table className="pn-tabela rel-tabela">
            <thead>
              <tr>
                <th>{primeira}</th>
                <th className="rel-dir">Criadas</th>
                <th className="rel-dir">Enviadas</th>
                <th className="rel-dir">Aceitas</th>
                <th className="rel-dir">Conversão</th>
                <th>Valor aceito</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ chave, rotulo, s }) => (
                <tr key={chave}>
                  <td>{rotulo}</td>
                  <td className="pn-num rel-dir">{s.criadas}</td>
                  <td className="pn-num rel-dir">{s.enviadas}</td>
                  <td className="pn-num rel-dir">{s.aceitas}</td>
                  <td className="pn-num rel-dir">{pctTexto(s.aceitas, s.enviadas)}</td>
                  <td className="rel-valor">
                    <span className="pn-num">{reais(s.valor)}</span>
                    <Barra valor={s.valor} max={maxValor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="pn-vazio">Nenhuma proposta no período.</p>
      )}
    </section>
  );
}

export default async function PaginaRelatorios({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirUsuario();
  const sp = await searchParams;
  const hoje = hojeISO();
  let de = um(sp.de);
  let ate = um(sp.ate);
  if (!ISO.test(ate)) ate = hoje;
  if (!ISO.test(de)) de = somarDias(ate, -89);
  if (de > ate) [de, ate] = [ate, de];

  const [linhas, { data: parc }] = await Promise.all([buscar(de, ate), supabaseAdmin().from("parceiros").select("id, nome")]);
  const nomeParceiro = new Map(((parc ?? []) as { id: string; nome: string }[]).map((p) => [p.id, p.nome]));

  const geral = vazia();
  const porTipo = new Map<string, Soma>();
  const porParceiro = new Map<string, Soma>();
  const porMes = new Map<string, Soma>();
  const em = (m: Map<string, Soma>, k: string) => {
    let s = m.get(k);
    if (!s) m.set(k, (s = vazia()));
    return s;
  };
  for (const l of linhas) {
    somar(geral, l);
    somar(em(porTipo, l.evento_tipo || "outros"), l);
    somar(em(porParceiro, l.parceiro_id ?? ""), l);
    somar(em(porMes, mesMaceio.format(new Date(l.criado_em))), l);
  }

  const rotuloTipo = new Map<string, string>(TIPOS_EVENTO.map(([k, r]) => [k, r]));
  const tipos = [...porTipo].map(([k, s]) => ({ chave: k, rotulo: rotuloTipo.get(k) ?? k, s })).sort((a, b) => b.s.valor - a.s.valor || b.s.criadas - a.s.criadas);
  const parceiros = [...porParceiro]
    .map(([k, s]) => ({ chave: k || "sem", rotulo: k ? (nomeParceiro.get(k) ?? "Parceiro removido") : "Sem parceiro", s }))
    .sort((a, b) => (a.chave === "sem" ? 1 : b.chave === "sem" ? -1 : b.s.valor - a.s.valor || b.s.criadas - a.s.criadas));
  const meses = [...porMes]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([k, s]) => {
      const rotulo = new Date(`${k}-15T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
      return { chave: k, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1), s };
    });

  const atalhos = [
    { rotulo: "30 dias", de: somarDias(hoje, -29), ate: hoje },
    { rotulo: "90 dias", de: somarDias(hoje, -89), ate: hoje },
    { rotulo: "12 meses", de: somarDias(hoje, -364), ate: hoje },
    { rotulo: `Ano de ${hoje.slice(0, 4)}`, de: `${hoje.slice(0, 4)}-01-01`, ate: hoje },
  ];

  return (
    <>
      <header className="pn-topo">
        <div>
          <h1>Relatórios</h1>
          <p>
            Propostas criadas de {dataBR(de)} a {dataBR(ate)}. Arquivadas ficam de fora.
          </p>
        </div>
      </header>

      <form className="pn-filtros rel-filtros" method="get">
        <div className="campo">
          <span>De</span>
          <DataVidro rotulo="De" name="de" defaultValue={de} />
        </div>
        <div className="campo">
          <span>Até</span>
          <DataVidro rotulo="Até" name="ate" defaultValue={ate} />
        </div>
        <button className="botao" type="submit">
          Filtrar
        </button>
        <nav className="pn-abas rel-atalhos" aria-label="Períodos prontos">
          {atalhos.map((a) => (
            <Link key={a.rotulo} href={`/painel/relatorios?de=${a.de}&ate=${a.ate}`} aria-current={a.de === de && a.ate === ate ? "true" : undefined}>
              {a.rotulo}
            </Link>
          ))}
        </nav>
      </form>

      <div className="pn-numeros">
        <div className="pn-numero">
          <small>Propostas criadas</small>
          <b>{geral.criadas}</b>
        </div>
        <div className="pn-numero">
          <small>Enviadas</small>
          <b>{geral.enviadas}</b>
        </div>
        <div className="pn-numero">
          <small>Aceitas</small>
          <b>{geral.aceitas}</b>
        </div>
        <div className="pn-numero pn-numero--destaque">
          <small>Conversão (aceitas / enviadas)</small>
          <b>{pctTexto(geral.aceitas, geral.enviadas)}</b>
        </div>
        <div className="pn-numero pn-numero--destaque">
          <small>Valor aceito</small>
          <b className="rel-dinheiro">{reais(geral.valor)}</b>
        </div>
        <div className="pn-numero">
          <small>Desconto concedido</small>
          <b className="rel-dinheiro">{reais(geral.desconto)}</b>
        </div>
        <div className="pn-numero">
          <small>Desconto médio por enviada</small>
          <b className="rel-dinheiro">{reais(geral.enviadas ? Math.round(geral.desconto / geral.enviadas) : 0)}</b>
        </div>
      </div>

      <div className="rel-tabelas">
        <Tabela titulo="Por tipo de evento" primeira="Tipo" linhas={tipos} />
        <Tabela titulo="Por parceiro" primeira="Parceiro" linhas={parceiros} />
        <Tabela titulo="Por mês" primeira="Mês" linhas={meses} />
      </div>
      <p className="rel-nota">Enviada: já teve um link publicado. Aceita: aceita, contrato enviado ou contratada. Desconto concedido soma o desconto das propostas enviadas.</p>
    </>
  );
}
