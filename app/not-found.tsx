export default function NaoEncontrada() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 14, maxWidth: 420, justifyItems: "center" }}>
        <img src="/img/logo-branco-200.webp" alt="SKY" width={120} height={60} style={{ width: 120, height: "auto", opacity: 0.9 }} />
        <h1 style={{ fontSize: 24, textTransform: "uppercase" }}>Link não encontrado</h1>
        <p style={{ color: "var(--texto-2)" }}>Confira se o link chegou inteiro. Se a dúvida continuar, fale com a equipe SKY pelo WhatsApp.</p>
        <a className="botao botao--magenta" href="https://wa.me/5579999662758" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
      </div>
    </main>
  );
}
