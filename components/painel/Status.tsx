import { STATUS } from "@/lib/proposta/tipos";

export function rotuloStatus(s: string) {
  return STATUS.find(([k]) => k === s)?.[1] ?? s;
}

export function Status({ s }: { s: string }) {
  return <span className={`pn-status pn-status--${s}`}>{rotuloStatus(s)}</span>;
}
