import { notFound } from "next/navigation";
import { Pagina, type EstadoPagina } from "@/components/proposta/Pagina";
import type { DadosProposta } from "@/lib/proposta/tipos";
import "../p/proposta.css";

// Só no computador (npm run dev): a proposta do critério de aceite do escopo, sem banco.
// /exemplo?estado=aceita|vencida mostra os outros estados.
export default async function Exemplo({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { estado } = await searchParams;
  const dados: DadosProposta = {
    cliente: { nome: "Maria Eduarda Santos", whatsapp: "(79) 99999-0000", email: "", responsavel: "Ana Santos (mãe)" },
    evento: { tipo: "15-anos", nome: "15 anos da Maria Eduarda", data: "2027-03-20", local: "Espaço Vila Verde", cidade: "Aracaju", endereco: "Av. Beira Mar, 1000, Atalaia", inicio: "19:00", termino: "00:00" },
    itens: [
      { id: "a", servicoId: null, nome: "DJ de abertura", descricao: "Recepção, entrada da debutante e protocolos.", quantidade: 1, duracaoMin: 180, duracaoMaxMin: 180, precoUnit: 200000, tipo: "base" },
      { id: "s", servicoId: null, nome: "Show completo SKY", descricao: "Set autoral com drops próprios e visual de telão.", quantidade: 1, duracaoMin: 120, duracaoMaxMin: 180, precoUnit: 400000, tipo: "base" },
    ],
    cronograma: [
      { id: "1", itemId: "a", titulo: "DJ de abertura", inicio: "19:00", fim: "22:00", descricao: "Recepção e protocolos" },
      { id: "2", itemId: "s", titulo: "Show completo SKY", inicio: "22:00", fim: "00:00", descricao: "Pista aberta até o fim" },
    ],
    financeiro: { descontoTipo: "percentual", descontoValor: 50, descontoSobre: "total", descontoMotivo: "Parceria", valorManual: null, justificativaManual: "", sinalPercentual: 50, sinalVencimento: "2026-12-05", saldoVencimento: "2027-03-13", formaPagamento: "Pix ou transferência" },
    condicoes: { validade: "2026-11-30", observacoes: "Alimentação da equipe (3 pessoas) por conta do contratante.\nCamarim com água e tomada próxima à cabine.", condicoesPagamento: "Sinal para reservar a data. O saldo é pago até uma semana antes do evento." },
    apresentacao: { titulo: "A noite dos seus 15 anos", texto: "Entrada, valsa, protocolos e uma pista que não esvazia. Tudo pensado para os seus 15 anos.\n\nA proposta abaixo foi montada com o que conversamos.", capa: "15-anos" },
  };
  const e = (["aceita", "vencida", "encerrada"].includes(String(estado)) ? estado : "previa") as EstadoPagina;
  return <Pagina dados={dados} numero={12} versao={1} codigo="exemplo" estado={e} whatsapp="5579999662758" aceitaEm={e === "aceita" ? new Date().toISOString() : null} />;
}
