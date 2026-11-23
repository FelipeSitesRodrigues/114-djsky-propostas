import { test } from "node:test";
import assert from "node:assert/strict";
import { calcular, lerReais } from "./calculo.ts";
import { cpfValido, formatarCpf } from "./cpf.ts";
import { alertasCronograma, duracaoBloco } from "./cronograma.ts";

const fin = (o = {}) => ({ descontoTipo: "nenhum", descontoValor: 0, descontoSobre: "total", descontoMotivo: "", valorManual: null, justificativaManual: "", sinalPercentual: 50, sinalVencimento: "", saldoVencimento: "", formaPagamento: "", ...o }) as never;

test("critério do escopo: base 6.000 com 50% de desconto dá 3.000", () => {
  const c = calcular([{ quantidade: 1, precoUnit: 600000, tipo: "base" }], fin({ descontoTipo: "percentual", descontoValor: 50 }));
  assert.equal(c.total, 300000);
  assert.equal(c.sinal, 150000);
  assert.equal(c.saldo, 150000);
});

test("desconto só sobre a base não toca nos adicionais", () => {
  const itens = [{ quantidade: 1, precoUnit: 600000, tipo: "base" }, { quantidade: 4, precoUnit: 50000, tipo: "adicional" }] as never;
  assert.equal(calcular(itens, fin({ descontoTipo: "percentual", descontoValor: 50, descontoSobre: "base" })).total, 500000);
  assert.equal(calcular(itens, fin({ descontoTipo: "percentual", descontoValor: 50 })).total, 400000);
});

test("desconto em reais nunca passa do valor e o total nunca fica negativo", () => {
  const c = calcular([{ quantidade: 1, precoUnit: 100000, tipo: "base" }], fin({ descontoTipo: "valor", descontoValor: 999999 }));
  assert.equal(c.total, 0);
});

test("valor manual substitui o calculado e o sinal segue o manual", () => {
  const c = calcular([{ quantidade: 1, precoUnit: 600000, tipo: "base" }], fin({ valorManual: 450000, sinalPercentual: 30 }));
  assert.equal(c.total, 450000);
  assert.equal(c.manual, true);
  assert.equal(c.sinal, 135000);
});

test("lerReais entende o jeito brasileiro", () => {
  assert.equal(lerReais("6.000"), 600000);
  assert.equal(lerReais("6.000,50"), 600050);
  assert.equal(lerReais("R$ 1.234,5"), 123450);
  assert.equal(lerReais("750"), 75000);
});

test("CPF: dígito verificador", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("529.982.247-24"), false);
  assert.equal(cpfValido("111.111.111-11"), false);
  assert.equal(cpfValido("123"), false);
  assert.equal(formatarCpf("52998224725"), "529.982.247-25");
});

const item = (o: object) => ({ id: "x", servicoId: null, nome: "Serviço", descricao: "", quantidade: 1, duracaoMin: null, duracaoMaxMin: null, precoUnit: 0, tipo: "base", ...o }) as never;
const bloco = (id: string, titulo: string, inicio: string, fim: string, itemId: string | null = null) => ({ id, itemId, titulo, inicio, fim, descricao: "" });

test("cronograma do escopo (abertura 19h-22h, show 22h-00h) não tem alerta", () => {
  const itens = [item({ id: "a", nome: "DJ de abertura", duracaoMaxMin: 180 }), item({ id: "s", nome: "Show completo SKY", duracaoMin: 120, duracaoMaxMin: 120 })];
  const blocos = [bloco("1", "DJ de abertura", "19:00", "22:00", "a"), bloco("2", "Show completo SKY", "22:00", "00:00", "s")];
  assert.deepEqual(alertasCronograma(blocos, itens, { inicio: "19:00", termino: "00:00" }), []);
  assert.equal(duracaoBloco(blocos[1]), 120);
});

test("cronograma acusa sobreposição, duração acima do máximo e bloco fora do evento", () => {
  const itens = [item({ id: "s", nome: "Show completo SKY", duracaoMaxMin: 120 })];
  const blocos = [bloco("1", "Abertura", "19:00", "22:30"), bloco("2", "Show", "22:00", "01:00", "s")];
  const a = alertasCronograma(blocos, itens, { inicio: "19:00", termino: "00:00" }).map((x) => x.texto).join("\n");
  assert.match(a, /antes de "Abertura" terminar/);
  assert.match(a, /mais que o máximo/);
  assert.match(a, /fora do horário do evento/);
});
