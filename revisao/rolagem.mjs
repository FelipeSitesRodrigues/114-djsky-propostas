// Print tela a tela, rolando de verdade (as entradas da proposta dependem da rolagem; o print de
// página inteira mostra o que ainda não entrou como invisível).
//   node revisao/rolagem.mjs /exemplo nome largura
import puppeteer from 'puppeteer-core';

const [caminho = '/exemplo', nome = 'rola', larg = '1440'] = process.argv.slice(2);
const w = Number(larg);
const h = w < 768 ? 844 : 900;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const p = await b.newPage();
await p.setViewport({ width: w, height: h, isMobile: w < 768, hasTouch: w < 768 });
await p.goto(`http://localhost:3416${caminho}`, { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise((r) => setTimeout(r, 1000));
const total = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < total; y += h - 80) {
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await new Promise((r) => setTimeout(r, 700));
  await p.screenshot({ path: `revisao/${nome}-${w}-${String(i++).padStart(2, '0')}.png` });
}
console.log(i, 'telas', total);
await b.close();
