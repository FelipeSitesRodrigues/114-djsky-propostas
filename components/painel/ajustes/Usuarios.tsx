"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { alterarUsuario, criarUsuario } from "@/app/painel/acoes/usuarios";

export type PerfilLinha = { user_id: string; email: string; nome: string; papel: "admin" | "comercial"; ativo: boolean };

const NOVO = { nome: "", email: "", senha: "", papel: "comercial" as PerfilLinha["papel"] };

export function Usuarios({ perfis, euId }: { perfis: PerfilLinha[]; euId: string }) {
  const router = useRouter();
  const janela = useRef<HTMLDialogElement>(null);
  const [novo, setNovo] = useState(NOVO);
  const [erroNovo, setErroNovo] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [mexendo, setMexendo] = useState<string | null>(null);

  const abrir = () => {
    setNovo(NOVO);
    setErroNovo("");
    janela.current?.showModal();
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novo.senha.length < 8) return setErroNovo("A senha inicial precisa de pelo menos 8 caracteres.");
    setCriando(true);
    const r = await criarUsuario(novo);
    setCriando(false);
    if (!r.ok) return setErroNovo(r.erro);
    setNovo(NOVO);
    janela.current?.close();
    router.refresh();
  };

  const alterar = async (id: string, mudanca: { papel?: PerfilLinha["papel"]; ativo?: boolean }) => {
    setErro("");
    setMexendo(id);
    const r = await alterarUsuario(id, mudanca);
    setMexendo(null);
    if (!r.ok) return setErro(r.erro);
    router.refresh();
  };

  return (
    <section className="pn-cartao" aria-labelledby="aj-usuarios">
      <h2 id="aj-usuarios">
        Usuários
        <button type="button" className="botao botao--sm botao--magenta" onClick={abrir}>
          Novo usuário
        </button>
      </h2>
      <p className="aj-ajuda">
        <b>Administrador</b> vê CPF e endereço dos clientes, define valor final manual e cuida dos usuários. <b>Comercial</b> cria e envia propostas.
      </p>
      {erro ? <p className="aviso aviso--erro" role="alert">{erro}</p> : null}

      {perfis.length ? (
        <ul className="aj-usuarios">
          {perfis.map((p) => {
            const eu = p.user_id === euId;
            const ocupado = mexendo === p.user_id;
            return (
              <li key={p.user_id} className="aj-usuario" data-inativo={!p.ativo || undefined}>
                <div className="aj-usuario__quem">
                  <b>
                    {p.nome}
                    {eu ? <span className="aj-voce">você</span> : null}
                  </b>
                  <span className="pn-sub">{p.email}</span>
                </div>
                <label className="campo aj-usuario__papel">
                  <span className="sr-only">Papel de {p.nome}</span>
                  <select className="entrada" value={p.papel} disabled={eu || ocupado} onChange={(e) => alterar(p.user_id, { papel: e.target.value as PerfilLinha["papel"] })}>
                    <option value="admin">Administrador</option>
                    <option value="comercial">Comercial</option>
                  </select>
                </label>
                <span className={`pn-status ${p.ativo ? "aj-ativo" : "aj-inativo"}`}>{p.ativo ? "Ativo" : "Inativo"}</span>
                <button
                  type="button"
                  className={`botao botao--sm${p.ativo ? " botao--perigo" : ""}`}
                  disabled={eu || ocupado}
                  title={eu ? "Você não pode desativar a própria conta" : undefined}
                  onClick={() => alterar(p.user_id, { ativo: !p.ativo })}
                >
                  {ocupado ? "..." : p.ativo ? "Desativar" : "Reativar"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pn-vazio">Nenhum usuário.</p>
      )}

      <dialog ref={janela} className="pn-janela" aria-labelledby="aj-novo-titulo">
        <form onSubmit={criar}>
          <h2 id="aj-novo-titulo">Novo usuário</h2>
          <label className="campo">
            <span>Nome</span>
            <input className="entrada" value={novo.nome} maxLength={80} autoComplete="off" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} required />
          </label>
          <label className="campo">
            <span>E-mail</span>
            <input className="entrada" type="email" value={novo.email} maxLength={160} autoComplete="off" onChange={(e) => setNovo({ ...novo, email: e.target.value })} required />
          </label>
          <label className="campo">
            <span>Senha inicial</span>
            <input className="entrada" type="password" value={novo.senha} minLength={8} maxLength={72} autoComplete="new-password" onChange={(e) => setNovo({ ...novo, senha: e.target.value })} required />
            <small>Pelo menos 8 caracteres. Passe para a pessoa por um canal seguro; ela troca em &quot;Esqueci a senha&quot;.</small>
          </label>
          <label className="campo">
            <span>Papel</span>
            <select className="entrada" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value as PerfilLinha["papel"] })}>
              <option value="comercial">Comercial: cria e envia propostas</option>
              <option value="admin">Administrador: tudo, inclusive CPF, valor manual e usuários</option>
            </select>
          </label>
          {erroNovo ? <p className="aviso aviso--erro" role="alert">{erroNovo}</p> : null}
          <div className="pn-acoes aj-janela-acoes">
            <button type="button" className="botao" onClick={() => janela.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--magenta" disabled={criando}>
              {criando ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
