// Retrato de uma versão da proposta (jsonb em proposta_versoes.dados). Dinheiro sempre em
// centavos inteiros; horário como "HH:MM".

export const TIPOS_EVENTO = [
  ["casamento", "Casamento"],
  ["15-anos", "15 anos"],
  ["formatura", "Formatura"],
  ["corporativo", "Corporativo"],
  ["aniversario", "Aniversário"],
  ["reveillon", "Réveillon"],
  ["particular", "Festa particular"],
  ["outros", "Outro"],
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number][0];

export const STATUS = [
  ["rascunho", "Rascunho"],
  ["enviada", "Enviada"],
  ["visualizada", "Visualizada"],
  ["negociacao", "Em negociação"],
  ["aceita", "Aceita, aguardando contrato"],
  ["contrato_enviado", "Contrato enviado"],
  ["contratada", "Contratada"],
  ["recusada", "Recusada"],
  ["vencida", "Vencida"],
] as const;
export type Status = (typeof STATUS)[number][0];

export type Cliente = { nome: string; whatsapp: string; email: string; responsavel: string };

export type Evento = {
  tipo: TipoEvento;
  nome: string;
  data: string; // AAAA-MM-DD
  local: string;
  cidade: string;
  endereco: string; // livre, editável à mão
  inicio: string; // HH:MM
  termino: string; // HH:MM (pode passar da meia-noite)
};

export type Item = {
  id: string;
  servicoId: string | null;
  nome: string;
  descricao: string;
  quantidade: number;
  duracaoMin: number | null; // duração contratada
  duracaoMaxMin: number | null; // teto do catálogo (pro alerta do cronograma)
  precoUnit: number; // centavos
  tipo: "base" | "adicional";
};

export type Bloco = {
  id: string;
  itemId: string | null; // serviço do bloco (alerta de duração)
  titulo: string;
  inicio: string;
  fim: string;
  descricao: string;
};

export type Financeiro = {
  descontoTipo: "nenhum" | "percentual" | "valor";
  descontoValor: number; // percentual (ex.: 50) ou centavos
  descontoSobre: "total" | "base";
  descontoMotivo: string;
  valorManual: number | null; // centavos; só admin, com justificativa
  justificativaManual: string;
  sinalPercentual: number;
  sinalVencimento: string; // AAAA-MM-DD ou ""
  saldoVencimento: string;
  formaPagamento: string;
};

export type Condicoes = { validade: string; observacoes: string; condicoesPagamento: string };

export type Apresentacao = { titulo: string; texto: string; capa: string };

export type DadosProposta = {
  cliente: Cliente;
  evento: Evento;
  itens: Item[];
  cronograma: Bloco[];
  financeiro: Financeiro;
  condicoes: Condicoes;
  apresentacao: Apresentacao;
};
