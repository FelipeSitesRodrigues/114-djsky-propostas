// 1ª vez com o token do Sky: acha o projeto, pega as chaves e escreve o .env.local.
//   node scripts/configurar.mjs [ref]
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RAIZ, api, lerEnv, supa } from './env.mjs';

let { ref } = supa();
if (!ref) {
  const projetos = await api('/projects');
  console.log(projetos.map((p) => `${p.id}  ${p.name}  ${p.region}  ${p.status}`).join('\n'));
  ref = process.argv[2] ?? (projetos.length === 1 ? projetos[0].id : null);
  if (!ref) {
    console.error('nenhum ou mais de um projeto: rode de novo com o ref');
    process.exit(1);
  }
  const arq = path.join(RAIZ, '.env.supabase.local');
  writeFileSync(arq, readFileSync(arq, 'utf8').trimEnd() + `\nSUPABASE_REF=${ref}\n`);
}

const chaves = await api(`/projects/${ref}/api-keys?reveal=true`);
const publica = chaves.find((k) => k.type === 'publishable')?.api_key ?? chaves.find((k) => k.name === 'anon')?.api_key;
let secreta = chaves.find((k) => k.type === 'secret')?.api_key ?? chaves.find((k) => k.name === 'service_role')?.api_key;
if (!secreta) {
  const nova = await api(`/projects/${ref}/api-keys?reveal=true`, { method: 'POST', body: JSON.stringify({ type: 'secret', name: 'servidor' }) });
  secreta = nova.api_key;
}

const atual = lerEnv('.env.local');
const env = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publica,
  SUPABASE_SECRET_KEY: secreta,
  DADOS_CHAVE: atual.DADOS_CHAVE ?? randomBytes(32).toString('base64'),
  CRON_SECRET: atual.CRON_SECRET ?? randomBytes(24).toString('base64url'),
  SITE_URL: atual.SITE_URL ?? 'http://localhost:3416',
};
writeFileSync(path.join(RAIZ, '.env.local'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
console.log(`✓ .env.local escrito pro projeto ${ref}`);
console.log('  GUARDAR A DADOS_CHAVE: sem ela os CPFs já gravados não abrem mais.');
