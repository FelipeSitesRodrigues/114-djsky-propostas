import type { Bloco, DadosProposta, Item, TipoEvento } from "./tipos";
import { TIPOS_EVENTO } from "./tipos";
import { normalizar } from "./padrao";

// Tudo que chega do editor passa por aqui antes de gravar: corta texto comprido, força número
// onde é número e descarta o que não é do formato. O servidor nunca confia no navegador.
const txt = (v: unknown, max = 300) => String(v ?? "").slice(0, max).trim();
const num = (v: unknown, min = 0, max = 1e9) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const hhmm = (v: unknown) => (/^\d{2}:\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const iso = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const id = (v: unknown) => (/^[A-Za-z0-9-]{1,40}$/.test(String(v ?? "")) ? String(v) : Math.random().toString(36).slice(2, 10));

export function sanear(entrada: unknown): DadosProposta {
  const d = normalizar(entrada as Partial<DadosProposta>);
  const tipos = TIPOS_EVENTO.map(([k]) => k) as string[];
  const itens: Item[] = d.itens.slice(0, 60).map((i) => ({
    id: id(i.id),
    servicoId: i.servicoId && /^[0-9a-f-]{36}$/.test(i.servicoId) ? i.servicoId : null,
    nome: txt(i.nome, 120) || "Serviço",
    descricao: txt(i.descricao, 600),
    quantidade: Math.round(num(i.quantidade, 1, 999)),
    duracaoMin: i.duracaoMin ? Math.round(num(i.duracaoMin, 0, 24 * 60)) || null : null,
    duracaoMaxMin: i.duracaoMaxMin ? Math.round(num(i.duracaoMaxMin, 0, 24 * 60)) || null : null,
    precoUnit: Math.round(num(i.precoUnit, 0, 1e9)),
    tipo: i.tipo === "adicional" ? "adicional" : "base",
  }));
  const ids = new Set(itens.map((i) => i.id));
  const cronograma: Bloco[] = d.cronograma.slice(0, 40).map((b) => ({
    id: id(b.id),
    itemId: b.itemId && ids.has(b.itemId) ? b.itemId : null,
    titulo: txt(b.titulo, 120) || "Bloco",
    inicio: hhmm(b.inicio),
    fim: hhmm(b.fim),
    descricao: txt(b.descricao, 400),
  }));
  const f = d.financeiro;
  return {
    cliente: { nome: txt(d.cliente.nome, 120), whatsapp: txt(d.cliente.whatsapp, 30), email: txt(d.cliente.email, 120), responsavel: txt(d.cliente.responsavel, 120) },
    evento: {
      tipo: (tipos.includes(d.evento.tipo) ? d.evento.tipo : "outros") as TipoEvento,
      nome: txt(d.evento.nome, 140),
      data: iso(d.evento.data),
      local: txt(d.evento.local, 140),
      cidade: txt(d.evento.cidade, 80),
      endereco: txt(d.evento.endereco, 240),
      inicio: hhmm(d.evento.inicio),
      termino: hhmm(d.evento.termino),
    },
    itens,
    cronograma,
    financeiro: {
      descontoTipo: ["nenhum", "percentual", "valor"].includes(f.descontoTipo) ? f.descontoTipo : "nenhum",
      descontoValor: f.descontoTipo === "percentual" ? Math.round(num(f.descontoValor, 0, 100) * 100) / 100 : Math.round(num(f.descontoValor)),
      descontoSobre: f.descontoSobre === "base" ? "base" : "total",
      descontoMotivo: txt(f.descontoMotivo, 120),
      valorManual: f.valorManual === null || f.valorManual === undefined || (f.valorManual as unknown) === "" ? null : Math.round(num(f.valorManual)),
      justificativaManual: txt(f.justificativaManual, 300),
      sinalPercentual: Math.round(num(f.sinalPercentual, 0, 100) * 100) / 100,
      sinalVencimento: iso(f.sinalVencimento),
      saldoVencimento: iso(f.saldoVencimento),
      formaPagamento: txt(f.formaPagamento, 160),
    },
    condicoes: { validade: iso(d.condicoes.validade), observacoes: txt(d.condicoes.observacoes, 2000), condicoesPagamento: txt(d.condicoes.condicoesPagamento, 1000) },
    apresentacao: { titulo: txt(d.apresentacao.titulo, 80), texto: txt(d.apresentacao.texto, 2000), capa: txt(d.apresentacao.capa, 40) },
  };
}

// O que falta pra publicar (o cliente não pode receber proposta pela metade)
export function pendenciasPublicar(d: DadosProposta) {
  const p: string[] = [];
  if (!d.cliente.nome) p.push("nome do cliente");
  if (!d.evento.data) p.push("data do evento");
  if (!d.itens.length) p.push("pelo menos um serviço");
  if (!d.condicoes.validade) p.push("validade da proposta");
  if (d.financeiro.valorManual !== null && !d.financeiro.justificativaManual) p.push("justificativa do valor final manual");
  return p;
}
