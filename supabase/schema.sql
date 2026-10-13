-- =========================================================
-- Quality Quest: esquema inicial (Supabase / Postgres)
-- =========================================================

-- Perfil público do jogador (criado automaticamente no cadastro)
create table public.perfis (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  nome_exibicao  text not null check (char_length(nome_exibicao) between 3 and 20),
  created_at     timestamptz not null default now()
);

-- Um herói por jogador.
-- Os atributos guardados são os pontos distribuídos (base, de 1 a 10);
-- o valor efetivo soma o bônus da raça (ver atributo_efetivo).
create table public.herois (
  id                      bigint generated always as identity primary key,
  user_id                 uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  nome                    text not null check (char_length(btrim(nome)) between 3 and 40),
  classe                  text not null check (classe in ('guerreiro', 'mago', 'ladino', 'clerigo', 'arqueiro')),
  raca                    text not null check (raca in ('humano', 'elfo', 'anao', 'halfling', 'orc')),
  brasao_icone            text not null check (brasao_icone in (
                            'visored-helm', 'pointy-hat', 'hood', 'holy-symbol', 'bowman',
                            'lion', 'eagle-emblem', 'wolf-head', 'griffin-symbol', 'owl',
                            'stag-head', 'bear-head', 'raven', 'fleur-de-lys', 'crown')),
  brasao_cor              text not null check (brasao_cor in ('goles', 'blau', 'sinople', 'purpura', 'sable', 'ouro', 'prata')),
  nivel                   int  not null default 1 check (nivel >= 1),
  xp                      int  not null default 0 check (xp >= 0),
  forca                   int  not null check (forca between 1 and 10),
  destreza                int  not null check (destreza between 1 and 10),
  inteligencia            int  not null check (inteligencia between 1 and 10),
  constituicao            int  not null check (constituicao between 1 and 10),
  hp_atual                int  not null check (hp_atual >= 0),
  ouro                    int  not null default 0 check (ouro >= 0),
  missoes_concluidas      int  not null default 0 check (missoes_concluidas >= 0),
  descanso_disponivel_em  timestamptz,
  created_at              timestamptz not null default now(),
  -- Humano (Versátil) distribui 22 pontos; as demais raças, 20
  constraint pontos_de_atributo_validos check (
    forca + destreza + inteligencia + constituicao = case when raca = 'humano' then 22 else 20 end
  )
);

create unique index herois_nome_unico on public.herois (lower(btrim(nome)));

-- Catálogo do mercador
create table public.itens (
  id        text primary key,
  nome      text not null,
  icone     text not null,
  raridade  text not null check (raridade in ('comum', 'raro', 'epico', 'lendario')),
  tipo      text not null check (tipo in ('arma', 'defesa', 'equipamento', 'acessorio', 'consumivel')),
  preco     int  not null check (preco > 0),
  cura      int  check (cura > 0)
);

