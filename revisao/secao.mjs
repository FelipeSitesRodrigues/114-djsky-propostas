// Print de uma seção rolando até ela (sem o clip por seletor, que mexe na viewport).
//   node revisao/secao.mjs /exemplo "#investimento" nome 1440,390
import puppeteer from 'puppeteer-core';
const [caminho, sel, nome, larg = '1440,390'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
for (const w of larg.split(',').map(Number)) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w < 768 ? 844 : 900, isMobile: w < 768, hasTouch: w < 768 });
  await p.goto(`http://localhost:3416${caminho}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'start' }), sel);
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({ path: `revisao/${nome}-${w}.png` });
  console.log(w, await p.evaluate(() => getComputedStyle(document.querySelector('.pp-preco')).backdropFilter));
  await p.close();
}
await b.close();
