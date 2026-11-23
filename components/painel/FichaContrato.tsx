"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { abrirDadosContrato, apagarDadosPessoais, corrigirDadosContrato, registrarCopia, type DadosContrato } from "@/app/painel/acoes/contratos";
import { formatarCpf, UFS } from "@/lib/proposta/cpf";

type Props = { aceiteId: string; ehAdmin: boolean; nome: string; cpfMascarado: string; cidadeUf: string; apagado: boolean; correcoes: number; referencia: string };

const cepFmt = (c: string) => (c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
const enderecoTexto = (d: DadosContrato) => `${d.endereco.logradouro}, ${d.endereco.numero}${d.endereco.complemento ? `, ${d.endereco.complemento}` : ""}, ${d.endereco.bairro}, ${d.endereco.cidade}/${d.endereco.uf}, CEP ${cepFmt(d.endereco.cep)}`;

// Ficha interna do contrato: o CPF e o endereço só chegam ao navegador quando um administrador
// toca em "Mostrar dados", e cada abertura e cópia fica registrada no histórico.
export function FichaContrato(p: Props) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosContrato | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");
  const [abrindo, setAbrindo] = useState(false);
  const corrigirRef = useRef<HTMLDialogElement>(null);
  const apagarRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<DadosContrato | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirma, setConfirma] = useState("");

  const abrir = async () => {
    setAbrindo(true);
    setErro("");
    const r = await abrirDadosContrato(p.aceiteId);
    setAbrindo(false);
    if (r.ok) setDados(r.dados);
    else setErro(r.erro);
  };

  const copiar = async (campo: string, texto: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(campo);
    setTimeout(() => setCopiado(""), 1600);
    registrarCopia(p.aceiteId, campo);
  };

  const linha = (rotulo: string, valor: string, campo: string) => (
    <div>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
      <button type="button" className="botao botao--sm" onClick={() => copiar(campo, valor)}>{copiado === campo ? "Copiado" : "Copiar"}</button>
    </div>
  );

  const salvarCorrecao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const r = await corrigirDadosContrato(p.aceiteId, form, motivo);
    if (!r.ok) return setErro(r.erro);
    corrigirRef.current?.close();
    setDados(null);
    setMotivo("");
    router.refresh();
  };

  const apagar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apagarDadosPessoais(p.aceiteId, confirma);
    if (!r.ok) return setErro(r.erro);
    apagarRef.current?.close();
    setDados(null);
    router.refresh();
  };

  return (
    <div className="pn-cartao pn-ficha">
      <h2>
        Dados para o contrato
        {p.ehAdmin && !p.apagado && !dados && <button type="button" className="botao botao--sm botao--magenta" onClick={abrir} disabled={abrindo}>{abrindo ? <span className="girando" /> : "Mostrar dados"}</button>}
      </h2>
      {erro && <div className="aviso aviso--erro" style={{ marginBottom: 12 }}>{erro}</div>}
      {p.apagado ? (
        <p style={{ color: "var(--texto-2)" }}>Os dados pessoais deste aceite foram apagados a pedido (LGPD). Ficou só o registro de quem aceitou, quando e o valor.</p>
      ) : dados ? (
        <>
          <dl>
            {linha("Nome completo", dados.nome, "nome")}
            {linha("CPF", formatarCpf(dados.cpf), "cpf")}
            {linha("Endereço", enderecoTexto(dados), "endereco")}
            {linha("Referência", p.referencia, "referencia")}
          </dl>
          <div className="pn-acoes" style={{ marginTop: 14 }}>
            <button type="button" className="botao botao--sm botao--magenta" onClick={() => copiar("tudo", `${dados.nome}, CPF ${formatarCpf(dados.cpf)}, residente em ${enderecoTexto(dados)}.\n${p.referencia}`)}>{copiado === "tudo" ? "Copiado" : "Copiar tudo para o contrato"}</button>
            <button type="button" className="botao botao--sm" onClick={() => { setForm(structuredClone(dados)); setErro(""); corrigirRef.current?.showModal(); }}>Corrigir dados</button>
            <button type="button" className="botao botao--sm" onClick={() => setDados(null)}>Esconder</button>
          </div>
        </>
      ) : (
        <dl>
          <div><dt>Nome completo</dt><dd>{p.nome}</dd><span /></div>
          <div><dt>CPF</dt><dd className="pn-mascara">{p.cpfMascarado}</dd><span /></div>
          <div><dt>Cidade</dt><dd>{p.cidadeUf}</dd><span /></div>
          <div><dt>Referência</dt><dd>{p.referencia}</dd><span /></div>
        </dl>
      )}
      <p style={{ marginTop: 14, color: "var(--texto-2)", fontSize: 12.5 }}>
        {p.ehAdmin ? "Cada abertura e cópia fica no histórico da proposta." : "Só administradores veem CPF e endereço completos."}
        {p.correcoes ? ` Corrigido ${p.correcoes} ${p.correcoes === 1 ? "vez" : "vezes"} (registro guardado).` : ""}
      </p>
      {p.ehAdmin && !p.apagado && (
        <button type="button" className="botao botao--sm botao--perigo" style={{ marginTop: 10 }} onClick={() => { setConfirma(""); setErro(""); apagarRef.current?.showModal(); }}>Apagar dados pessoais (LGPD)</button>
      )}

      <dialog ref={corrigirRef} className="pn-janela">
        {form && (
          <form onSubmit={salvarCorrecao}>
            <h2>Corrigir dados</h2>
            <label className="campo"><span>Nome completo</span><input className="entrada" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
            <label className="campo"><span>CPF</span><input className="entrada" value={formatarCpf(form.cpf)} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></label>
            <div className="pn-grade pn-grade--2">
              <label className="campo"><span>CEP</span><input className="entrada" value={form.endereco.cep} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cep: e.target.value } })} /></label>
              <label className="campo"><span>Número</span><input className="entrada" value={form.endereco.numero} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })} /></label>
              <label className="campo pn-col-todo"><span>Logradouro</span><input className="entrada" value={form.endereco.logradouro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, logradouro: e.target.value } })} /></label>
              <label className="campo"><span>Complemento</span><input className="entrada" value={form.endereco.complemento} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, complemento: e.target.value } })} /></label>
              <label className="campo"><span>Bairro</span><input className="entrada" value={form.endereco.bairro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })} /></label>
              <label className="campo"><span>Cidade</span><input className="entrada" value={form.endereco.cidade} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })} /></label>
              <label className="campo"><span>UF</span><select className="entrada" value={form.endereco.uf} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, uf: e.target.value } })}>{UFS.map((u) => <option key={u}>{u}</option>)}</select></label>
            </div>
            <label className="campo"><span>Motivo da correção</span><input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente avisou que o número estava errado" /></label>
            {erro && <div className="aviso aviso--erro">{erro}</div>}
            <div className="pn-acoes">
              <button className="botao botao--magenta">Salvar correção</button>
              <button type="button" className="botao botao--texto" onClick={() => corrigirRef.current?.close()}>Cancelar</button>
            </div>
          </form>
        )}
      </dialog>

      <dialog ref={apagarRef} className="pn-janela">
        <form onSubmit={apagar}>
          <h2>Apagar dados pessoais</h2>
          <p style={{ color: "var(--texto)", fontSize: 14 }}>CPF, endereço e o registro de correções saem do banco para sempre. Fica só o registro do aceite (nome, data, valor). Use quando o cliente pedir ou quando o contrato já estiver arquivado em outro lugar.</p>
          <label className="campo"><span>Digite APAGAR para confirmar</span><input className="entrada" value={confirma} onChange={(e) => setConfirma(e.target.value)} /></label>
          {erro && <div className="aviso aviso--erro">{erro}</div>}
          <div className="pn-acoes">
            <button className="botao botao--perigo" disabled={confirma !== "APAGAR"}>Apagar</button>
            <button type="button" className="botao botao--texto" onClick={() => apagarRef.current?.close()}>Cancelar</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
