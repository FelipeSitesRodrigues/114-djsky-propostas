import "server-only";

// Aviso por e-mail, opcional: só manda se houver RESEND_API_KEY e um e-mail em Ajustes. O texto
// nunca leva CPF nem endereço (escopo, item 9): só o número da proposta e o caminho no painel.
export async function enviarAvisoEmail(para: string, assunto: string, texto: string) {
  const chave = process.env.RESEND_API_KEY;
  const destinos = String(para ?? "").split(/[,;\s]+/).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (!chave || !destinos.length) return false;
  const painel = `${process.env.SITE_URL ?? ""}/painel/aceitas`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AVISO_REMETENTE ?? "SKY Propostas <onboarding@resend.dev>",
      to: destinos,
      subject: assunto,
      text: `${texto}\n\n${painel}`,
    }),
  });
  return r.ok;
}
