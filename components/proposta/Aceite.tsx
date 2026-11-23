"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aceitarProposta } from "@/app/p/[codigo]/acoes";
import { TEXTO_DECLARACAO, validarAceite, type DadosAceite } from "@/lib/proposta/aceite";
import { formatarCpf, soDigitos, UFS } from "@/lib/proposta/cpf";

type Resumo = { numero: string; evento: string; data: string; local: string; total: string; sinal: string; saldo: string; sinalPercentual: number };
const EVENTO = "sky:aceite";

export function BotaoAceite({ rotulo, compacto = false }: { rotulo: string; compacto?: boolean }) {
  return (
    <button type="button" className={`botao botao--magenta ${compacto ? "" : "botao--grande"}`} onClick={() => window.dispatchEvent(new Event(EVENTO))}>
      {rotulo}
    </button>
  );
}

const vazio = (): DadosAceite => ({ nome: "", cpf: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", ciente: false, site: "", abertoEm: 0, chave: "" });

export function JanelaAceite({ codigo, versao, resumo, previa }: { codigo: string; versao: number; resumo: Resumo; previa: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [etapa, setEtapa] = useState<"dados" | "revisar" | "feito">("dados");
  const [d, setD] = useState<DadosAceite>(vazio);
  const [erros, setErros] = useState<Partial<Record<keyof DadosAceite, string>>>({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const abrir = () => {
      setD((x) => (x.chave ? x : { ...x, abertoEm: Date.now(), chave: crypto.randomUUID() }));
      setErro("");
      ref.current?.showModal();
    };
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  const muda = (k: keyof DadosAceite, v: string | boolean) => {
    setD((x) => ({ ...x, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const buscarCep = async (cep: string) => {
    const c = soDigitos(cep);
    if (c.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`, { referrerPolicy: "no-referrer" });
      const j = await r.json();
      if (!j.erro) setD((x) => ({ ...x, logradouro: x.logradouro || j.logradouro || "", bairro: x.bairro || j.bairro || "", cidade: j.localidade || x.cidade, uf: j.uf || x.uf }));
    } catch {
      /* sem internet ou ViaCEP fora: preenche à mão */
    }
    setBuscandoCep(false);
  };

  const revisar = (e: React.FormEvent) => {
    e.preventDefault();
    const { ciente: _c, ...resto } = validarAceite({ ...d, ciente: true });
    void _c;
    setErros(resto);
    if (Object.keys(resto).length) {
      setErro("Confira os campos destacados.");
      return;
    }
    setErro("");
    setEtapa("revisar");
    ref.current?.querySelector(".pa-corpo")?.scrollTo({ top: 0 });
  };

  const confirmar = async () => {
    if (!d.ciente) {
      setErros({ ciente: "Marque a declaração para enviar." });
      return;
    }
    if (previa) {
      setErro("Pré-visualização do painel: o aceite não é enviado.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const r = await aceitarProposta(codigo, versao, d);
      if (r.ok) {
        setEtapa("feito");
        router.refresh();
      } else {
        setErro(r.erro);
        if (r.campos) {
          setErros(r.campos);
          setEtapa("dados");
        }
      }
    } catch {
      setErro("Sem conexão. Confira a internet e toque de novo em confirmar.");
    }
    setEnviando(false);
  };

  const fechar = () => ref.current?.close();
  const campo = (k: keyof DadosAceite) => ({ "aria-invalid": erros[k] ? true : undefined, "aria-describedby": erros[k] ? `erro-${k}` : undefined });
  const msg = (k: keyof DadosAceite) => (erros[k] ? <span className="erro-campo" id={`erro-${k}`}>{erros[k]}</span> : null);

  return (
    <dialog ref={ref} className="pa" aria-labelledby="pa-titulo" onClose={() => etapa === "feito" && setEtapa("feito")}>
      <div className="pa-caixa">
        <div className="pa-topo">
          <div>
            <span className="rotulo">{etapa === "dados" ? "Etapa 1 de 2" : etapa === "revisar" ? "Etapa 2 de 2" : "Pronto"}</span>
            <h2 id="pa-titulo">{etapa === "dados" ? "Dados para o contrato" : etapa === "revisar" ? "Revise e confirme" : "Aceite enviado"}</h2>
          </div>
          <button type="button" className="pa-fechar" onClick={fechar} aria-label="Fechar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="pa-corpo">
          {etapa === "dados" && (
            <form id="pa-form" className="pa-form" onSubmit={revisar} noValidate>
              <p className="pa-intro">Esses dados vão no contrato do seu evento. Eles ficam protegidos e só a equipe SKY tem acesso.</p>
              <label className="campo">
                <span>Nome completo</span>
                <input className="entrada" autoComplete="name" value={d.nome} onChange={(e) => muda("nome", e.target.value)} {...campo("nome")} />
                {msg("nome")}
              </label>
              <label className="campo">
                <span>CPF</span>
                <input className="entrada" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={d.cpf} onChange={(e) => muda("cpf", formatarCpf(e.target.value))} {...campo("cpf")} />
                {msg("cpf")}
              </label>
              <div className="pa-linha pa-linha--cep">
                <label className="campo">
                  <span>CEP</span>
                  <input
                    className="entrada"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    value={d.cep}
                    onChange={(e) => {
                      const v = soDigitos(e.target.value).slice(0, 8);
                      muda("cep", v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v);
                      if (v.length === 8) buscarCep(v);
                    }}
                    {...campo("cep")}
                  />
                  {msg("cep")}
                </label>
                {buscandoCep && <span className="pa-buscando"><span className="girando" /> buscando endereço</span>}
              </div>
              <label className="campo">
                <span>Rua / logradouro</span>
                <input className="entrada" autoComplete="address-line1" value={d.logradouro} onChange={(e) => muda("logradouro", e.target.value)} {...campo("logradouro")} />
                {msg("logradouro")}
              </label>
              <div className="pa-linha">
                <label className="campo">
                  <span>Número</span>
                  <input className="entrada" value={d.numero} onChange={(e) => muda("numero", e.target.value)} {...campo("numero")} />
                  {msg("numero")}
                </label>
                <label className="campo">
                  <span>Complemento <small>(opcional)</small></span>
                  <input className="entrada" autoComplete="address-line2" value={d.complemento} onChange={(e) => muda("complemento", e.target.value)} />
                </label>
              </div>
              <label className="campo">
                <span>Bairro</span>
                <input className="entrada" value={d.bairro} onChange={(e) => muda("bairro", e.target.value)} {...campo("bairro")} />
                {msg("bairro")}
              </label>
              <div className="pa-linha pa-linha--cidade">
                <label className="campo">
                  <span>Cidade</span>
                  <input className="entrada" autoComplete="address-level2" value={d.cidade} onChange={(e) => muda("cidade", e.target.value)} {...campo("cidade")} />
                  {msg("cidade")}
                </label>
                <label className="campo">
                  <span>Estado</span>
                  <select className="entrada" value={d.uf} onChange={(e) => muda("uf", e.target.value)} {...campo("uf")}>
                    <option value="">UF</option>
                    {UFS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  {msg("uf")}
                </label>
              </div>
              {/* campo isca: fica fora da tela; robô preenche, gente não */}
              <label className="pa-isca" aria-hidden="true">
                Site <input tabIndex={-1} autoComplete="off" value={d.site} onChange={(e) => muda("site", e.target.value)} />
              </label>
            </form>
          )}

          {etapa === "revisar" && (
            <div className="pa-revisao">
              <dl className="pa-resumo">
                <div><dt>Proposta</dt><dd>nº {resumo.numero} · {resumo.evento}</dd></div>
                {resumo.data && <div><dt>Data</dt><dd>{resumo.data}</dd></div>}
                {resumo.local && <div><dt>Local</dt><dd>{resumo.local}</dd></div>}
                <div><dt>Investimento</dt><dd><b>{resumo.total}</b> · sinal {resumo.sinal} ({resumo.sinalPercentual}%) e saldo {resumo.saldo}</dd></div>
              </dl>
              <dl className="pa-resumo pa-resumo--dados">
                <div><dt>Nome</dt><dd>{d.nome}</dd></div>
                <div><dt>CPF</dt><dd>{d.cpf}</dd></div>
                <div><dt>Endereço</dt><dd>{d.logradouro}, {d.numero}{d.complemento ? `, ${d.complemento}` : ""}<br />{d.bairro}, {d.cidade}/{d.uf}<br />CEP {d.cep}</dd></div>
              </dl>
              <button type="button" className="botao--texto botao" onClick={() => setEtapa("dados")}>Corrigir dados</button>
              <label className={`pa-ciente ${erros.ciente ? "pa-ciente--erro" : ""}`}>
                <input type="checkbox" checked={d.ciente} onChange={(e) => muda("ciente", e.target.checked)} />
                <span>{TEXTO_DECLARACAO}</span>
              </label>
              {msg("ciente")}
              <p className="pa-privacidade">
                <b>Privacidade.</b> CPF e endereço são usados só para o contrato deste evento, ficam guardados com criptografia e só a equipe autorizada da SKY tem acesso. Você pode pedir a correção ou a exclusão dos seus dados pelo WhatsApp da SKY, conforme a LGPD.
              </p>
            </div>
          )}

          {etapa === "feito" && (
            <div className="pa-feito">
              <div className="pa-feito__icone" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17l9-10" /></svg>
              </div>
              <p><b>Recebemos o seu aceite.</b> A equipe SKY vai preparar o contrato e falar com você pelo WhatsApp.</p>
              <p className="pa-privacidade">O aceite registra a sua escolha desta proposta (nº {resumo.numero}, {resumo.total}). Ele não substitui a assinatura do contrato.</p>
            </div>
          )}
          {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
        </div>

        <div className="pa-base">
          {etapa === "dados" && (
            <button type="submit" form="pa-form" className="botao botao--magenta botao--bloco botao--grande">Revisar dados</button>
          )}
          {etapa === "revisar" && (
            <button type="button" className="botao botao--magenta botao--bloco botao--grande" onClick={confirmar} disabled={enviando}>
              {enviando ? <span className="girando" /> : "Confirmar aceite e enviar dados"}
            </button>
          )}
          {etapa === "feito" && (
            <button type="button" className="botao botao--bloco botao--grande" onClick={fechar}>Fechar</button>
          )}
        </div>
      </div>
    </dialog>
  );
}
