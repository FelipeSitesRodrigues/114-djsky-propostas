// Mede quanto cada clique no menu do painel leva até a tela nova aparecer (e até o esqueleto de
// "carregando", que é o que a pessoa vê primeiro).
//   node --env-file=.env.senha.local revisao/velocidade.mjs 3417
import puppeteer from 'puppeteer-core';

const porta = process.argv[2] ?? '3416';
const URL = porta.startsWith('http') ? porta : `http://localhost:${porta}`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const p = await b.newPage();
p.setDefaultNavigationTimeout(150000);
await p.setViewport({ width: 1440, height: 900 });
await p.goto(`${URL}/painel/entrar`, { waitUntil: 'networkidle2' });
await p.type('input[type=email]', process.env.PAINEL_EMAIL);
await p.type('input[type=password]', process.env.PAINEL_SENHA);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), p.click('button.botao--magenta')]);
await new Promise((r) => setTimeout(r, 2500));
const rotas = ['/painel/propostas', '/painel/aceitas', '/painel/catalogo', '/painel', '/painel/relatorios', '/painel/propostas'];
for (const volta of [1, 2]) {
  for (const r of rotas) {
    const t0 = Date.now();
    await p.evaluate((r) => window.__t = { r }, r);
    await p.click(`.pn-nav a[href="${r}"]`);
    let esqueleto = null;
    for (;;) {
      const st = await p.evaluate((r) => ({ url: location.pathname, carregando: !!document.querySelector('.pn-carregando'), h1: document.querySelector('.pn-conteudo h1')?.textContent }), r);
      if (esqueleto === null && (st.carregando || st.url === r)) esqueleto = Date.now() - t0;
      if (st.url === r && !st.carregando && st.h1) break;
      if (Date.now() - t0 > 60000) break;
      await new Promise((res) => setTimeout(res, 20));
    }
    console.log(`volta ${volta} ${r.padEnd(20)} resposta ${String(esqueleto).padStart(5)} ms   tela pronta ${String(Date.now() - t0).padStart(5)} ms`);
  }
}
// abrir uma proposta pela lista
await p.goto(`${URL}/painel/propostas`, { waitUntil: 'networkidle2' });
const link = await p.$('.pn-tabela a[href^="/painel/propostas/"]');
if (link) {
  const t0 = Date.now();
  await link.click();
  await p.waitForSelector('.pn-passos', { timeout: 60000 });
  console.log(`abrir proposta: ${Date.now() - t0} ms`);
}
await b.close();
