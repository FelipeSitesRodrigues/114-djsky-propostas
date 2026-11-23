"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exigirUsuario } from "@/lib/painel/sessao";

type R = { ok: true } | { ok: false; erro: string };

function pronto() {
  revalidatePath("/painel/avisos");
  revalidatePath("/painel", "layout"); // contador do menu
}

export async function marcarLida(id: number): Promise<R> {
  await exigirUsuario();
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, erro: "Aviso inválido." };
  const { error } = await supabaseAdmin().from("notificacoes").update({ lida: true }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível marcar agora. Tente de novo." };
  pronto();
  return { ok: true };
}

export async function marcarTodasLidas(): Promise<R> {
  await exigirUsuario();
  const { error } = await supabaseAdmin().from("notificacoes").update({ lida: true }).eq("lida", false);
  if (error) return { ok: false, erro: "Não foi possível marcar agora. Tente de novo." };
  pronto();
  return { ok: true };
}
