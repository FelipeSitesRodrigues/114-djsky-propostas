import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { supabaseSessao } from "@/lib/supabase/servidor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Usuario = { id: string; email: string; nome: string; papel: "admin" | "comercial" };

// Quem está logado no painel. Sem sessão → login; sem perfil ativo → 403. Chamar no começo de
// toda página e de toda ação do painel. exigirAdmin() pra o que mexe com CPF, endereço,
// usuários, valor manual e apagar dados.
export const exigirUsuario = cache(async (): Promise<Usuario> => {
  // getClaims confere a assinatura do token aqui mesmo (chave ES256 do projeto, guardada em
  // memória), sem ir ao servidor de login a cada clique como o getUser. Quem foi desativado cai
  // na checagem do perfil logo abaixo, que vai ao banco em toda página.
  const supabase = await supabaseSessao();
  const { data } = await supabase.auth.getClaims();
  const uid = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!uid) redirect("/painel/entrar");
  const { data: p } = await supabaseAdmin()
    .from("perfis")
    .select("user_id, email, nome, papel, ativo")
    .eq("user_id", uid)
    .maybeSingle<{ user_id: string; email: string; nome: string; papel: Usuario["papel"]; ativo: boolean }>();
  if (!p || !p.ativo) forbidden();
  return { id: p.user_id, email: p.email, nome: p.nome, papel: p.papel };
});

export async function exigirAdmin() {
  const u = await exigirUsuario();
  if (u.papel !== "admin") forbidden();
  return u;
}
