// Casos de borda do item 14: proposta vencida, usuário comercial sem acesso a CPF, versão nova
// depois do aceite (cliente segue vendo a aceita).
//   node --env-file=.env.senha.local revisao/e2e-2.mjs <codigoVencida> <emailComercial> <senhaComercial>
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:3416';
const [vencida, emailCom, senhaCom] = process.argv.slice(2);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, t) => { console.log(c ? '✓' : '✗', t); if (!c) process.exitCode = 1; };
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const erros = [];

// vencida
const cl = await (await b.createBrowserContext()).newPage();
cl.on('pageerror', (e) => erros.push(e.message));
await cl.setViewport({ width: 390, height: 844, isMobile: true });
await cl.goto(`${URL}/p/${vencida}`, { waitUntil: 'networkidle2' });
const tv = await cl.evaluate(() => ({ t: document.body.innerText, barra: !!document.querySelector('.pp-barra'), aceitar: [...document.querySelectorAll('button')].some((b) => /aceito/i.test(b.textContent)) }));
ok(/venceu|vencida/i.test(tv.t) && !tv.barra && !tv.aceitar, 'proposta vencida: aviso e sem botão de aceite');
await cl.screenshot({ path: 'revisao/e2e-vencida.png' });
await cl.goto(`${URL}/p/CodigoQueNaoExiste12345`, { waitUntil: 'networkidle2' });
ok((await cl.evaluate(() => document.body.innerText)).toLowerCase().includes('link não encontrado'), 'código inventado dá "Link não encontrado"');

// comercial
const com = await (await b.createBrowserContext()).newPage();
com.on('pageerror', (e) => erros.push(e.message));
await com.setViewport({ width: 1440, height: 900 });
await com.goto(`${URL}/painel/entrar`, { waitUntil: 'networkidle2' });
await com.type('input[type=email]', emailCom);
await com.type('input[type=password]', senhaCom);
await Promise.all([com.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), com.click('button.botao--magenta')]);
await espera(1200);
await com.goto(`${URL}/painel/aceitas`, { waitUntil: 'networkidle2' });
const href = await com.evaluate(() => document.querySelector('.pn-tabela a')?.getAttribute('href'));
await com.goto(`${URL}${href}`, { waitUntil: 'networkidle2' });
const tc = await com.evaluate(() => ({ t: document.querySelector('.pn-ficha')?.innerText ?? '', botao: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Mostrar dados')) }));
ok(!tc.botao && tc.t.includes('***.***.***-') && !/529\.982/.test(tc.t), 'comercial vê CPF mascarado e não tem "Mostrar dados"');
await com.goto(`${URL}/painel/ajustes`, { waitUntil: 'networkidle2' });
ok(!(await com.evaluate(() => document.body.innerText)).includes('Novo usuário'), 'comercial não gerencia usuários');

// admin: versão nova depois do aceite
const pn = await (await b.createBrowserContext()).newPage();
pn.on('pageerror', (e) => erros.push(e.message));
await pn.setViewport({ width: 1440, height: 900 });
await pn.goto(`${URL}/painel/entrar`, { waitUntil: 'networkidle2' });
await pn.type('input[type=email]', process.env.PAINEL_EMAIL);
await pn.type('input[type=password]', process.env.PAINEL_SENHA);
await Promise.all([pn.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), pn.click('button.botao--magenta')]);
await espera(1200);
await pn.goto(`${URL}/painel/aceitas`, { waitUntil: 'networkidle2' });
const fichaHref = await pn.evaluate(() => document.querySelector('.pn-tabela a')?.getAttribute('href'));
await pn.goto(`${URL}${fichaHref}`, { waitUntil: 'networkidle2' });
const propHref = await pn.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.textContent === 'Abrir proposta')?.getAttribute('href'));
await pn.goto(`${URL}${propHref}`, { waitUntil: 'networkidle2' });
const precos = await pn.$$('input[aria-label="Preço unitário"]');
await precos[1].click({ count: 3 });
await precos[1].type('5000');
await pn.click('h1');
const salvar = await pn.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Salvar'));
await salvar.asElement().click();
await espera(3500);
const msg = await pn.evaluate(() => document.querySelector('.aviso')?.textContent ?? '');
ok(/vers[aã]o 2/i.test(msg) || (await pn.evaluate(() => document.body.innerText.includes('Versão 2'))), `salvar depois do aceite cria a versão 2 (${msg.slice(0, 80)})`);
const codigo = await pn.evaluate(() => document.querySelector('.pn-link code')?.textContent?.split('/p/')[1]);
await cl.goto(`${URL}/p/${codigo}`, { waitUntil: 'networkidle2' });
const tp = await cl.evaluate(() => document.body.innerText.replace(/\u00a0/g, ' '));
ok(tp.includes('R$ 3.000,00') && tp.includes('versão 1'), 'cliente segue vendo a versão aceita (v1, R$ 3.000,00)');
ok((await pn.evaluate(() => document.body.innerText)).includes('· aceita'), 'histórico de versões marca a aceita');
await pn.screenshot({ path: 'revisao/e2e-v2.png', fullPage: true });

console.log(erros.length ? erros : 'sem erros de página');
await b.close();
