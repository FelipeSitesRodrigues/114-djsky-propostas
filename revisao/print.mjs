// Print de página inteira em várias larguras (Edge da máquina).
//   node revisao/print.mjs /exemplo nome [larguras] [--clicar seletor]
import puppeteer from 'puppeteer-core';

const [caminho = '/exemplo', nome = 'exemplo', larg = '1440,390'] = process.argv.slice(2);
const clicar = process.argv.includes('--clicar') ? process.argv[process.argv.indexOf('--clicar') + 1] : null;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
for (const w of larg.split(',').map(Number)) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w < 768 ? 844 : 900, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await p.goto(`http://localhost:3416${caminho}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1200));
  if (clicar) {
    await p.click(clicar);
    await new Promise((r) => setTimeout(r, 900));
    await p.screenshot({ path: `revisao/${nome}-${w}.png` });
  } else {
    await p.screenshot({ path: `revisao/${nome}-${w}.png`, fullPage: true });
  }
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(w, 'scrollWidth', sw, erros.length ? erros.slice(0, 5) : 'sem erros');
  await p.close();
}
await b.close();