-- Itens de cada herói
create table public.inventario (
  id          bigint generated always as identity primary key,
  heroi_id    bigint not null references public.herois (id) on delete cascade,
  item_id     text   not null references public.itens (id),
  equipado    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index inventario_heroi_idx on public.inventario (heroi_id);

-- Catálogo de missões
create table public.missoes (
  id                text primary key,
  nome              text not null,
  descricao         text not null,
  dificuldade       text not null check (dificuldade in ('facil', 'media', 'dificil', 'lendaria')),
  duracao_segundos  int  not null check (duracao_segundos > 0),
  ouro              int  not null check (ouro >= 0),
  xp                int  not null check (xp >= 0)
);

-- Missão em andamento (no máximo uma por herói)
create table public.missoes_ativas (
  heroi_id   bigint primary key references public.herois (id) on delete cascade,
  missao_id  text not null references public.missoes (id),
  inicio     timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Regras de classe e raça (usadas pelas funções RPC)
-- ---------------------------------------------------------

-- Bônus da raça em um atributo
create function public.bonus_raca(p_raca text, p_atributo text)
returns int
language sql
immutable
as $$
  select case
    when p_raca = 'elfo'     and p_atributo in ('destreza', 'inteligencia') then 1
    when p_raca = 'anao'     and p_atributo = 'constituicao'                 then 2
    when p_raca = 'halfling' and p_atributo = 'destreza'                     then 1
    when p_raca = 'orc'      and p_atributo = 'forca'                        then 2
    when p_raca = 'orc'      and p_atributo = 'inteligencia'                 then -1
    else 0
  end;
$$;

-- Valor efetivo = pontos distribuídos + bônus da raça, nunca abaixo de 1
create function public.atributo_efetivo(p_raca text, p_atributo text, p_base int)
returns int
language sql
immutable
as $$
  select greatest(1, p_base + public.bonus_raca(p_raca, p_atributo));
$$;

-- HP máximo = base da classe + Constituição efetiva × nível
-- (p_constituicao é o valor distribuído, sem o bônus da raça)
create function public.hp_max(p_classe text, p_raca text, p_constituicao int, p_nivel int)
returns int
language sql
immutable
as $$
  select case p_classe
    when 'guerreiro' then 12
    when 'mago'      then 6
    when 'ladino'    then 8
    when 'clerigo'   then 10
    when 'arqueiro'  then 9
  end + public.atributo_efetivo(p_raca, 'constituicao', p_constituicao) * p_nivel;
$$;

-- Mãos leves (ladino): 10% de desconto, arredondado para cima
create function public.preco_para(p_classe text, p_preco int)
returns int
language sql
immutable
as $$
  select case when p_classe = 'ladino' then (p_preco * 9 + 9) / 10 else p_preco end;
$$;

-- Mente arcana (mago): +20% de XP nas missões
create function public.xp_missao(p_classe text, p_xp int)
returns int
language sql
immutable
as $$
  select case when p_classe = 'mago' then round(p_xp * 1.2)::int else p_xp end;
$$;

-- Bênção (clérigo): recarga da taverna em 15 segundos
create function public.recarga_taverna(p_classe text)
returns interval
language sql
immutable
as $$
  select case when p_classe = 'clerigo' then interval '15 seconds' else interval '30 seconds' end;
$$;

-- Cria o perfil quando um usuário se cadastra
-- (o front envia nome_exibicao em options.data no signUp)
create function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id, nome_exibicao)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome_exibicao'), ''), 'Aventureiro'), 20)
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
alter table public.perfis          enable row level security;
alter table public.herois          enable row level security;
alter table public.itens           enable row level security;
alter table public.inventario      enable row level security;
alter table public.missoes         enable row level security;
alter table public.missoes_ativas  enable row level security;

create policy "Jogador lê o próprio perfil"
  on public.perfis for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Jogador edita o próprio perfil"
  on public.perfis for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Jogador lê o próprio herói"
  on public.herois for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Jogador edita o próprio herói"
  on public.herois for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Confere a missão sem passar pelo RLS de missoes_ativas. Consultar a tabela
-- direto na política abaixo gera recursão infinita (herois → missoes_ativas → herois).
create function public.heroi_em_missao(p_heroi_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.missoes_ativas where heroi_id = p_heroi_id);
$$;

revoke execute on function public.heroi_em_missao(bigint) from public, anon;
grant execute on function public.heroi_em_missao(bigint) to authenticated;

create policy "Jogador aposenta o próprio herói fora de missão"
  on public.herois for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and not public.heroi_em_missao(id)
  );

create policy "Catálogo de itens visível para jogadores"
  on public.itens for select to authenticated
  using (true);

create policy "Catálogo de missões visível para jogadores"
  on public.missoes for select to authenticated
  using (true);

create policy "Jogador vê o próprio inventário"
  on public.inventario for select to authenticated
  using (exists (select 1 from public.herois h where h.id = heroi_id and h.user_id = (select auth.uid())));

create policy "Jogador descarta itens do próprio inventário"
  on public.inventario for delete to authenticated
  using (exists (select 1 from public.herois h where h.id = heroi_id and h.user_id = (select auth.uid())));

create policy "Jogador vê a própria missão ativa"
  on public.missoes_ativas for select to authenticated
  using (exists (select 1 from public.herois h where h.id = heroi_id and h.user_id = (select auth.uid())));

-- ---------------------------------------------------------
-- Permissões: o cliente só escreve o que é seguro;
-- o resto passa pelas funções RPC (security definer)
-- ---------------------------------------------------------
revoke all on public.perfis, public.herois, public.itens, public.inventario, public.missoes, public.missoes_ativas from anon;

