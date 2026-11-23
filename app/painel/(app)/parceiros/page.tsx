import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parceiros } from "@/lib/dados";
import { Parceiros, type Contagem } from "@/components/painel/parceiros/Parceiros";
import { STATUS_ACEITOS } from "@/components/painel/parceiros/tipos";
import "../catalogo/catalogo.css";

export const metadata = { title: "Parceiros" };

export default async function PaginaParceiros() {
  await exigirUsuario();
  const [lista, { data: linhas }] = await Promise.all([
    parceiros(),
    supabaseAdmin().from("propostas").select("parceiro_id, status, arquivada").not("parceiro_id", "is", null).range(0, 9999),
  ]);

  // total e aceitas ignoram as arquivadas; "qualquer" conta todas (decide se dá pra apagar)
  const contagem: Record<string, Contagem> = {};
  for (const l of (linhas ?? []) as { parceiro_id: string; status: string; arquivada: boolean }[]) {
    const c = (contagem[l.parceiro_id] ??= { total: 0, aceitas: 0, qualquer: 0 });
    c.qualquer++;
    if (l.arquivada) continue;
    c.total++;
    if (STATUS_ACEITOS.includes(l.status)) c.aceitas++;
  }

  return <Parceiros parceiros={lista} contagem={contagem} />;
}
