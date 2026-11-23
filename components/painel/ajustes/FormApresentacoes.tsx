"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarApresentacoes } from "@/app/painel/acoes/ajustes";
import type { Apresentacoes } from "@/lib/proposta/padrao";
import { TIPOS_EVENTO, type TipoEvento } from "@/lib/proposta/tipos";
import { FOTOS } from "@/lib/midia";
import { Retorno, type Estado } from "./Retorno";

type Ap = { titulo: string; texto: string; capa: string };

// Cada tipo de evento tem o seu modelo de abertura (título, texto e capa). Vale para as
// propostas criadas depois de salvar; as que já existem não mudam.
export function FormApresentacoes({ inicial, editavel }: { inicial: Apresentacoes; editavel: boolean }) {
  const [aps, setAps] = useState<Record<TipoEvento, Ap>>(() => {
    const r = {} as Record<TipoEvento, Ap>;
    for (const [tipo] of TIPOS_EVENTO) r[tipo] = { titulo: "", texto: "", capa: "festival", ...(inicial[tipo] ?? {}) };
    return r;
  });
  const [tipo, setTipo] = useState<TipoEvento>(TIPOS_EVENTO[0][0]);
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });
  const router = useRouter();
  const atual = aps[tipo];
  const rotulo = TIPOS_EVENTO.find(([t]) => t === tipo)?.[1] ?? "";
  const mudar = (campo: keyof Ap, v: string) => {
    setAps((x) => ({ ...x, [tipo]: { ...x[tipo], [campo]: v } }));
    if (estado.tipo !== "indo") setEstado({ tipo: "parado" });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado({ tipo: "indo" });
    const r = await salvarApresentacoes(aps);
    if (!r.ok) return setEstado({ tipo: "erro", erro: r.erro });
    setEstado({ tipo: "ok" });
    router.refresh();
  };

  return (
    <form className="pn-cartao" onSubmit={salvar}>
      <h2>Textos por tipo de evento</h2>
      <p className="aj-ajuda">Abertura que entra em toda proposta nova desse tipo. Dá para mudar em cada proposta depois.</p>

      <div className="aj-tipos" role="group" aria-label="Tipo de evento">
        {TIPOS_EVENTO.map(([t, r]) => (
          <button key={t} type="button" aria-pressed={t === tipo} onClick={() => setTipo(t)}>
            {r}
          </button>
        ))}
      </div>

      <fieldset className="aj-campos" disabled={!editavel}>
        <legend className="sr-only">{rotulo}</legend>
        <div className="pn-grade">
          <label className="campo">
            <span>Título</span>
            <input className="entrada" value={atual.titulo} maxLength={120} onChange={(e) => mudar("titulo", e.target.value)} required />
          </label>
          <label className="campo">
            <span>Texto de abertura</span>
            <textarea className="entrada" rows={4} value={atual.texto} maxLength={1500} onChange={(e) => mudar("texto", e.target.value)} />
          </label>
          <div className="campo">
            <span>Capa</span>
            <div className="pn-capas">
              {FOTOS.map((f) => (
                <button key={f.id} type="button" aria-pressed={atual.capa === f.id} title={f.rotulo} onClick={() => mudar("capa", f.id)}>
                  { }
                  <img src={f.arquivo} alt={f.rotulo} loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {editavel ? (
        <div className="aj-rodape">
          <Retorno estado={estado} />
          <button className="botao botao--magenta" type="submit" disabled={estado.tipo === "indo"}>
            {estado.tipo === "indo" ? "Salvando..." : "Salvar textos"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
