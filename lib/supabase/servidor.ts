import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cliente com a sessão de quem está logado (cookies). Usado pra saber QUEM é; os dados do
// painel vêm do supabaseAdmin depois de conferir o papel.
export async function supabaseSessao() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try { lista.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server Component: o proxy renova */ }
      },
    },
  });
}
