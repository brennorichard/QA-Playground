insert into public.itens (id, nome, icone, raridade, tipo, preco, cura) values
  ('espada-longa',     'Espada longa',        'broadsword',      'comum',    'arma',        60,   null),
  ('escudo-redondo',   'Escudo redondo',      'round-shield',    'comum',    'defesa',      45,   null),
  ('pocao-cura',       'Poção de cura',       'standing-potion', 'comum',    'consumivel',  25,   20),
  ('botas-ligeiras',   'Botas ligeiras',      'boots',           'raro',     'equipamento', 120,  null),
  ('frasco-alquimico', 'Frasco alquímico',    'bubbling-flask',  'raro',     'consumivel',  150,  45),
  ('adaga-sombria',    'Adaga sombria',       'plain-dagger',    'raro',     'arma',        180,  null),
  ('grimorio',         'Grimório das brumas', 'spell-book',      'epico',    'arma',        420,  null),
  ('varinha-cristal',  'Varinha de cristal',  'crystal-wand',    'epico',    'arma',        380,  null),
  ('machado-anciao',   'Machado ancião',      'battle-axe',      'lendario', 'arma',        900,  null),
  ('colar-estrelas',   'Colar das estrelas',  'gem-necklace',    'lendario', 'acessorio',   1200, null);

insert into public.missoes (id, nome, descricao, dificuldade, duracao_segundos, ouro, xp) values
  ('porao',    'Limpar o porão da taverna',           'Ratos gigantes tomaram o estoque de cerveja.',               'facil',    10,    30,   50),
  ('caravana', 'Escoltar a caravana até Vila Serena', 'Mercadores precisam de proteção na estrada do norte.',       'media',    60,    80,   120),
  ('torre',    'Investigar a torre abandonada',       'Luzes estranhas aparecem no alto da torre durante a noite.', 'dificil',  7200,  200,  300),
  ('dragao',   'Caçar o dragão de Monte Cinza',       'O rei paga em ouro a quem voltar com uma escama dourada.',   'lendaria', 28800, 1000, 1500);
