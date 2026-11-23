"use client";
import { useEffect, useRef } from "react";

// <dialog> nativo: abre com showModal() ao montar. Fechar (Esc, botão ou depois de salvar) chama
// onFechar, e o pai desmonta a janela. Montar com key diferente zera o formulário.
export function Janela({ titulo, larga, onFechar, children }: { titulo: string; larga?: boolean; onFechar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={larga ? "pn-janela cat-janela--larga" : "pn-janela"} aria-label={titulo} onClose={onFechar}>
      {children}
    </dialog>
  );
}

// Fecha a janela de quem chamou (botão ou formulário dentro dela)
export function fecharJanela(el: Element | null) {
  el?.closest("dialog")?.close();
}

// "" → null; "90" → 90. Inválido vira NaN pra o formulário recusar.
export function lerMinutos(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return NaN;
  return Number(t);
}
