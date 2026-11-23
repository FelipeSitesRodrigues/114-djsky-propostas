// Aplica supabase/migrations em ordem, cada uma numa transação, e anota em public._migracoes.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ } from './env.mjs';
import { rodarSql } from './sql.mjs';

const PASTA = path.join(RAIZ, 'supabase', 'migrations');
await rodarSql(`create table if not exists public._migracoes (nome text primary key, aplicada_em timestamptz not null default now());
revoke all on public._migracoes from anon, authenticated;
alter table public._migracoes enable row level security;`);
const feitas = new Set((await rodarSql('select nome from public._migracoes')).map((l) => l.nome));
for (const nome of readdirSync(PASTA).filter((f) => f.endsWith('.sql')).sort()) {
  if (feitas.has(nome)) {
    console.log('  já aplicada', nome);
    continue;
  }
  const sql = readFileSync(path.join(PASTA, nome), 'utf8');
  try {
    await rodarSql(`begin;\n${sql}\n;insert into public._migracoes (nome) values ('${nome}');\ncommit;`);
    console.log('✓ aplicada', nome);
  } catch (e) {
    console.error('✗ falhou', nome, '\n', e.message);
    process.exitCode = 1;
    break;
  }
}
