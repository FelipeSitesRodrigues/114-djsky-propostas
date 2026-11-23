"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarGeral } from "@/app/painel/acoes/ajustes";
import type { Geral } from "@/lib/proposta/padrao";
import { Retorno, type Estado } from "./Retorno";

export function FormGeral({ inicial, editavel }: { inicial: Geral; editavel: boolean }) {
  const [g, setG] = useState(inicial);
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });
  const router = useRouter();
  const mudar = <K extends keyof Geral>(k: K, v: Geral[K]) => {
    setG((x) => ({ ...x, [k]: v }));
    if (estado.tipo !== "indo") setEstado({ tipo: "parado" });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado({ tipo: "indo" });
    const r = await salvarGeral(g);
    if (!r.ok) return setEstado({ tipo: "erro", erro: r.erro });
    setEstado({ tipo: "ok" });
    router.refresh();
  };

  return (
    <form className="pn-cartao" onSubmit={salvar}>
      <h2>Geral</h2>
      <fieldset className="aj-campos" disabled={!editavel}>
        <div className="pn-grade pn-grade--3">
          <label className="campo">
            <span>WhatsApp da SKY</span>
            <input className="entrada" inputMode="numeric" value={g.whatsapp} onChange={(e) => mudar("whatsapp", e.target.value.replace(/\D/g, ""))} required />
            <small>Só números, com 55 e DDD. Ex.: 5579999662758</small>
          </label>
          <label className="campo">
            <span>Sinal padrão (%)</span>
            <input className="entrada" type="number" min={0} max={100} step={1} value={g.sinalPercentual} onChange={(e) => mudar("sinalPercentual", Number(e.target.value))} required />
          </label>
          <label className="campo">
            <span>Validade padrão (dias)</span>
            <input className="entrada" type="number" min={1} max={365} step={1} value={g.validadeDias} onChange={(e) => mudar("validadeDias", Number(e.target.value))} required />
          </label>
          <label className="campo pn-col-todo">
            <span>Forma de pagamento padrão</span>
            <input className="entrada" value={g.formaPagamento} maxLength={120} onChange={(e) => mudar("formaPagamento", e.target.value)} required />
          </label>
          <label className="campo pn-col-todo">
            <span>Condições de pagamento padrão</span>
            <textarea className="entrada" value={g.condicoesPagamento} maxLength={1500} onChange={(e) => mudar("condicoesPagamento", e.target.value)} />
          </label>
          <label className="campo pn-col-todo">
            <span>E-mail para aviso de aceite</span>
            <input className="entrada" type="text" inputMode="email" value={g.emailAvisos} placeholder="nome@exemplo.com, outro@exemplo.com" onChange={(e) => mudar("emailAvisos", e.target.value)} />
            <small>Separe mais de um com vírgula. O e-mail só sai se o servidor tiver a chave do Resend (RESEND_API_KEY). O aviso no painel sai sempre.</small>
          </label>
        </div>
      </fieldset>
      {editavel ? (
        <div className="aj-rodape">
          <Retorno estado={estado} />
          <button className="botao botao--magenta" type="submit" disabled={estado.tipo === "indo"}>
            {estado.tipo === "indo" ? "Salvando..." : "Salvar geral"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
