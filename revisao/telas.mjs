// Print logado de cada tela do painel em 1440 e 390, com erro de página e estouro de largura.
//   node --env-file=.env.senha.local revisao/telas.mjs
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:3416';
const TELAS = ['/painel', '/painel/propostas', '/painel/catalogo', '/painel/parceiros', '/painel/relatorios', '/painel/avisos', '/painel/ajustes', '/painel/aceitas'];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const p = await b.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(`${p.url()}: ${e.message}`));
p.on('console', (m) => m.type() === 'error' && erros.push(`${p.url()}: ${m.text()}`));
await p.setViewport({ width: 1440, height: 900 });
await p.goto(`${URL}/painel/entrar`, { waitUntil: 'networkidle2' });
await p.type('input[type=email]', process.env.PAINEL_EMAIL);
await p.type('input[type=password]', process.env.PAINEL_SENHA);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), p.click('button.botao--magenta')]);
await new Promise((r) => setTimeout(r, 1500));
const extra = await p.evaluate(() => document.querySelector('.pn-tabela a[href^="/painel/propostas/"]')?.getAttribute('href'));
for (const w of [1440, 390]) {
  await p.setViewport({ width: w, height: w < 768 ? 844 : 900, isMobile: w < 768, hasTouch: w < 768 });
  for (const t of [...TELAS, extra].filter(Boolean)) {
    await p.goto(`${URL}${t}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    const nome = t.replace(/\//g, '_').replace(/^_painel_?/, '') || 'inicio';
    await p.screenshot({ path: `revisao/tela-${nome.slice(0, 30)}-${w}.png`, fullPage: true });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) console.log('ESTOURO', t, w, sw);
  }
}
console.log(erros.length ? erros : 'sem erros de página');
await b.close();
