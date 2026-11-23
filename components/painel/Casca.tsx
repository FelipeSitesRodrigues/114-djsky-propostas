"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const I = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  propostas: <><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  contrato: <><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></>,
  catalogo: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  parceiros: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.6 5.2" /></>,
  relatorios: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  avisos: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};

export function Icone({ nome }: { nome: keyof typeof I }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[nome]}
    </svg>
  );
}

type Props = { nome: string; email: string; papel: string; aguardando: number; avisos: number; children: React.ReactNode };

export function Casca({ nome, email, papel, aguardando, avisos, children }: Props) {
  const caminho = usePathname();
  const router = useRouter();
  const ativo = (href: string) => (href === "/painel" ? caminho === "/painel" : caminho.startsWith(href)) ? "page" : undefined;
  const itens: { href: string; rotulo: string; icone: keyof typeof I; cont?: number }[] = [
    { href: "/painel", rotulo: "Início", icone: "inicio" },
    { href: "/painel/propostas", rotulo: "Propostas", icone: "propostas" },
    { href: "/painel/aceitas", rotulo: "Aguardando contrato", icone: "contrato", cont: aguardando },
    { href: "/painel/catalogo", rotulo: "Catálogo e pacotes", icone: "catalogo" },
    { href: "/painel/parceiros", rotulo: "Parceiros", icone: "parceiros" },
    { href: "/painel/relatorios", rotulo: "Relatórios", icone: "relatorios" },
    { href: "/painel/avisos", rotulo: "Avisos", icone: "avisos", cont: avisos },
    { href: "/painel/ajustes", rotulo: "Ajustes", icone: "ajustes" },
  ];
  const sair = async () => {
    await supabaseNavegador().auth.signOut();
    router.replace("/painel/entrar");
    router.refresh();
  };
  const cel = itens.filter((i) => ["/painel", "/painel/propostas", "/painel/aceitas", "/painel/avisos", "/painel/ajustes"].includes(i.href));

  return (
    <div className="pn">
      <aside className="pn-lateral">
        <div className="pn-marca">
          <img src="/img/logo-branco-200.webp" alt="SKY" width={64} height={32} />
          <span>Propostas</span>
        </div>
        <nav className="pn-nav" aria-label="Painel">
          {itens.map((i) => (
            <Link key={i.href} href={i.href} aria-current={ativo(i.href)}>
              <Icone nome={i.icone} />
              {i.rotulo}
              {i.cont ? <span className="pn-cont">{i.cont}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="pn-usuario">
          <b>{nome}</b>
          <span>{email}</span>
          <span>{papel === "admin" ? "Administrador" : "Comercial"}</span>
          <button type="button" onClick={sair}>Sair</button>
        </div>
      </aside>
      <div className="pn-conteudo">{children}</div>
      <nav className="pn-menu-cel" aria-label="Painel">
        {cel.map((i) => (
          <Link key={i.href} href={i.href} aria-current={ativo(i.href)}>
            <Icone nome={i.icone} />
            {i.href === "/painel/aceitas" ? "Contratos" : i.rotulo}
            {i.cont ? <span className="pn-cont">{i.cont}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
