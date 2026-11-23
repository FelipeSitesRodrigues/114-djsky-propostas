// Aparece na hora do clique, enquanto o servidor monta a tela: o painel responde sem esperar o
// banco (antes o clique parecia não ter pegado).
export default function Carregando() {
  return (
    <div className="pn-carregando" aria-busy="true" aria-label="Carregando">
      <div className="pn-carregando__topo"><span /><span /></div>
      <div className="pn-carregando__grade"><span /><span /><span /><span /></div>
      <div className="pn-carregando__bloco" />
      <div className="pn-carregando__bloco pn-carregando__bloco--baixo" />
    </div>
  );
}
