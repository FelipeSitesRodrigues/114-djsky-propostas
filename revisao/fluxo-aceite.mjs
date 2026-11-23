// Fluxo do aceite no celular: CPF inválido barra, CEP preenche endereço, revisão, confirmar.
//   node revisao/fluxo-aceite.mjs [/caminho]   (padrão /exemplo, que é pré-visualização)
import puppeteer from 'puppeteer-core';

const caminho = process.argv[2] ?? '/exemplo';
const cpf = process.argv[3] ?? '529.982.247-25';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new' });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
await p.goto(`http://localhost:3416${caminho}`, { waitUntil: 'networkidle2' });
await p.click('.pp-barra .botao--magenta');
await new Promise((r) => setTimeout(r, 600));
const campos = '.pa-form .entrada';
const ins = await p.$$(campos);
// nome, cpf, cep, logradouro, numero, complemento, bairro, cidade
await ins[0].type('Ana Paula Santos');
await ins[1].type('123.456.789-00');
await ins[2].type('49035100');
await new Promise((r) => setTimeout(r, 2500));
await ins[4].type('120');
await p.click('.pa-base .botao');
await new Promise((r) => setTimeout(r, 400));
const etapa1 = await p.evaluate(() => ({ erros: [...document.querySelectorAll('.pa .erro-campo')].map((e) => e.textContent), rua: document.querySelectorAll('.pa-form .entrada')[3].value, cidade: document.querySelectorAll('.pa-form .entrada')[7].value, uf: document.querySelector('.pa-form select').value }));
console.log('com CPF inválido:', etapa1);
await ins[1].click({ count: 3 });
await ins[1].type(cpf);
await p.click('.pa-base .botao');
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({ path: 'revisao/fluxo-revisar.png' });
await p.click('.pa-base .botao');
await new Promise((r) => setTimeout(r, 300));
console.log('sem marcar ciência:', await p.evaluate(() => document.querySelector('.pa .erro-campo')?.textContent));
await p.click('.pa-ciente input');
await new Promise((r) => setTimeout(r, 4200)); // passa do tempo mínimo anti-robô
await p.click('.pa-base .botao');
await new Promise((r) => setTimeout(r, 3500));
await p.screenshot({ path: 'revisao/fluxo-fim.png' });
console.log('fim:', await p.evaluate(() => ({ titulo: document.querySelector('#pa-titulo')?.textContent, aviso: document.querySelector('.pa .aviso')?.textContent ?? '' })));
console.log(erros.length ? erros : 'sem erros de página');
await b.close();
