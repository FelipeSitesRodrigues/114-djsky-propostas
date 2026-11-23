"use client";
import { useState } from "react";
import { lerReais } from "@/lib/proposta/calculo";

const formatar = (c: number) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Dinheiro: digita "6000" ou "6.000,00"; guarda centavos; mostra formatado fora do foco
export function Reais({ valor, onChange, ...resto }: { valor: number; onChange: (c: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  // enquanto digita vale o texto; fora do foco, o valor formatado
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <input
      {...resto}
      className="entrada"
      inputMode="decimal"
      value={texto ?? formatar(valor)}
      onFocus={(e) => {
        setTexto(formatar(valor));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(lerReais(e.target.value));
      }}
      onBlur={() => setTexto(null)}
    />
  );
}

// Duração em horas (aceita 1,5 = 1h30); guarda minutos
export function Horas({ minutos, onChange, ...resto }: { minutos: number | null; onChange: (m: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const paraTexto = (m: number | null) => (m ? String(Math.round((m / 60) * 100) / 100).replace(".", ",") : "");
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <input
      {...resto}
      className="entrada"
      inputMode="decimal"
      placeholder="h"
      value={texto ?? paraTexto(minutos)}
      onFocus={() => setTexto(paraTexto(minutos))}
      onChange={(e) => {
        setTexto(e.target.value);
        const n = Number(e.target.value.replace(",", "."));
        onChange(e.target.value.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null);
      }}
      onBlur={() => setTexto(null)}
    />
  );
}

export function Lixeira({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button type="button" className="pn-icone-btn" onClick={onClick} aria-label={rotulo} title={rotulo}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
    </button>
  );
}
