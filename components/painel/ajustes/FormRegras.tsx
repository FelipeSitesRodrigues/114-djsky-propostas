"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarRegras } from "@/app/painel/acoes/ajustes";
import type { RegraDesconto } from "@/lib/proposta/padrao";
import { Retorno, type Estado } from "./Retorno";

type Linha = { chave: number; nome: string; percentual: string };

const linha = (chave: number, r?: RegraDesconto): Linha => ({ chave, nome: r?.nome ?? "", percentual: r ? String(r.percentual).replace(".", ",") : "" });

export function FormRegras({ inicial, editavel }: { inicial: RegraDesconto[]; editavel: boolean }) {
  const [linhas, setLinhas] = useState<Linha[]>(() => inicial.map((r, i) => linha(i, r)));
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });
  const router = useRouter();
  const tocar = () => estado.tipo !== "indo" && setEstado({ tipo: "parado" });
  const mudar = (chave: number, campo: "nome" | "percentual", v: string) => {
    setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: v } : l)));
    tocar();
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado({ tipo: "indo" });
    const regras = linhas
      .filter((l) => l.nome.trim() || l.percentual.trim())
      .map((l) => ({ nome: l.nome, percentual: Number(l.percentual.replace(",", ".")) }));
    const r = await salvarRegras(regras);
    if (!r.ok) return setEstado({ tipo: "erro", erro: r.erro });
    setEstado({ tipo: "ok" });
    router.refresh();
  };

  return (
    <form className="pn-cartao" onSubmit={salvar}>
      <h2>Regras de desconto</h2>
      <p className="aj-ajuda">Atalhos que aparecem no editor da proposta. O percentual entra no campo de desconto com um clique.</p>
      <fieldset className="aj-campos" disabled={!editavel}>
        {linhas.length ? (
          <ul className="aj-regras">
            {linhas.map((l) => (
              <li key={l.chave} className="aj-regra">
                <label className="campo">
                  <span className="sr-only">Nome da regra</span>
                  <input className="entrada" value={l.nome} maxLength={60} placeholder="Ex.: Parceria" onChange={(e) => mudar(l.chave, "nome", e.target.value)} />
                </label>
                <label className="campo aj-regra__pct">
                  <span className="sr-only">Percentual</span>
                  <input className="entrada" inputMode="decimal" value={l.percentual} placeholder="10" onChange={(e) => mudar(l.chave, "percentual", e.target.value.replace(/[^\d,.]/g, ""))} />
                  <b aria-hidden="true">%</b>
                </label>
                {editavel ? (
                  <button
                    type="button"
                    className="pn-icone-btn"
                    aria-label={`Remover ${l.nome || "regra"}`}
                    onClick={() => {
                      setLinhas((ls) => ls.filter((x) => x.chave !== l.chave));
                      tocar();
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="pn-vazio">Nenhuma regra cadastrada.</p>
        )}
      </fieldset>
      {editavel ? (
        <div className="aj-rodape">
          <button
            type="button"
            className="botao botao--sm"
            onClick={() => {
              setLinhas((ls) => [...ls, linha(Date.now())]);
              tocar();
            }}
          >
            Adicionar regra
          </button>
          <Retorno estado={estado} />
          <button className="botao botao--magenta" type="submit" disabled={estado.tipo === "indo"}>
            {estado.tipo === "indo" ? "Salvando..." : "Salvar regras"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
