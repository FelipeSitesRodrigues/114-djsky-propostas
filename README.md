# SKY Propostas

Sistema de propostas do DJ Sky (cliente 0114). Painel em `/painel`, página do cliente em
`/p/<código>`. Next 16 + Supabase (projeto `xfmbhjezkqdpqxcivvdk`, "GERADOR PROPOSTAS SKY", conta
do Sky, São Paulo). Design: `docs/superpowers/specs/2026-11-23-propostas-sky-design.md` na raiz do repo.

## Rodar no computador

```
npm install
npm run dev            # http://localhost:3416  (/exemplo mostra uma proposta sem banco)
npm run teste          # cálculo, CPF, cronograma, cifra
```

Arquivos fora do git:
- `.env.supabase.local`: token da conta do Sky (`sbp_...`) e o ref do projeto
- `.env.local`: chaves do Supabase, `DADOS_CHAVE` e `CRON_SECRET` (gerado por `node scripts/configurar.mjs`)
- `.env.senha.local`: login de teste do painel

**`DADOS_CHAVE` não pode se perder nem mudar:** CPF e endereço ficam cifrados com ela. Sem ela, os
dados de contrato já recebidos não abrem mais.

## Banco

- `npm run migrar`: aplica `supabase/migrations` em ordem
- `npm run sql -- -e "select ..."`: SQL pela API de gerenciamento
- `npm run usuario -- email "Nome" senha admin|comercial`: cria login do painel

## Publicar (Vercel)

No ar em https://sky-propostas.vercel.app (projeto `sky-propostas` na Vercel do Felipe, ligado ao
GitHub `FelipeSitesRodrigues/114-djsky-propostas`: cada push na `main` publica). O repositório é
público: nada de `.env*` no commit.

Variáveis: as seis do `.env.local` (já cadastradas). `SITE_URL` está como o endereço da Vercel; quando o
domínio entrar, trocar pra `https://propostas.sigasky.com.br`.
Opcional: `RESEND_API_KEY` e `AVISO_REMETENTE` pro e-mail de aceite. O `vercel.json` roda um cron
diário que marca vencidas e mantém o Supabase Free acordado. Domínio: CNAME de `propostas` no DNS
do `sigasky.com.br` apontando pra Vercel.

## Testes de ponta a ponta (servidor ligado)

- `node --env-file=.env.senha.local revisao/e2e.mjs`: critérios do item 14 (proposta de 15 anos,
  R$ 6.000 com 50% = R$ 3.000, aceite com CPF, ficha no painel). Cria dados: apagar depois.
- `revisao/e2e-2.mjs`: vencida, usuário comercial, versão nova depois do aceite.
- `revisao/telas.mjs`: print de cada tela em 1440 e 390 e aviso de estouro de largura.
- `revisao/velocidade.mjs <porta ou URL>`: tempo de cada clique no menu até a tela aparecer.
- `BASE=https://sky-propostas.vercel.app` antes do `e2e.mjs` roda o teste no ar.