revoke insert, delete on public.perfis from authenticated;
revoke update on public.perfis from authenticated;
grant update (nome_exibicao) on public.perfis to authenticated;

revoke insert on public.herois from authenticated;
revoke update on public.herois from authenticated;
grant update (nome) on public.herois to authenticated;

revoke insert, update, delete on public.itens, public.missoes from authenticated;
revoke insert, update on public.inventario from authenticated;
revoke insert, update, delete on public.missoes_ativas from authenticated;

-- ---------------------------------------------------------
-- Hall da Fama: leitura entre jogadores, só com colunas públicas.
-- Intencional: a view roda com os privilégios do dono e ignora o RLS
-- das tabelas, expondo apenas estas colunas (o linter do Supabase
-- vai sinalizar a view; isso é esperado).
-- As posições são do ranking geral: como as janelas não têm
-- partition by, filtros aplicados sobre a view (busca, classe)
-- não alteram a numeração.
-- ---------------------------------------------------------
create view public.hall_da_fama as
  select
    row_number() over (order by h.nivel desc, h.missoes_concluidas desc, lower(h.nome)) as posicao_nivel,
    row_number() over (order by h.missoes_concluidas desc, h.nivel desc, lower(h.nome)) as posicao_missoes,
    h.nome,
    h.classe,
    h.brasao_icone,
    h.brasao_cor,
    h.nivel,
    h.missoes_concluidas,
    p.nome_exibicao as jogador,
    h.user_id = auth.uid() as meu
  from public.herois h
  join public.perfis p on p.user_id = h.user_id;

revoke all on public.hall_da_fama from anon;
grant select on public.hall_da_fama to authenticated;

-- ---------------------------------------------------------
-- Funções RPC
-- Rodam com os privilégios do dono (security definer), sempre no
-- herói de auth.uid(), e lançam mensagens em português que o front
-- mostra no toast. Quando a recusa vem de uma constraint, o nome dela
-- vai no "detail" do erro (útil nos testes de API).
-- ---------------------------------------------------------

-- Cria o herói do jogador. O d20 é rolado no front (para Halfling, o
-- front já envia o maior das duas rolagens); aqui só se validam limites.
create function public.criar_personagem(
  p_nome text,
  p_classe text,
  p_raca text,
  p_forca int,
  p_destreza int,
  p_inteligencia int,
  p_constituicao int,
  p_brasao_icone text,
  p_brasao_cor text,
  p_d20 int
)
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi public.herois;
  v_constraint text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para criar um personagem.';
  end if;
  if exists (select 1 from public.herois where user_id = auth.uid()) then
    raise exception 'Você já tem um personagem. Aposente o atual para criar outro.';
  end if;
  if p_classe is null or p_classe not in ('guerreiro', 'mago', 'ladino', 'clerigo', 'arqueiro') then
    raise exception 'Escolha uma classe válida.';
  end if;
  if p_raca is null or p_raca not in ('humano', 'elfo', 'anao', 'halfling', 'orc') then
    raise exception 'Escolha uma raça válida.';
  end if;
  if p_d20 is null or p_d20 not between 1 and 20 then
    raise exception 'O d20 precisa ter um resultado entre 1 e 20.';
  end if;

  insert into public.herois (
    user_id, nome, classe, raca, brasao_icone, brasao_cor,
    forca, destreza, inteligencia, constituicao, hp_atual, ouro
  )
  values (
    auth.uid(), btrim(p_nome), p_classe, p_raca, p_brasao_icone, p_brasao_cor,
    p_forca, p_destreza, p_inteligencia, p_constituicao,
    public.hp_max(p_classe, p_raca, p_constituicao, 1), p_d20 * 10
  )
  returning * into v_heroi;

  return v_heroi;
