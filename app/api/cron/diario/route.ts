import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hojeISO } from "@/lib/proposta/padrao";

// Cron diário da Vercel (vercel.json): marca como vencidas as propostas abertas que passaram da
// validade, limpa o registro de tentativas antigas e, de quebra, mantém o Supabase Free acordado
// (ele pausa depois de 7 dias sem uso, e aí o link do cliente para de abrir).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("não autorizado", { status: 401 });
  const db = supabaseAdmin();
  const hoje = hojeISO();
  const { data: vencidas } = await db
    .from("propostas")
    .update({ status: "vencida", atualizado_em: new Date().toISOString() })
    .in("status", ["enviada", "visualizada", "negociacao"])
    .lt("validade", hoje)
    .select("id, numero");
  for (const v of vencidas ?? []) {
    await db.from("historico").insert({ proposta_id: v.id, tipo: "status", detalhe: { para: "vencida", automatico: true } });
  }
  await db.from("tentativas").delete().lt("criado_em", new Date(Date.now() - 2 * 86400000).toISOString());
  return NextResponse.json({ ok: true, vencidas: vencidas?.length ?? 0 });
}
