-- Sistema de propostas do Sky. Tudo passa pelo servidor com a chave secreta (service_role):
-- anon e authenticated não leem nem escrevem nenhuma tabela. RLS ligado em todas, sem policy.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- quem usa o painel
create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome text not null,
  papel text not null default 'comercial' check (papel in ('admin', 'comercial')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- catálogo
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'show' check (categoria in ('show', 'dj', 'ballet', 'efeitos', 'banda', 'estrutura', 'outros')),
  descricao text not null default '',
  duracao_min int,            -- duração padrão
  duracao_max_min int,        -- teto (alerta no cronograma)
  preco int not null default 0 check (preco >= 0), -- centavos
  unidade text not null default 'un',
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table public.pacotes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  itens jsonb not null default '[]'::jsonb, -- [{servicoId, quantidade, duracaoMin, precoUnit, tipo}]
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'cerimonialista',
  whatsapp text not null default '',
  email text not null default '',
  desconto_padrao numeric(5,2) not null default 0,
  observacoes text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- propostas
create sequence public.propostas_numero_seq start 1;

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique default nextval('public.propostas_numero_seq'),
  codigo text not null unique check (codigo ~ '^[A-Za-z0-9]{20,}$'), -- vai na URL pública
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'visualizada', 'negociacao', 'aceita', 'contrato_enviado', 'contratada', 'recusada', 'vencida')),
  -- cópias dos campos de busca (a verdade é a versão atual)
  cliente_nome text not null default '',
  cliente_whatsapp text not null default '',
  evento_tipo text not null default 'outros',
  evento_nome text not null default '',
  evento_data date,
  evento_cidade text not null default '',
  total int not null default 0,
  desconto int not null default 0,
  validade date,
  parceiro_id uuid references public.parceiros (id) on delete set null,
  versao_atual int not null default 1,
  versao_publicada int,       -- a que o cliente vê (null = rascunho nunca enviado)
  versao_aceita int,
  arquivada boolean not null default false,
  enviada_em timestamptz,
  visualizada_em timestamptz,
  aceita_em timestamptz,
  criado_por uuid references public.perfis (user_id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index propostas_evento_data_idx on public.propostas (evento_data);
create index propostas_status_idx on public.propostas (status) where not arquivada;

create table public.proposta_versoes (
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  versao int not null,
  dados jsonb not null,
  total int not null,
  nota text not null default '',
  criado_por uuid references public.perfis (user_id) on delete set null,
  criado_em timestamptz not null default now(),
  primary key (proposta_id, versao)
);

-- ---------------------------------------------------------------- aceite (dados pessoais cifrados no app)
create table public.aceites (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null unique references public.propostas (id) on delete cascade, -- um aceite por proposta
  versao int not null,
  retrato jsonb not null,     -- exatamente o que foi aceito (dados da versão + conta)
  total int not null,
  nome text not null,         -- nome completo (vai no contrato; não é sigiloso como o CPF)
  cpf_cifrado text,           -- AES-256-GCM, chave só no servidor (DADOS_CHAVE)
  cpf_finais text,            -- 2 últimos dígitos, pra máscara
  endereco_cifrado text,
  cidade_uf text not null default '', -- só cidade/UF à mostra (referência)
  ip_hash text,
  navegador text,
  idempotencia text not null unique,
  dados_apagados_em timestamptz, -- LGPD: o registro do aceite fica, o CPF e o endereço saem
  criado_em timestamptz not null default now()
);

create table public.aceite_correcoes (
  id bigint generated always as identity primary key,
  aceite_id uuid not null references public.aceites (id) on delete cascade,
  antes_cifrado text not null,
  depois_cifrado text not null,
  motivo text not null default '',
  feito_por uuid references public.perfis (user_id) on delete set null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- trilha e avisos
create table public.historico (
  id bigint generated always as identity primary key,
  proposta_id uuid references public.propostas (id) on delete cascade,
  tipo text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario_id uuid references public.perfis (user_id) on delete set null,
  criado_em timestamptz not null default now()
);
create index historico_proposta_idx on public.historico (proposta_id, criado_em desc);

create table public.acessos (
  id bigint generated always as identity primary key,
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  versao int,
  ip_hash text,
  navegador text,
  criado_em timestamptz not null default now()
);
create index acessos_proposta_idx on public.acessos (proposta_id, criado_em desc);

-- limite de tentativas no aceite (por IP em hash, janela de tempo)
create table public.tentativas (
  id bigint generated always as identity primary key,
  chave text not null,
  criado_em timestamptz not null default now()
);
create index tentativas_chave_idx on public.tentativas (chave, criado_em desc);

create table public.notificacoes (
  id bigint generated always as identity primary key,
  proposta_id uuid references public.propostas (id) on delete cascade,
  titulo text not null,
  texto text not null default '',
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- permissões
do $$
declare t text;
begin
  foreach t in array array['perfis','servicos','pacotes','parceiros','configuracoes','propostas','proposta_versoes','aceites','aceite_correcoes','historico','acessos','tentativas','notificacoes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to service_role;
revoke all on sequence public.propostas_numero_seq from anon, authenticated;
