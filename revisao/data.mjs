// Seletor de data em vidro: abre, bloqueia dias passados, escolhe um dia. Cria uma proposta de
// teste (apagar depois com npm run sql).
//   node --env-file=.env.senha.local revisao/data.mjs
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:3416';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, t) => { console.log(c ? '✓' : '✗', t); if (!c) process.exitCode = 1; };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const erros = [];
for (const w of [1440, 390]) {
  const p = await b.newPage();
  p.on('pageerror', (e) => erros.push(e.message));
  p.setDefaultNavigationTimeout(150000);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: w < 768 ? 844 : 900, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 2 });
  if (w === 1440) {
    await p.goto(`${URL}/painel/entrar`, { waitUntil: 'networkidle2' });
    await p.type('input[type=email]', process.env.PAINEL_EMAIL);
    await p.type('input[type=password]', process.env.PAINEL_SENHA);
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), p.click('button.botao--magenta')]);
    await espera(1200);
    await p.goto(`${URL}/painel/propostas`, { waitUntil: 'networkidle2' });
    const ja = await p.evaluate(() => document.querySelector('.pn-tabela a[href^="/painel/propostas/"]')?.getAttribute('href'));
    if (ja) await p.goto(URL + ja, { waitUntil: 'networkidle2' });
    else {
      const novo = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((e) => e.textContent.includes('Nova proposta')));
      await novo.click(); await espera(400);
      const tipo = await p.evaluateHandle(() => [...document.querySelectorAll('.pn-janela button')].find((e) => e.textContent.trim().startsWith('15 anos')));
      await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }), tipo.click()]);
    }
    await espera(1200);
    globalThis.editor = p.url();
  } else {
    await p.goto(globalThis.editor, { waitUntil: 'networkidle2' });
    await espera(1200);
  }
  const campo = await p.$('.dv-campo[aria-label^="Data do evento"]');
  await campo.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await campo.click();
  await espera(500);
  const info = await p.evaluate(() => {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Maceio' });
    const ontem = new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Maceio' });
    const d = (v) => document.querySelector(`.dv-pop [data-dia="${v}"]`);
    const pop = document.querySelector('.dv-pop').getBoundingClientRect();
    return { hoje, ontemBloq: d(ontem)?.disabled ?? 'fora do mês', hojeLivre: d(hoje) && !d(hoje).disabled, voltarBloq: document.querySelector('.dv-seta').disabled, cabe: pop.left >= 0 && pop.right <= innerWidth, sw: document.documentElement.scrollWidth };
  });
  ok(info.ontemBloq === true || info.ontemBloq === 'fora do mês', `${w}: ontem bloqueado (${info.ontemBloq})`);
  ok(info.hojeLivre, `${w}: hoje liberado`);
  ok(info.voltarBloq, `${w}: não volta pro mês passado`);
  ok(info.cabe && info.sw <= w, `${w}: calendário dentro da tela (scrollWidth ${info.sw})`);
  const r = await p.$eval('.dv', (e) => { const a = e.getBoundingClientRect(); const b = document.querySelector('.dv-pop').getBoundingClientRect(); return { x: Math.max(0, Math.min(a.left, b.left) - 20), y: a.top - 40, w: Math.max(a.right, b.right) - Math.min(a.left, b.left) + 40, h: b.bottom - a.top + 60 }; });
  await p.screenshot({ path: `revisao/data-${w}.png`, clip: { x: r.x, y: r.y + (await p.evaluate(() => scrollY)), width: Math.min(r.w, w - r.x), height: r.h } });
  if (w === 1440) {
    // escolher o dia 15 do mês seguinte
    await p.click('.dv-seta[aria-label="Próximo mês"]');
    await espera(200);
    const alvo = await p.$eval('.dv-pop [data-dia$="-15"]', (e) => e.dataset.dia);
    await p.click(`.dv-pop [data-dia="${alvo}"]`);
    await espera(400);
    const txt = await p.$eval('.dv-campo[aria-label^="Data do evento"]', (e) => e.textContent);
    ok(txt.includes(`15/${alvo.slice(5, 7)}/${alvo.slice(0, 4)}`), `escolheu ${alvo} e o campo mostra "${txt}"`);
    ok(!(await p.$('.dv-pop')), 'calendário fechou depois de escolher');
  }
  await p.close();
}
console.log(erros.length ? erros : 'sem erros de página');
await b.close();
