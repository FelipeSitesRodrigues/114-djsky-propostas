// Ponta a ponta com o banco de verdade (critérios de aceite do MVP, item 14 do escopo):
// login → proposta de 15 anos (abertura 19h-22h, show 22h-00h, base 6.000, 50%) → enviar →
// cliente abre sem login → aceita com CPF → painel mostra "aguardando contrato" e a ficha.
//   node --env-file=.env.senha.local revisao/e2e.mjs
import puppeteer from 'puppeteer-core';

const URL = process.env.BASE ?? 'http://localhost:3416';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const erros = [];
const ok = (cond, txt) => console.log(cond ? '✓' : '✗', txt) || (!cond && process.exitCode === undefined && (process.exitCode = 1));

const clicarTexto = async (p, sel, texto) => {
  const h = await p.evaluateHandle((s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(t) && e.getClientRects().length), sel, texto);
  if (!h.asElement()) throw new Error(`não achei ${sel} "${texto}"`);
  await h.asElement().click();
};

// ---------------------------------------------------------------- painel
const pn = await b.newPage();
pn.on('pageerror', (e) => erros.push(`painel: ${e.message}`));
await pn.setViewport({ width: 1440, height: 900 });
await pn.goto(`${URL}/painel/propostas`, { waitUntil: 'networkidle2' });
ok(pn.url().includes('/painel/entrar'), 'sem login, o painel manda pro /painel/entrar');
await pn.type('input[type=email]', process.env.PAINEL_EMAIL);
await pn.type('input[type=password]', process.env.PAINEL_SENHA);
await Promise.all([pn.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), pn.click('button.botao--magenta')]);
await espera(1500);
ok(!pn.url().includes('entrar'), `entrou (${pn.url()})`);

await pn.goto(`${URL}/painel/propostas`, { waitUntil: 'networkidle2' });
await clicarTexto(pn, 'button', '+ Nova proposta');
await espera(400);
await Promise.all([pn.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }), clicarTexto(pn, '.pn-janela button', '15 anos')]);
await espera(1500);
const idProposta = pn.url().split('/').pop();
ok(/^[0-9a-f-]{36}$/.test(idProposta), `proposta criada (${idProposta})`);

const ent = async (rotulo) => (await pn.evaluateHandle((r) => [...document.querySelectorAll('label.campo')].find((l) => l.querySelector('span')?.textContent.startsWith(r) && l.getClientRects().length)?.querySelector('input,select,textarea'), rotulo)).asElement();
await (await ent('Nome')).type('Maria Eduarda Teste');
await (await ent('WhatsApp')).type('(79) 99999-0000');
await (await ent('Nome do evento')).type('15 anos da Maria Eduarda');
// data pelo seletor em vidro: abre, avança os meses e clica no dia
await pn.click('.dv-campo[aria-label^="Data do evento"]');
for (let i = 0; i < 24 && !(await pn.$('.dv-pop [data-dia="2027-03-20"]')); i++) { await pn.click('.dv-seta[aria-label="Próximo mês"]'); await espera(80); }
await pn.click('.dv-pop [data-dia="2027-03-20"]');
await espera(300);
await (await ent('Local')).type('Espaço Vila Verde');
await clicarTexto(pn, '.pn-chip', '+ DJ de abertura');
await clicarTexto(pn, '.pn-chip', '+ Show completo SKY');
await espera(300);
const itens = await pn.$$('.pn-item');
const baseBtn = await itens[1].$$('.pn-segmento button');
await baseBtn[0].click();
const precos = await pn.$$('input[aria-label="Preço unitário"]');
await precos[0].click({ count: 3 }); await precos[0].type('2000');
await precos[1].click({ count: 3 }); await precos[1].type('4000');
await pn.click('h1'); // tira o foco
await clicarTexto(pn, 'button', 'Montar pelos serviços');
await clicarTexto(pn, '.pn-segmento button', '%');
await espera(200);
await (await pn.$('input[aria-label="Percentual de desconto"]')).click({ count: 3 });
await pn.type('input[aria-label="Percentual de desconto"]', '50');
await espera(300);
const resumo = await pn.$eval('.pn-resumo-valor', (e) => e.innerText);
ok(/Total\s*R\$\s*3\.000,00/.test(resumo), `cálculo ao vivo: base 6.000 com 50% = 3.000`);
const alertas = await pn.$$eval('.pn-alertas .aviso', (l) => l.map((e) => e.textContent));
ok(alertas.length === 0, `cronograma 19h-22h e 22h-00h sem alerta ${alertas.join(' | ')}`);
await pn.screenshot({ path: 'revisao/e2e-editor.png', fullPage: true });

