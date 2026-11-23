"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/navegador";

// Chega aqui pelo link do e-mail de "Esqueci a senha" (o Supabase já abre a sessão pelo link)
export default function NovaSenha() {
  const [senha, setSenha] = useState("");
  const [repete, setRepete] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);
  const router = useRouter();

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return setErro("Use pelo menos 8 caracteres.");
    if (senha !== repete) return setErro("As duas senhas não são iguais.");
    setIndo(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    setIndo(false);
    if (error) return setErro("O link venceu ou já foi usado. Peça um novo em \"Esqueci a senha\".");
    router.replace("/painel");
    router.refresh();
  };

  return (
    <main className="pn-entrar">
      <img className="pn-entrar__fundo" src="/img/palco-panorama-1400.webp" alt="" />
      <form className="pn-entrar__caixa" onSubmit={salvar}>
        <img src="/img/logo-branco-600.webp" alt="SKY" width={96} height={48} />
        <h1>Nova senha</h1>
        <label className="campo">
          <span>Senha nova</span>
          <input className="entrada" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        <label className="campo">
          <span>Repita a senha</span>
          <input className="entrada" type="password" autoComplete="new-password" value={repete} onChange={(e) => setRepete(e.target.value)} />
        </label>
        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
        <button className="botao botao--magenta botao--bloco" disabled={indo}>{indo ? <span className="girando" /> : "Salvar e entrar"}</button>
      </form>
    </main>
  );
}
