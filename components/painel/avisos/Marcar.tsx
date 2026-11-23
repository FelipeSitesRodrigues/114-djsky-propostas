"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { marcarLida, marcarTodasLidas } from "@/app/painel/acoes/avisos";

function useMarcar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
  const router = useRouter();
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState("");
  const rodar = async () => {
    setErro("");
    setIndo(true);
    const r = await acao();
    setIndo(false);
    if (!r.ok) return setErro(r.erro);
    router.refresh();
  };
  return { indo, erro, rodar };
}

export function MarcarLida({ id }: { id: number }) {
  const { indo, erro, rodar } = useMarcar(() => marcarLida(id));
  return (
    <>
      <button type="button" className="botao botao--sm" disabled={indo} onClick={rodar}>
        {indo ? "Marcando..." : "Marcar como lida"}
      </button>
      {erro ? <p className="aviso aviso--erro av-erro" role="alert">{erro}</p> : null}
    </>
  );
}

export function MarcarTodas() {
  const { indo, erro, rodar } = useMarcar(marcarTodasLidas);
  return (
    <>
      {erro ? <p className="aviso aviso--erro" role="alert">{erro}</p> : null}
      <button type="button" className="botao botao--magenta" disabled={indo} onClick={rodar}>
        {indo ? "Marcando..." : "Marcar todas como lidas"}
      </button>
    </>
  );
}
