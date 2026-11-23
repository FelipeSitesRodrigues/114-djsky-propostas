// Cria (ou reativa) quem entra no painel: usuário no Supabase Auth + linha em perfis.
//   npm run usuario -- email@x.com "Nome" senha [admin|comercial]
import { createClient } from '@supabase/supabase-js';

const [email, nome, senha, papel = 'admin'] = process.argv.slice(2);
if (!email || !nome || !senha) {
  console.error('uso: npm run usuario -- email "Nome" senha [admin|comercial]');
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const e = email.trim().toLowerCase();
let id;
const { data: criado, error } = await db.auth.admin.createUser({ email: e, password: senha, email_confirm: true, user_metadata: { nome } });
if (error) {
  if (!/already|registered|exists/i.test(error.message)) {
    console.error('✗', error.message);
    process.exit(1);
  }
  const { data: lista } = await db.auth.admin.listUsers({ perPage: 1000 });
  const u = lista.users.find((x) => x.email === e);
  if (!u) {
    console.error('✗ usuário existe mas não achei');
    process.exit(1);
  }
  id = u.id;
  await db.auth.admin.updateUserById(id, { password: senha });
} else id = criado.user.id;
const { error: ea } = await db.from('perfis').upsert({ user_id: id, email: e, nome, papel, ativo: true });
if (ea) {
  console.error('✗', ea.message);
  process.exit(1);
}
console.log(`✓ ${nome} <${e}> entra no painel (${papel})`);
