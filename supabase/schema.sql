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
