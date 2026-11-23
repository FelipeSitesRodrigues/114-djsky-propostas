import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { naoLidas } from "@/lib/dados";
import { Casca } from "@/components/painel/Casca";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario();
  const [{ count }, avisos] = await Promise.all([
    supabaseAdmin().from("propostas").select("id", { count: "exact", head: true }).eq("status", "aceita").eq("arquivada", false),
    naoLidas(),
  ]);
  return (
    <Casca nome={u.nome} email={u.email} papel={u.papel} aguardando={count ?? 0} avisos={avisos}>
      {children}
    </Casca>
  );
}