exception
  when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'herois_nome_unico' then
      raise exception 'Já existe um herói com esse nome. Escolha outro.'
        using detail = v_constraint, hint = 'nome_em_uso';
    end if;
    -- unique (user_id): duas criações simultâneas
    raise exception 'Você já tem um personagem. Aposente o atual para criar outro.'
      using detail = v_constraint;
  when check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    raise exception '%', case v_constraint
        when 'pontos_de_atributo_validos' then 'A soma dos atributos precisa ser 20 (ou 22 para Humano).'
        when 'herois_nome_check'          then 'O nome do herói precisa ter de 3 a 40 caracteres.'
        when 'herois_brasao_icone_check'  then 'Escolha um ícone de brasão válido.'
        when 'herois_brasao_cor_check'    then 'Escolha uma cor de brasão válida.'
        else 'Cada atributo precisa ficar entre 1 e 10.'
      end
      using detail = v_constraint;
  when not_null_violation then
    raise exception 'Preencha todos os dados do personagem.';
end;
$$;

-- Sobe um nível: XP −= nível × 100, nível + 1, HP atual += Constituição efetiva
create function public.subir_nivel()
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi public.herois;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  if v_heroi.xp < v_heroi.nivel * 100 then
    raise exception 'Faltam % XP para o nível %.', v_heroi.nivel * 100 - v_heroi.xp, v_heroi.nivel + 1;
  end if;

  update public.herois
     set xp       = xp - nivel * 100,
         nivel    = nivel + 1,
         hp_atual = hp_atual + public.atributo_efetivo(raca, 'constituicao', constituicao)
   where id = v_heroi.id
  returning * into v_heroi;

  return v_heroi;
end;
$$;

-- Só jogadores logados chamam as RPCs
revoke execute on function public.criar_personagem(text, text, text, int, int, int, int, text, text, int) from public, anon;
grant execute on function public.criar_personagem(text, text, text, int, int, int, int, text, text, int) to authenticated;
revoke execute on function public.subir_nivel() from public, anon;
grant execute on function public.subir_nivel() to authenticated;

-- ---------------------------------------------------------
-- Fase 2: inventário, mercador e taverna
-- Usa "create or replace": num projeto que já rodou o esquema
-- anterior, dá para executar só este bloco no SQL Editor.
-- O descarte de itens não tem RPC: é um DELETE em inventario,
-- liberado pela política "Jogador descarta itens do próprio inventário".
-- ---------------------------------------------------------

-- Compra um item do catálogo. Mãos leves (ladino) paga preco_para.
-- Debita o ouro e insere no inventário na mesma transação.
create or replace function public.comprar_item(p_item_id text)
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi public.herois;
  v_item  public.itens;
  v_preco int;
  v_itens int;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  select * into v_item from public.itens where id = p_item_id;
  if not found then
    raise exception 'Esse item não existe no catálogo do mercador.';
  end if;

  select count(*) into v_itens from public.inventario where heroi_id = v_heroi.id;
  if v_itens >= 10 then
    raise exception 'O inventário está cheio (10 de 10). Descarte ou use um item antes de comprar.';
  end if;
  v_preco := public.preco_para(v_heroi.classe, v_item.preco);
  if v_heroi.ouro < v_preco then
    raise exception 'Ouro insuficiente. Faltam % moedas.', v_preco - v_heroi.ouro;
  end if;

  update public.herois set ouro = ouro - v_preco where id = v_heroi.id returning * into v_heroi;
  insert into public.inventario (heroi_id, item_id) values (v_heroi.id, v_item.id);

  return v_heroi;
end;
$$;

-- Equipa ou desequipa um item (alterna). Só uma arma equipada por vez:
-- equipar uma arma desequipa a anterior. Consumíveis não se equipam.
create or replace function public.equipar_item(p_inventario_id bigint)
returns public.inventario
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi_id bigint;
  v_linha    public.inventario;
  v_tipo     text;
begin
  select id into v_heroi_id from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  select * into v_linha from public.inventario where id = p_inventario_id and heroi_id = v_heroi_id;
  if not found then
    raise exception 'Esse item não está no seu inventário.';
  end if;
  select tipo into v_tipo from public.itens where id = v_linha.item_id;
  if v_tipo = 'consumivel' then
    raise exception 'Consumíveis não podem ser equipados. Use o item para recuperar HP.';
  end if;

  if not v_linha.equipado and v_tipo = 'arma' then
    update public.inventario inv
       set equipado = false
      from public.itens it
     where it.id = inv.item_id
       and inv.heroi_id = v_heroi_id
       and inv.equipado
       and it.tipo = 'arma';
  end if;

  update public.inventario set equipado = not equipado where id = v_linha.id returning * into v_linha;
  return v_linha;
