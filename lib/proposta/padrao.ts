import type { DadosProposta, TipoEvento } from "./tipos";

export type Geral = {
  whatsapp: string;
  sinalPercentual: number;
  validadeDias: number;
  formaPagamento: string;
  condicoesPagamento: string;
  emailAvisos: string;
};
export type RegraDesconto = { nome: string; percentual: number };
export type Apresentacoes = Partial<Record<TipoEvento, { titulo: string; texto: string; capa: string }>>;

export const GERAL_PADRAO: Geral = {
  whatsapp: "5579999662758",
  sinalPercentual: 50,
  validadeDias: 7,
  formaPagamento: "Pix ou transferência",
  condicoesPagamento: "Sinal para reservar a data. O saldo é pago até a data combinada abaixo.",
  emailAvisos: "",
};

export function hojeISO(fuso = "America/Maceio") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function idCurto() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function propostaVazia(geral: Geral, apresentacoes: Apresentacoes, tipo: TipoEvento = "casamento"): DadosProposta {
  const ap = apresentacoes[tipo] ?? { titulo: "O seu evento", texto: "", capa: "festival" };
  return {
    cliente: { nome: "", whatsapp: "", email: "", responsavel: "" },
    evento: { tipo, nome: "", data: "", local: "", cidade: "Aracaju", endereco: "", inicio: "19:00", termino: "00:00" },
    itens: [],
    cronograma: [],
    financeiro: {
      descontoTipo: "nenhum",
      descontoValor: 0,
      descontoSobre: "total",
      descontoMotivo: "",
      valorManual: null,
      justificativaManual: "",
      sinalPercentual: geral.sinalPercentual,
      sinalVencimento: "",
      saldoVencimento: "",
      formaPagamento: geral.formaPagamento,
    },
    condicoes: { validade: somarDias(hojeISO(), geral.validadeDias), observacoes: "", condicoesPagamento: geral.condicoesPagamento },
    apresentacao: { ...ap },
  };
}

// Junta o que veio do banco com o formato atual (versões antigas sem algum campo não quebram)
export function normalizar(d: Partial<DadosProposta> | null | undefined, geral: Geral = GERAL_PADRAO): DadosProposta {
  const base = propostaVazia(geral, {});
  const x = d ?? {};
  return {
    cliente: { ...base.cliente, ...(x.cliente ?? {}) },
    evento: { ...base.evento, ...(x.evento ?? {}) },
    itens: Array.isArray(x.itens) ? x.itens : [],
    cronograma: Array.isArray(x.cronograma) ? x.cronograma : [],
    financeiro: { ...base.financeiro, ...(x.financeiro ?? {}) },
    condicoes: { ...base.condicoes, ...(x.condicoes ?? {}) },
    apresentacao: { ...base.apresentacao, ...(x.apresentacao ?? {}) },
  };
}

// Dias da semana (seg a qui) pra sugerir a regra de desconto "dia de semana"
export function diaDeSemana(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const dia = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dia >= 1 && dia <= 4;
}

export function dataBR(iso: string | null | undefined, longa = false) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return longa
    ? d.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function soNumeros(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

// WhatsApp com DDI: "(79) 99966-2758" → "5579999662758"
export function whatsappInternacional(v: string) {
  const d = soNumeros(v);
  if (!d) return "";
  return d.length <= 11 ? `55${d}` : d;
}
