-- Aceite numa transação só: confere que a proposta ainda pode ser aceita (publicada, na mesma
-- versão que o cliente viu, dentro da validade, sem aceite anterior), grava o aceite, muda o
-- status, registra no histórico e cria o aviso do painel. Chamado só pelo servidor.
create or replace function public.registrar_aceite(
  p_codigo text,
  p_versao int,
  p_retrato jsonb,
  p_total int,
  p_nome text,
  p_cpf_cifrado text,
  p_cpf_finais text,
  p_endereco_cifrado text,
  p_cidade_uf text,
  p_ip_hash text,
  p_navegador text,
  p_idempotencia text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.propostas%rowtype;
  ja public.aceites%rowtype;
  novo uuid;
  hoje date := (now() at time zone 'America/Maceio')::date;
begin
  select * into ja from public.aceites where idempotencia = p_idempotencia;
  if found then return jsonb_build_object('ok', true, 'repetido', true); end if;

  select * into p from public.propostas where codigo = p_codigo for update;
  if not found or p.arquivada or p.versao_publicada is null then return jsonb_build_object('ok', false, 'erro', 'nao_encontrada'); end if;
  if p.versao_aceita is not null or exists (select 1 from public.aceites where proposta_id = p.id) then
    return jsonb_build_object('ok', false, 'erro', 'ja_aceita');
  end if;
  if p.status in ('recusada', 'vencida') or (p.validade is not null and p.validade < hoje) then
    return jsonb_build_object('ok', false, 'erro', 'vencida');
  end if;
  if p.versao_publicada <> p_versao then return jsonb_build_object('ok', false, 'erro', 'versao_mudou'); end if;

  insert into public.aceites (proposta_id, versao, retrato, total, nome, cpf_cifrado, cpf_finais, endereco_cifrado, cidade_uf, ip_hash, navegador, idempotencia)
  values (p.id, p_versao, p_retrato, p_total, p_nome, p_cpf_cifrado, p_cpf_finais, p_endereco_cifrado, p_cidade_uf, p_ip_hash, p_navegador, p_idempotencia)
  returning id into novo;

  update public.propostas set status = 'aceita', versao_aceita = p_versao, aceita_em = now(), atualizado_em = now() where id = p.id;
  insert into public.historico (proposta_id, tipo, detalhe) values (p.id, 'aceite', jsonb_build_object('versao', p_versao, 'total', p_total, 'aceite_id', novo));
  insert into public.notificacoes (proposta_id, titulo, texto)
  values (p.id, 'Proposta aceita', format('Proposta nº %s (%s) foi aceita. Os dados para o contrato estão no painel.', p.numero, coalesce(nullif(p.evento_nome, ''), p.cliente_nome)));
  return jsonb_build_object('ok', true, 'aceite_id', novo, 'numero', p.numero);
end $$;

revoke all on function public.registrar_aceite(text, int, jsonb, int, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_aceite(text, int, jsonb, int, text, text, text, text, text, text, text, text) to service_role;

-- 1ª visualização: muda enviada → visualizada uma vez só e guarda a hora
create or replace function public.registrar_visita(p_id uuid, p_versao int, p_ip_hash text, p_navegador text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  insert into public.acessos (proposta_id, versao, ip_hash, navegador) values (p_id, p_versao, p_ip_hash, p_navegador);
  update public.propostas set visualizada_em = coalesce(visualizada_em, now()), status = case when status = 'enviada' then 'visualizada' else status end where id = p_id;
  if not exists (select 1 from public.historico where proposta_id = p_id and tipo = 'visualizada') then
    insert into public.historico (proposta_id, tipo, detalhe) values (p_id, 'visualizada', jsonb_build_object('versao', p_versao));
    insert into public.notificacoes (proposta_id, titulo, texto)
    select p_id, 'Proposta aberta', format('O link da proposta nº %s foi aberto pela 1ª vez.', numero) from public.propostas where id = p_id;
  end if;
end $$;
revoke all on function public.registrar_visita(uuid, int, text, text) from public, anon, authenticated;
grant execute on function public.registrar_visita(uuid, int, text, text) to service_role;