end;
$$;

-- Usa um consumível: cura até o HP máximo e remove o item
create or replace function public.usar_item(p_inventario_id bigint)
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi public.herois;
  v_item  public.itens;
  v_max   int;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  select it.* into v_item
    from public.inventario inv
    join public.itens it on it.id = inv.item_id
   where inv.id = p_inventario_id and inv.heroi_id = v_heroi.id;
  if not found then
    raise exception 'Esse item não está no seu inventário.';
  end if;
  if v_item.tipo <> 'consumivel' then
    raise exception 'Só consumíveis podem ser usados.';
  end if;
  v_max := public.hp_max(v_heroi.classe, v_heroi.raca, v_heroi.constituicao, v_heroi.nivel);
  if v_heroi.hp_atual >= v_max then
    raise exception '% já está com o HP completo.', v_heroi.nome;
  end if;

  delete from public.inventario where id = p_inventario_id;
  update public.herois
     set hp_atual = least(v_max, hp_atual + v_item.cura)
   where id = v_heroi.id
  returning * into v_heroi;

  return v_heroi;
end;
$$;

-- Descansa na taverna: HP vai ao máximo e começa a recarga
-- (30 s, ou 15 s para Clérigo, ver recarga_taverna)
create or replace function public.descansar()
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi public.herois;
  v_max   int;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  if public.heroi_em_missao(v_heroi.id) then
    raise exception 'Não é possível descansar durante uma missão.';
  end if;
  if v_heroi.descanso_disponivel_em is not null and now() < v_heroi.descanso_disponivel_em then
    raise exception 'Você poderá descansar de novo em % segundos.',
      ceil(extract(epoch from v_heroi.descanso_disponivel_em - now()))::int;
  end if;
  v_max := public.hp_max(v_heroi.classe, v_heroi.raca, v_heroi.constituicao, v_heroi.nivel);
  if v_heroi.hp_atual >= v_max then
    raise exception '% já está com o HP completo.', v_heroi.nome;
  end if;

  update public.herois
     set hp_atual = v_max,
         descanso_disponivel_em = now() + public.recarga_taverna(classe)
   where id = v_heroi.id
  returning * into v_heroi;

  return v_heroi;
end;
$$;

revoke execute on function public.comprar_item(text) from public, anon;
grant execute on function public.comprar_item(text) to authenticated;
revoke execute on function public.equipar_item(bigint) from public, anon;
grant execute on function public.equipar_item(bigint) to authenticated;
revoke execute on function public.usar_item(bigint) from public, anon;
grant execute on function public.usar_item(bigint) to authenticated;
revoke execute on function public.descansar() from public, anon;
grant execute on function public.descansar() to authenticated;

-- ---------------------------------------------------------
-- Fase 3: missões e arena
-- Também usa "create or replace": dá para executar só este bloco
-- num projeto que já rodou os anteriores.
-- ---------------------------------------------------------

-- Ferido: HP atual abaixo de 30% do máximo (conta em inteiros, sem arredondamento)
create or replace function public.ferido(p_heroi public.herois)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_heroi.hp_atual * 10 < public.hp_max(p_heroi.classe, p_heroi.raca, p_heroi.constituicao, p_heroi.nivel) * 3;
$$;

-- Parte em missão: uma por vez e só com o herói fora de perigo
create or replace function public.enviar_missao(p_missao_id text)
returns public.missoes_ativas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi  public.herois;
  v_ativa  public.missoes_ativas;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  if not exists (select 1 from public.missoes where id = p_missao_id) then
    raise exception 'Essa missão não existe no quadro.';
  end if;
  if public.heroi_em_missao(v_heroi.id) then
    raise exception 'Seu herói já está em uma missão. Colete a recompensa para partir de novo.';
  end if;
  if public.ferido(v_heroi) then
    raise exception '% está ferido demais para sair em missão. Descanse na taverna primeiro.', v_heroi.nome;
  end if;

  insert into public.missoes_ativas (heroi_id, missao_id) values (v_heroi.id, p_missao_id)
  returning * into v_ativa;
  return v_ativa;
