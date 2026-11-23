import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/painel/sessao";
import { configuracoes, propostaPorId, versao } from "@/lib/dados";
import { Pagina } from "@/components/proposta/Pagina";
import "../../../p/proposta.css";

export const metadata: Metadata = { title: "Pré-visualização" };

// Como o cliente vai ver (versão atual, ou ?v=N pra uma versão antiga). Não registra acesso e o
// aceite fica travado.
export default async function Previa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  await exigirUsuario();
  const { id } = await params;
  const { v } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await propostaPorId(id);
  if (!p) notFound();
  const numero = v && /^\d+$/.test(v) ? Number(v) : p.versao_atual;
  const [ver, { geral }] = await Promise.all([versao(id, numero), configuracoes()]);
  if (!ver) notFound();
  return (
    <>
      <div style={{ position: "sticky", top: 0, zIndex: 60, display: "flex", justifyContent: "center", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "8px 12px", background: "var(--lima)", color: "#08070b", fontSize: 13.5, fontWeight: 700 }}>
        Pré-visualização da versão {numero}{numero === p.versao_publicada ? " (a que o cliente vê)" : p.versao_publicada ? ` (o cliente vê a versão ${p.versao_publicada})` : " (ainda não enviada)"}
        <a href={`/painel/propostas/${id}`} style={{ textDecoration: "underline" }}>Voltar ao editor</a>
      </div>
      <Pagina dados={ver.dados} numero={p.numero} versao={numero} codigo={p.codigo} estado="previa" whatsapp={geral.whatsapp} />
    </>
  );
}
