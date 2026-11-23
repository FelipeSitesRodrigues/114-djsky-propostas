"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { hojeISO } from "@/lib/proposta/padrao";

// Seletor de data em vidro (branco e rosa), no lugar do calendário nativo do navegador.
// `min="hoje"` trava os dias passados (data do evento, vencimentos, validade).
// Controlado (value + onChange) no editor; com `name` + `defaultValue` serve em formulário GET.

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const iso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const valida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const br = (v: string) => (valida(v) ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "");

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  name?: string;
  min?: "hoje" | string;
  rotulo?: string;
  vazio?: string;
};

export function DataVidro({ value, defaultValue = "", onChange, name, min, rotulo, vazio = "dd/mm/aaaa" }: Props) {
  const [interno, setInterno] = useState(defaultValue);
  const atual = value ?? interno;
  const minimo = min === "hoje" ? hojeISO() : min && valida(min) ? min : "";
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, acima: false });
  const inicial = valida(atual) ? atual : minimo || hojeISO();
  const [vista, setVista] = useState({ a: Number(inicial.slice(0, 4)), m: Number(inicial.slice(5, 7)) - 1 });
  const [foco, setFoco] = useState(inicial);
  const caixa = useRef<HTMLDivElement>(null);
  const grade = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();

  const escolher = (v: string) => {
    if (v && minimo && v < minimo) return;
    if (value === undefined) setInterno(v);
    onChange?.(v);
    setAberto(false);
  };

  const abrir = () => {
    const base = valida(atual) ? atual : minimo || hojeISO();
    setVista({ a: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
    setFoco(base);
    posicionar();
    setAberto(true);
  };

  // o calendário vive no <body> (por cima de tudo) e acompanha o campo na rolagem
  const posicionar = () => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    const larg = Math.min(304, window.innerWidth - 32);
    const alt = 380;
    const left = Math.max(16, Math.min(r.left, window.innerWidth - larg - 16));
    const acima = r.bottom + 8 + alt > window.innerHeight && r.top - 8 - alt > 0;
    setPos({ top: acima ? r.top - 8 : r.bottom + 8, left, acima });
  };

  // fecha clicando fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!caixa.current?.contains(alvo) && !pop.current?.contains(alvo)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto]);

  // o dia em foco recebe o foco do teclado
  useEffect(() => {
    if (aberto) grade.current?.querySelector<HTMLButtonElement>(`[data-dia="${foco}"]`)?.focus();
  }, [aberto, foco, vista]);

  const primeiroDia = new Date(Date.UTC(vista.a, vista.m, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(vista.a, vista.m + 1, 0)).getUTCDate();
  const celulas: (number | null)[] = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);
  const hoje = hojeISO();
  const podeVoltar = !minimo || iso(vista.a, vista.m, 1) > minimo.slice(0, 8) + "01";

  const mudarMes = (passo: number) => {
    const d = new Date(Date.UTC(vista.a, vista.m + passo, 1));
    setVista({ a: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  const teclas = (e: KeyboardEvent) => {
    const passos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key === "Escape") { e.preventDefault(); setAberto(false); return; }
    if (!(e.key in passos)) return;
    e.preventDefault();
    const d = new Date(`${foco}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + passos[e.key]);
    const novo = d.toISOString().slice(0, 10);
    if (minimo && novo < minimo) return;
    setFoco(novo);
    setVista({ a: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  return (
    <div className="dv" ref={caixa}>
      {name && <input type="hidden" name={name} value={atual} />}
      <button
        type="button"
        className={`entrada dv-campo ${aberto ? "dv-campo--aberto" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={rotulo ? `${rotulo}: ${br(atual) || "sem data"}` : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
      >
        <span className={atual ? "" : "dv-vazio"}>{br(atual) || vazio}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
      </button>

      {aberto && createPortal(
        <div ref={pop} className={`dv-pop ${pos.acima ? "dv-pop--acima" : ""}`} style={{ top: pos.top, left: pos.left }} id={id} role="dialog" aria-label="Escolher data" onKeyDown={teclas}>
          <div className="dv-topo">
            <button type="button" className="dv-seta" onClick={() => mudarMes(-1)} disabled={!podeVoltar} aria-label="Mês anterior">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <strong aria-live="polite">{MESES[vista.m]} <span>{vista.a}</span></strong>
            <button type="button" className="dv-seta" onClick={() => mudarMes(1)} aria-label="Próximo mês">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
          <div className="dv-semana" aria-hidden="true">{SEMANA.map((s, i) => <span key={i}>{s}</span>)}</div>
          <div className="dv-grade" ref={grade} role="grid">
            {celulas.map((d, i) => {
              if (!d) return <span key={i} />;
              const v = iso(vista.a, vista.m, d);
              const bloqueado = !!minimo && v < minimo;
              return (
                <button
                  key={i}
                  type="button"
                  data-dia={v}
                  className={`dv-dia ${v === atual ? "dv-dia--sel" : ""} ${v === hoje ? "dv-dia--hoje" : ""}`}
                  disabled={bloqueado}
                  tabIndex={v === foco ? 0 : -1}
                  aria-pressed={v === atual}
                  aria-label={`${d} de ${MESES[vista.m]} de ${vista.a}${bloqueado ? ", indisponível" : ""}`}
                  onClick={() => escolher(v)}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="dv-base">
            <button type="button" onClick={() => escolher("")}>Limpar</button>
            <button type="button" className="dv-hoje" onClick={() => escolher(hoje)} disabled={!!minimo && hoje < minimo}>Hoje</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