await clicarTexto(pn, 'button', 'Enviar ao cliente');
await espera(4000);
const link = await pn.$eval('.pn-janela textarea', (t) => t.value.match(/https?:\/\/\S+\/p\/\S+/)?.[0]).catch(() => null);
ok(!!link, `enviada; link ${link}`);
await pn.screenshot({ path: 'revisao/e2e-enviada.png' });

// ---------------------------------------------------------------- cliente (sem login, celular)
const ctx = await b.createBrowserContext();
const cl = await ctx.newPage();
cl.on('pageerror', (e) => erros.push(`cliente: ${e.message}`));
await cl.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await cl.goto(link, { waitUntil: 'networkidle2' });
const texto = await cl.evaluate(() => document.body.innerText.replace(/ /g, ' '));
ok(texto.includes('R$ 3.000,00') && texto.includes('DJ DE ABERTURA') && texto.includes('SHOW COMPLETO SKY'), 'página do cliente com serviços e R$ 3.000,00');
ok(!/ballet|sparks|co₂|pdf/i.test(texto), 'nada não selecionado aparece, e sem botão de PDF');
await cl.screenshot({ path: 'revisao/e2e-cliente.png', fullPage: true });

await cl.click('.pp-barra .botao--magenta');
await espera(500);
const ins = await cl.$$('.pa-form .entrada');
await ins[0].type('Ana Paula Santos Teste');
await ins[1].type('11111111111');
await ins[2].type('49035100');
await espera(2500);
await ins[4].type('120');
await cl.click('.pa-base .botao');
await espera(300);
ok((await cl.$$('.pa .erro-campo')).length > 0, 'CPF inválido barra no formulário');
await ins[1].click({ count: 3 });
await ins[1].type('529.982.247-25');
await cl.click('.pa-base .botao');
await espera(400);
await cl.click('.pa-ciente input');
await espera(4200);
await cl.click('.pa-base .botao');
await espera(5000);
const fim = await cl.evaluate(() => document.querySelector('#pa-titulo')?.textContent);
ok(fim === 'Aceite enviado', `cliente vê a confirmação (${fim})`);
await cl.screenshot({ path: 'revisao/e2e-aceite.png' });

// envio duplicado: recarrega e tenta de novo
await cl.reload({ waitUntil: 'networkidle2' });
const depois = await cl.evaluate(() => ({ barra: !!document.querySelector('.pp-barra'), aceita: document.body.innerText.includes('Proposta aceita') }));
ok(!depois.barra && depois.aceita, 'depois do aceite a página mostra "aceita" e some o botão');

// ---------------------------------------------------------------- painel de novo
await pn.goto(`${URL}/painel/aceitas`, { waitUntil: 'networkidle2' });
const lista = await pn.evaluate(() => document.body.innerText);
ok(lista.includes('Ana Paula Santos Teste'), 'proposta aparece em Aguardando contrato');
await clicarTexto(pn, 'a', 'Ana Paula Santos Teste');
await pn.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
await espera(800);
ok((await pn.evaluate(() => document.body.innerText)).includes('***.***.***-25'), 'ficha mostra CPF mascarado antes de abrir');
await clicarTexto(pn, 'button', 'Mostrar dados');
await espera(2000);
const ficha = await pn.evaluate(() => document.querySelector('.pn-ficha')?.innerText ?? '');
ok(ficha.includes('529.982.247-25') && /Mario Jorge/i.test(ficha), 'admin abre CPF e endereço completos');
await pn.screenshot({ path: 'revisao/e2e-ficha.png', fullPage: true });

await pn.goto(`${URL}/painel/propostas/${idProposta}`, { waitUntil: 'networkidle2' });
ok((await pn.evaluate(() => document.body.innerText)).includes('Aceita, aguardando contrato'), 'status virou "Aceita, aguardando contrato"');

console.log(erros.length ? erros : 'sem erros de página');
await b.close();
