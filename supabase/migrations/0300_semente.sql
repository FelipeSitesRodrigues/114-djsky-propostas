-- Catálogo inicial do escopo (item 4). Preço zero: o Sky preenche no painel.
insert into public.servicos (nome, categoria, descricao, duracao_min, duracao_max_min, ordem) values
  ('Show completo SKY', 'show', 'Show do Sky com set autoral, drops próprios e visual de telão.', 120, 180, 10),
  ('DJ de abertura', 'dj', 'Recepção e protocolos, com trilha pensada pro momento.', 180, 180, 20),
  ('DJ de encerramento', 'dj', 'Fechamento da pista depois do show.', 120, 240, 30),
  ('DJ corporativo', 'dj', 'Trilha para evento de empresa, do coquetel à festa.', 180, 300, 40),
  ('SKY GINGA', 'banda', 'DJ, percussão e sax ao vivo.', 120, 180, 50),
  ('Ballet profissional', 'ballet', 'Bailarinos profissionais em entradas coreografadas. Quantidade: 2, 4, 6 ou personalizada.', null, null, 60),
  ('CO₂', 'efeitos', 'Jatos de CO₂ na pista.', null, null, 70),
  ('Bazuca de papel', 'efeitos', 'Disparo de papel picado.', null, null, 80),
  ('Sparks', 'efeitos', 'Máquinas de faísca fria.', null, null, 90),
  ('Serpentina', 'efeitos', 'Disparo de serpentinas.', null, null, 100),
  ('Estrutura de som', 'estrutura', 'Sistema de som dimensionado para o espaço.', null, null, 110),
  ('Iluminação', 'estrutura', 'Iluminação de pista e palco.', null, null, 120),
  ('Painel de LED', 'estrutura', 'Painel de LED com o visual do show.', null, null, 130);

insert into public.configuracoes (chave, valor) values
  ('geral', jsonb_build_object(
    'whatsapp', '5579999662758',
    'sinalPercentual', 50,
    'validadeDias', 7,
    'formaPagamento', 'Pix ou transferência',
    'condicoesPagamento', 'Sinal para reservar a data. O saldo é pago até a data combinada abaixo.',
    'emailAvisos', ''
  )),
  ('regrasDesconto', jsonb_build_array(
    jsonb_build_object('nome', 'Parceria', 'percentual', 10),
    jsonb_build_object('nome', 'Cliente novo', 'percentual', 5),
    jsonb_build_object('nome', 'Dia de semana', 'percentual', 15)
  )),
  ('apresentacoes', jsonb_build_object(
    'casamento', jsonb_build_object('titulo', 'A pista do seu casamento', 'texto', 'Do primeiro brinde à última música, a pista acompanha a história de vocês. A proposta abaixo foi montada para a sua noite.', 'capa', 'casamento'),
    '15-anos', jsonb_build_object('titulo', 'A noite dos seus 15 anos', 'texto', 'Entrada, valsa, protocolos e uma pista que não esvazia. Tudo pensado para os seus 15 anos.', 'capa', '15-anos'),
    'formatura', jsonb_build_object('titulo', 'A festa de formatura', 'texto', 'Uma festa à altura da conquista, com show completo e pista cheia até o fim.', 'capa', 'formatura'),
    'corporativo', jsonb_build_object('titulo', 'O seu evento corporativo', 'texto', 'Do coquetel à festa, a trilha certa pro seu público e pra sua marca.', 'capa', 'corporativo'),
    'aniversario', jsonb_build_object('titulo', 'O seu aniversário', 'texto', 'Uma festa com a energia do show do Sky, do jeito que você imaginou.', 'capa', 'festa'),
    'reveillon', jsonb_build_object('titulo', 'O seu réveillon', 'texto', 'A virada com contagem regressiva, efeitos e pista cheia.', 'capa', 'festival'),
    'particular', jsonb_build_object('titulo', 'A sua festa', 'texto', 'Show completo e pista cheia para a sua festa particular.', 'capa', 'festa'),
    'outros', jsonb_build_object('titulo', 'O seu evento', 'texto', 'A proposta abaixo foi montada para o seu evento.', 'capa', 'festival')
  ));
