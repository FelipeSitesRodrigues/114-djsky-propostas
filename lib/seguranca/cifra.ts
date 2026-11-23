import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// CPF e endereço saem do servidor já cifrados (AES-256-GCM). A chave (32 bytes em base64, na
// variável DADOS_CHAVE) só existe na Vercel e no .env.local: o banco guarda texto ilegível.
// Formato: v1.<iv>.<tag>.<conteúdo>, tudo em base64url.

function chave(texto = process.env.DADOS_CHAVE) {
  if (!texto) throw new Error("DADOS_CHAVE não configurada");
  const k = Buffer.from(texto, "base64");
  if (k.length !== 32) throw new Error("DADOS_CHAVE precisa ter 32 bytes em base64");
  return k;
}

export function cifrar(valor: unknown, k = chave()) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const corpo = Buffer.concat([c.update(JSON.stringify(valor), "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), corpo.toString("base64url")].join(".");
}

export function decifrar<T = unknown>(texto: string, k = chave()): T {
  const [v, iv, tag, corpo] = String(texto).split(".");
  if (v !== "v1" || !iv || !tag || !corpo) throw new Error("dado cifrado em formato desconhecido");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(corpo, "base64url")), d.final()]).toString("utf8")) as T;
}

// IP e navegador entram no banco só como hash com segredo (dá pra contar repetição, não pra ler)
export function hashSecreto(valor: string, k = chave()) {
  return createHmac("sha256", k).update(`hash:${valor}`).digest("base64url").slice(0, 32);
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
// código da URL pública: 24 caracteres de um alfabeto sem 0/O/1/l (≈ 140 bits)
export function codigoPublico(tamanho = 24): string {
  const bytes = randomBytes(tamanho * 2);
  let s = "";
  for (let i = 0; s.length < tamanho && i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 256 - (256 % ALFABETO.length)) s += ALFABETO[b % ALFABETO.length];
  }
  return s.length === tamanho ? s : codigoPublico(tamanho);
}
