import { cepValido, cpfValido, UFS } from "./cpf";

export type DadosAceite = {
  nome: string;
  cpf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ciente: boolean;
  // proteções
  site: string; // honeypot: gente não vê esse campo
  abertoEm: number;
  chave: string;
};

export type RespostaAceite = { ok: true } | { ok: false; erro: string; campos?: Partial<Record<keyof DadosAceite, string>> };

export function validarAceite(d: DadosAceite) {
  const campos: Partial<Record<keyof DadosAceite, string>> = {};
  const nome = String(d.nome ?? "").trim().replace(/\s+/g, " ");
  if (nome.length < 5 || !nome.includes(" ")) campos.nome = "Escreva o nome completo.";
  if (!cpfValido(d.cpf)) campos.cpf = "CPF inválido. Confira os números.";
  if (!cepValido(d.cep)) campos.cep = "CEP com 8 números.";
  if (String(d.logradouro ?? "").trim().length < 3) campos.logradouro = "Informe a rua.";
  if (!String(d.numero ?? "").trim()) campos.numero = "Informe o número (ou S/N).";
  if (String(d.bairro ?? "").trim().length < 2) campos.bairro = "Informe o bairro.";
  if (String(d.cidade ?? "").trim().length < 2) campos.cidade = "Informe a cidade.";
  if (!UFS.includes(String(d.uf ?? "").toUpperCase())) campos.uf = "Escolha o estado.";
  if (!d.ciente) campos.ciente = "Marque a declaração para enviar.";
  for (const [k, v] of Object.entries(d)) if (typeof v === "string" && v.length > 200) campos[k as keyof DadosAceite] = "Texto longo demais.";
  return campos;
}

export const TEXTO_DECLARACAO =
  "Declaro que aceito esta proposta comercial e que os dados informados são verdadeiros. Estou ciente de que eles serão usados pela equipe SKY somente para elaborar o contrato do evento, e que o aceite não substitui a assinatura do contrato definitivo.";

