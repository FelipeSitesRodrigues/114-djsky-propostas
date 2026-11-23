// Lê as chaves do Supabase do Sky em .env.supabase.local (fora do git):
//   SUPABASE_ACCESS_TOKEN=sbp_...   (token da conta, só pra montar o banco)
//   SUPABASE_REF=abcd...            (id do projeto; o configurar.mjs preenche)
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function lerEnv(arquivo) {
  const p = path.join(RAIZ, arquivo);
  if (!existsSync(p)) return {};
  return Object.fromEntries(
    readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

export function supa() {
  const e = { ...lerEnv('.env.supabase.local'), ...process.env };
  if (!e.SUPABASE_ACCESS_TOKEN) throw new Error('falta SUPABASE_ACCESS_TOKEN em .env.supabase.local');
  return { token: e.SUPABASE_ACCESS_TOKEN, ref: e.SUPABASE_REF };
}

export async function api(caminho, opcoes = {}) {
  const { token } = supa();
  const r = await fetch(`https://api.supabase.com/v1${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opcoes.headers ?? {}) },
  });
  const texto = await r.text();
  if (!r.ok) {
    let msg = texto;
    try { msg = JSON.parse(texto).message ?? texto; } catch {}
    throw new Error(`${r.status} ${msg}`);
  }
  return texto ? JSON.parse(texto) : null;
}