exception
  -- Duas partidas simultâneas: a chave primária de missoes_ativas garante uma só
  when unique_violation then
    raise exception 'Seu herói já está em uma missão. Colete a recompensa para partir de novo.';
end;
$$;

-- Coleta a recompensa de uma missão já terminada.
-- Mente arcana (mago) recebe xp_missao (+20%).
create or replace function public.coletar_recompensa()
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi  public.herois;
  v_ativa  record;
  v_fim    timestamptz;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  select a.inicio, m.duracao_segundos, m.ouro, m.xp into v_ativa
    from public.missoes_ativas a
    join public.missoes m on m.id = a.missao_id
   where a.heroi_id = v_heroi.id;
  if not found then
    raise exception 'Nenhuma missão em andamento. Escolha uma missão no quadro.';
  end if;
  v_fim := v_ativa.inicio + make_interval(secs => v_ativa.duracao_segundos);
  if now() < v_fim then
    raise exception 'A missão ainda não terminou. Faltam % segundos.', ceil(extract(epoch from v_fim - now()))::int;
  end if;

  delete from public.missoes_ativas where heroi_id = v_heroi.id;
  update public.herois
     set ouro = ouro + v_ativa.ouro,
         xp = xp + public.xp_missao(classe, v_ativa.xp),
         missoes_concluidas = missoes_concluidas + 1
   where id = v_heroi.id
  returning * into v_heroi;

  return v_heroi;
end;
$$;

-- Registra o resultado de um combate da arena. O combate é resolvido no
-- front (para permitir controlar o Math.random nos testes); aqui só se
-- validam limites. O HP salvo é o de antes do combate, então a checagem
-- de "ferido" vale para o início da luta.
create or replace function public.registrar_combate(p_monstro text, p_resultado text, p_hp_final int)
returns public.herois
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heroi public.herois;
  v_max   int;
  v_xp    int;
  v_ouro  int;
begin
  select * into v_heroi from public.herois where user_id = auth.uid() for update;
  if not found then
    raise exception 'Você ainda não tem um personagem.';
  end if;
  if public.heroi_em_missao(v_heroi.id) then
    raise exception '% está em missão e não pode lutar agora.', v_heroi.nome;
  end if;
  if public.ferido(v_heroi) then
    raise exception '% está ferido demais para lutar. Descanse na taverna primeiro.', v_heroi.nome;
  end if;

  -- Recompensas dos monstros (mesma tabela de src/regras/combate.js)
  select r.xp, r.ouro into v_xp, v_ouro
    from (values ('goblin', 30, 15), ('troll', 80, 40), ('dragao', 250, 150)) as r (monstro, xp, ouro)
   where r.monstro = p_monstro;
  if not found then
    raise exception 'Esse adversário não existe na arena.';
  end if;
  if p_resultado is null or p_resultado not in ('vitoria', 'derrota', 'fuga') then
    raise exception 'O resultado do combate precisa ser vitória, derrota ou fuga.';
  end if;
  v_max := public.hp_max(v_heroi.classe, v_heroi.raca, v_heroi.constituicao, v_heroi.nivel);
  if p_hp_final is null or p_hp_final not between 1 and v_max then
    raise exception 'O HP final precisa ficar entre 1 e %.', v_max;
  end if;

  update public.herois
     set hp_atual = case when p_resultado = 'derrota' then 1 else p_hp_final end,
         xp = xp + case when p_resultado = 'vitoria' then v_xp else 0 end,
         ouro = ouro + case when p_resultado = 'vitoria' then v_ouro else 0 end
   where id = v_heroi.id
  returning * into v_heroi;

  return v_heroi;
end;
$$;

revoke execute on function public.ferido(public.herois) from public, anon;
grant execute on function public.ferido(public.herois) to authenticated;
revoke execute on function public.enviar_missao(text) from public, anon;
grant execute on function public.enviar_missao(text) to authenticated;
revoke execute on function public.coletar_recompensa() from public, anon;
grant execute on function public.coletar_recompensa() to authenticated;
revoke execute on function public.registrar_combate(text, text, int) from public, anon;
grant execute on function public.registrar_combate(text, text, int) to authenticated;
