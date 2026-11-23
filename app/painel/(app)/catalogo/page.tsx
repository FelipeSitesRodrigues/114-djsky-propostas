import { exigirUsuario } from "@/lib/painel/sessao";
import { pacotes, servicos } from "@/lib/dados";
import { Servicos } from "@/components/painel/catalogo/Servicos";
import { Pacotes } from "@/components/painel/catalogo/Pacotes";
import "./catalogo.css";

export const metadata = { title: "Catálogo" };

export default async function Catalogo() {
  await exigirUsuario();
  const [listaServicos, listaPacotes] = await Promise.all([servicos(), pacotes()]);
  return (
    <>
      <header className="pn-topo">
        <div>
          <h1>Catálogo e pacotes</h1>
          <p>Serviços com preço e duração padrão, e pacotes prontos pra montar a proposta mais rápido.</p>
        </div>
      </header>
      <Servicos servicos={listaServicos} />
      <Pacotes pacotes={listaPacotes} servicos={listaServicos} />
    </>
  );
}
