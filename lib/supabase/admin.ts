import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com a chave secreta: passa por cima do RLS. Só no servidor, e só depois de conferir
// o login (exigirAdmin) ou dentro das rotas da loja que validam tudo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const criar = () => createClient<any, "public", any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let cliente: ReturnType<typeof criar> | null = null;
export function supabaseAdmin() {
  cliente ??= criar();
  return cliente;
}
