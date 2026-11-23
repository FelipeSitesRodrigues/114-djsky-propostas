import type { Bloco, Evento, Item } from "./tipos";

// Horários de festa passam da meia-noite: tudo vira minuto contado a partir do início do evento
// (ou do 1º bloco). Um horário menor que a referência é do dia seguinte.

export function minutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export function duracaoTexto(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// "22:00" → "22h", "19:30" → "19h30"
export function hora(hhmm: string) {
  const m = minutos(hhmm);
  if (m === null) return hhmm;
  const h = Math.floor(m / 60);
  const mi = m % 60;
  return mi ? `${String(h).padStart(2, "0")}h${String(mi).padStart(2, "0")}` : `${String(h).padStart(2, "0")}h`;
}

type Faixa = { bloco: Bloco; ini: number; fim: number };

function faixas(blocos: Bloco[], ref: number | null): Faixa[] {
  const validos = blocos.filter((b) => minutos(b.inicio) !== null && minutos(b.fim) !== null);
  if (!validos.length) return [];
  const r = ref ?? (minutos(validos[0].inicio) as number);
  return validos.map((b) => {
    let ini = minutos(b.inicio) as number;
    let fim = minutos(b.fim) as number;
    if (ini < r) ini += 1440;
    while (fim <= ini) fim += 1440;
    return { bloco: b, ini, fim };
  });
}

export function duracaoBloco(b: Pick<Bloco, "inicio" | "fim">) {
  const i = minutos(b.inicio);
  const f = minutos(b.fim);
  if (i === null || f === null) return null;
  return f > i ? f - i : f + 1440 - i;
}

export type Alerta = { blocoId: string | null; texto: string };

export function alertasCronograma(blocos: Bloco[], itens: Item[], evento: Pick<Evento, "inicio" | "termino">): Alerta[] {
  const alertas: Alerta[] = [];
  for (const b of blocos) {
    if (minutos(b.inicio) === null || minutos(b.fim) === null) alertas.push({ blocoId: b.id, texto: `"${b.titulo || "Bloco"}" está sem horário de início ou de fim.` });
  }
  const refEvento = minutos(evento.inicio);
  const fx = faixas(blocos, refEvento).sort((a, b) => a.ini - b.ini);
  for (let i = 1; i < fx.length; i++) {
    const a = fx[i - 1];
    const b = fx[i];
    if (b.ini < a.fim) alertas.push({ blocoId: b.bloco.id, texto: `"${b.bloco.titulo}" começa às ${hora(b.bloco.inicio)}, antes de "${a.bloco.titulo}" terminar (${hora(a.bloco.fim)}).` });
  }
  if (refEvento !== null && minutos(evento.termino) !== null) {
    let fimEvento = minutos(evento.termino) as number;
    while (fimEvento <= refEvento) fimEvento += 1440;
    for (const f of fx) {
      if (f.ini < refEvento || f.fim > fimEvento) alertas.push({ blocoId: f.bloco.id, texto: `"${f.bloco.titulo}" (${hora(f.bloco.inicio)} às ${hora(f.bloco.fim)}) fica fora do horário do evento (${hora(evento.inicio)} às ${hora(evento.termino)}).` });
    }
  }
  for (const f of fx) {
    const item = itens.find((i) => i.id === f.bloco.itemId);
    if (!item) continue;
    const dur = f.fim - f.ini;
    if (item.duracaoMaxMin && dur > item.duracaoMaxMin) alertas.push({ blocoId: f.bloco.id, texto: `"${f.bloco.titulo}" tem ${duracaoTexto(dur)}, mais que o máximo de ${item.nome} (${duracaoTexto(item.duracaoMaxMin)}).` });
    else if (item.duracaoMin && dur !== item.duracaoMin) alertas.push({ blocoId: f.bloco.id, texto: `"${f.bloco.titulo}" tem ${duracaoTexto(dur)}, mas ${item.nome} foi contratado com ${duracaoTexto(item.duracaoMin)}.` });
  }
  return alertas;
}

export function ordenarBlocos(blocos: Bloco[], inicioEvento: string) {
  const fx = faixas(blocos, minutos(inicioEvento));
  const ordem = new Map(fx.map((f) => [f.bloco.id, f.ini]));
  return [...blocos].sort((a, b) => (ordem.get(a.id) ?? 1e9) - (ordem.get(b.id) ?? 1e9));
}
