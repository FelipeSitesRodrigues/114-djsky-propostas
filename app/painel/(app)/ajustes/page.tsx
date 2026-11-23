import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/painel/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { configuracoes } from "@/lib/dados";
import { FormGeral } from "@/components/painel/ajustes/FormGeral";
import { FormRegras } from "@/components/painel/ajustes/FormRegras";
import { FormApresentacoes } from "@/components/painel/ajustes/FormApresentacoes";
import { Usuarios, type PerfilLinha } from "@/components/painel/ajustes/Usuarios";
import "./ajustes.css";

export const metadata: Metadata = { title: "Ajustes" };

export default async function PaginaAjustes() {
  const u = await exigirUsuario();
  const admin = u.papel === "admin";
  const [{ geral, regras, apresentacoes }, perfis] = await Promise.all([
    configuracoes(),
    admin
      ? supabaseAdmin().from("perfis").select("user_id, email, nome, papel, ativo").order("ativo", { ascending: false }).order("nome").then((r) => (r.data ?? []) as PerfilLinha[])
      : Promise.resolve([] as PerfilLinha[]),
  ]);

  return (
    <>
      <header className="pn-topo">
        <div>
          <h1>Ajustes</h1>
          <p>{admin ? "Padrões usados em toda proposta nova." : "Padrões usados em toda proposta nova. Só um administrador pode mudar."}</p>
        </div>
      </header>

      <div className="aj">
        <FormGeral inicial={geral} editavel={admin} />
        <FormRegras inicial={regras} editavel={admin} />
        <FormApresentacoes inicial={apresentacoes} editavel={admin} />
        {admin ? <Usuarios perfis={perfis} euId={u.id} /> : null}
      </div>
    </>
  );
}
