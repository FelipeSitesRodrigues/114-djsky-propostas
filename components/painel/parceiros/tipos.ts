// Tipos sugeridos de parceiro. A coluna é texto livre: um tipo fora da lista continua valendo.
export const TIPOS_PARCEIRO = [
  ["cerimonialista", "Cerimonialista"],
  ["assessoria", "Assessoria"],
  ["espaco", "Espaço ou buffet"],
  ["indicacao", "Indicação"],
  ["outro", "Outro"],
] as const;

export function nomeTipoParceiro(t: string) {
  return TIPOS_PARCEIRO.find(([v]) => v === t)?.[1] ?? t;
}

// Status que contam como proposta fechada pelo parceiro
export const STATUS_ACEITOS = ["aceita", "contrato_enviado", "contratada"];
