import Link from "next/link";
import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reais } from "@/lib/proposta/calculo";
import { dataBR } from "@/lib/proposta/padrao";
import { Status } from "@/components/painel/Status";

export const metadata: Metadata = { title: "Aguardando contrato" };

type Linha = { id: string; nome: string; cidade_uf: string; total: number; versao: number; criado_em: string; dados_apagados_em: string | null; propostas: { id: string; numero: number; status: string; evento_nome: string; evento_data: string | null; evento_tipo: string; arquivada: boolean } };

export default async function Aceitas({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const u = await exigirUsuario();
  const { todas } = await searchParams;
  const { data } = await supabaseAdmin()
    .from("aceites")
    .select("id, nome, cidade_uf, total, versao, criado_em, dados_apagados_em, propostas!inner(id, numero, status, evento_nome, evento_data, evento_tipo, arquivada)")
    .order("criado_em", { ascending: false })
    .limit(300);
  const linhas = ((data ?? []) as unknown as Linha[]).filter((l) => !l.propostas.arquivada && (todas === "1" || l.propostas.status === "aceita"));

  return (
    <>
      <div className="pn-topo">
        <div>
          <h1>{todas === "1" ? "Todos os aceites" : "Aguardando contrato"}</h1>
          <p>{u.papel === "admin" ? "Clique no cliente para abrir a ficha com CPF e endereço." : "CPF e endereço completos aparecem só para administradores."}</p>
        </div>
        <div className="pn-abas" style={{ margin: 0 }}>
          <Link href="/painel/aceitas" aria-current={todas !== "1"}>Aguardando contrato</Link>
          <Link href="/painel/aceitas?todas=1" aria-current={todas === "1"}>Todos os aceites</Link>
        </div>
      </div>
      <div className="pn-cartao pn-rolagem" style={{ padding: 0 }}>
        {linhas.length === 0 ? (
          <p className="pn-vazio">{todas === "1" ? "Nenhum aceite ainda." : "Nenhuma proposta aguardando contrato."}</p>
        ) : (
          <table className="pn-tabela">
            <thead>
              <tr><th>Nº</th><th>Cliente</th><th>Evento</th><th>Aceita em</th><th>Status</th><th style={{ textAlign: "right" }}>Valor</th></tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td className="pn-num">{String(l.propostas.numero).padStart(4, "0")}</td>
                  <td><Link href={`/painel/aceitas/${l.id}`}>{l.nome}</Link><span className="pn-sub">{l.dados_apagados_em ? "dados pessoais apagados" : l.cidade_uf}</span></td>
                  <td>{l.propostas.evento_nome || "Evento"}<span className="pn-sub">{dataBR(l.propostas.evento_data)}</span></td>
                  <td className="pn-num">{new Date(l.criado_em).toLocaleString("pt-BR", { timeZone: "America/Maceio", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  <td><Status s={l.propostas.status} /></td>
                  <td className="pn-num" style={{ textAlign: "right" }}>{reais(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
