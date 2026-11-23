import type { Financeiro, Item } from "./tipos";

// Regra do desconto (escopo, item 6): base + adicionais = subtotal. O desconto incide sobre o
// subtotal inteiro ("total", padrão) ou só sobre os itens de base ("base"); nunca passa do valor
// sobre o qual incide. O valor manual, quando existe, substitui o total calculado.
export type Conta = {
  base: number;
  adicionais: number;
  subtotal: number;
  incidencia: number;
  desconto: number;
  calculado: number;
  total: number;
  manual: boolean;
  sinal: number;
  saldo: number;
};

const inteiro = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);

export function valorItem(i: Pick<Item, "quantidade" | "precoUnit">) {
  return inteiro(Math.max(0, i.quantidade) * Math.max(0, i.precoUnit));
}

export function calcular(itens: Pick<Item, "quantidade" | "precoUnit" | "tipo">[], f: Financeiro): Conta {
  const base = itens.filter((i) => i.tipo === "base").reduce((s, i) => s + valorItem(i), 0);
  const adicionais = itens.filter((i) => i.tipo === "adicional").reduce((s, i) => s + valorItem(i), 0);
  const subtotal = base + adicionais;
  const incidencia = f.descontoSobre === "base" ? base : subtotal;
  let desconto = 0;
  if (f.descontoTipo === "percentual") desconto = inteiro((incidencia * Math.min(100, Math.max(0, f.descontoValor))) / 100);
  else if (f.descontoTipo === "valor") desconto = Math.min(incidencia, inteiro(Math.max(0, f.descontoValor)));
  const calculado = subtotal - desconto;
  const manual = f.valorManual !== null && f.valorManual !== undefined && Number.isFinite(f.valorManual);
  const total = manual ? Math.max(0, inteiro(f.valorManual as number)) : calculado;
  const pct = Math.min(100, Math.max(0, f.sinalPercentual));
  const sinal = inteiro((total * pct) / 100);
  return { base, adicionais, subtotal, incidencia, desconto, calculado, total, manual, sinal, saldo: total - sinal };
}

export function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "6.000,50" / "6000" / "R$ 6.000" → centavos
export function lerReais(texto: string): number {
  const limpo = String(texto).replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
