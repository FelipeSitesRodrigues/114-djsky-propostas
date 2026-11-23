"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [indo, setIndo] = useState(false);
  const router = useRouter();

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setOk("");
    setIndo(true);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) {
      setIndo(false);
      setErro(/invalid/i.test(error.message) ? "E-mail ou senha não conferem." : "Não deu pra entrar agora. Tente de novo.");
      return;
    }
    const volta = new URLSearchParams(window.location.search).get("volta");
    router.replace(volta && volta.startsWith("/painel") && !volta.startsWith("//") ? volta : "/painel");
    router.refresh();
  };

  const esqueci = async () => {
    setErro("");
    setOk("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErro('Escreva seu e-mail acima e toque de novo em "Esqueci a senha".');
      return;
    }
    await supabaseNavegador().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/painel/senha` });
    setOk("Se esse e-mail tiver acesso, chega um link pra criar uma senha nova.");
  };

  return (
    <main className="pn-entrar">
      <img className="pn-entrar__fundo" src="/img/palco-panorama-1400.webp" alt="" />
      <form className="pn-entrar__caixa" onSubmit={entrar}>
        <img src="/img/logo-branco-600.webp" alt="SKY" width={96} height={48} />
        <div>
          <h1>Painel de propostas</h1>
          <p>Propostas, aceites e dados para contrato.</p>
        </div>
        <label className="campo">
          <span>E-mail</span>
          <input className="entrada" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input className="entrada" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
        {ok && <div className="aviso aviso--ok" role="status">{ok}</div>}
        <button className="botao botao--magenta botao--bloco" disabled={indo}>{indo ? <span className="girando" /> : "Entrar"}</button>
        <button type="button" className="botao botao--texto" style={{ justifySelf: "center" }} onClick={esqueci}>Esqueci a senha</button>
      </form>
    </main>
  );
}
