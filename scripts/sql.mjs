// Roda SQL no Supabase do Sky pela API de gerenciamento.
// Uso: node scripts/sql.mjs arquivo.sql   |   node scripts/sql.mjs -e "select 1"
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, supa } from './env.mjs';

export async function rodarSql(query) {
  const { ref } = supa();
  if (!ref) throw new Error('falta SUPABASE_REF em .env.supabase.local (rode node scripts/configurar.mjs)');
  return api(`/projects/${ref}/database/query`, { method: 'POST', body: JSON.stringify({ query }) });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const i = process.argv.indexOf('-e');
  const query = i > -1 ? process.argv[i + 1] : readFileSync(process.argv[2], 'utf8');
  try {
    console.table(await rodarSql(query));
  } catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
  }
}
