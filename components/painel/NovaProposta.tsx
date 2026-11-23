"use client";
import { useRef, useState } from "react";
import { criarProposta } from "@/app/painel/acoes/propostas";
import { TIPOS_EVENTO, type TipoEvento } from "@/lib/proposta/tipos";

// Botão "Nova proposta": escolhe o tipo de evento (que traz o texto e a capa do modelo) e cria
export function NovaProposta({ rotulo = "Nova proposta" }: { rotulo?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [indo, setIndo] = useState<TipoEvento | null>(null);
  return (
    <>
      <button type="button" className="botao botao--magenta" onClick={() => ref.current?.showModal()}>+ {rotulo}</button>
      <dialog ref={ref} className="pn-janela">
        <div>
          <h2>Tipo de evento</h2>
          <p style={{ color: "var(--texto-2)", fontSize: 14 }}>O tipo traz o texto de apresentação e a capa do modelo. Dá pra mudar tudo depois.</p>
          <div className="pn-grade pn-grade--2">
            {TIPOS_EVENTO.map(([k, nome]) => (
              <button
                key={k}
                type="button"
                className="botao"
                disabled={indo !== null}
                onClick={async () => {
                  setIndo(k);
                  await criarProposta(k);
                }}
              >
                {indo === k ? <span className="girando" /> : nome}
              </button>
            ))}
          </div>
          <button type="button" className="botao botao--texto" style={{ justifySelf: "center" }} onClick={() => ref.current?.close()}>Cancelar</button>
        </div>
      </dialog>
    </>
  );
}
