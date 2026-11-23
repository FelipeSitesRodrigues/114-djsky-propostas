export default function Proibido() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <h1 style={{ fontSize: 26, textTransform: "uppercase" }}>Sem acesso</h1>
        <p style={{ color: "var(--texto-2)" }}>Seu login não tem permissão pra essa parte do painel. Fale com o responsável da SKY.</p>
        <a className="botao" href="/painel">Voltar ao painel</a>
      </div>
    </main>
  );
}
