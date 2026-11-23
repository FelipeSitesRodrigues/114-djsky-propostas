"use client";
import { registrarPedidoAlteracao } from "@/app/p/[codigo]/acoes";

// Abre o WhatsApp com a mensagem pronta e avisa o painel (status "em negociação")
export function PedirAlteracao({ codigo, href, previa, texto, destaque = false }: { codigo: string; href: string; previa: boolean; texto: string; destaque?: boolean }) {
  return (
    <a
      className={`botao botao--grande ${destaque ? "botao--magenta" : ""}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (!previa) registrarPedidoAlteracao(codigo).catch(() => {});
      }}
    >
      <svg className="i" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.4-5.1-4.6-.2-.2-1.2-1.6-1.2-3.1 0-1.4.8-2.2 1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.8-.1 1.5Z"/></svg>
      {texto}
    </a>
  );
}
