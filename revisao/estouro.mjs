// Acha quem passa da largura da janela (fora de área com rolagem própria)
//   node --env-file=.env.senha.local revisao/estouro.mjs /caminho largura
import puppeteer from 'puppeteer-core';

const [caminho, largura] = process.argv.slice(2);
const w = Number(largura);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:3416/painel/entrar', { waitUntil: 'networkidle2' });
await p.type('input[type=email]', process.env.PAINEL_EMAIL);
await p.type('input[type=password]', process.env.PAINEL_SENHA);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), p.click('button.botao--magenta')]);
await p.setViewport({ width: w, height: 844, isMobile: w < 768 });
await p.goto(`http://localhost:3416${caminho}`, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 600));
console.log(await p.evaluate((w) => {
  const process_all = location.hash === "#todos"; const rola = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  return [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > w + 1 && r.width > 0 && !e.closest('.pn-menu-cel') && (process_all || true || !rola(e)); }).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width).slice(0, 12).map((e) => `${e.tagName}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)} w=${Math.round(e.getBoundingClientRect().width)}`);
}, w));
await b.close();
