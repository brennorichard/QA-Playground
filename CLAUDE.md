# Quality Quest: contexto do projeto

> Documento de contexto para o Claude Code. Atualizado em 06/10/2026.
> Coloque este arquivo na raiz do repositório com o nome `CLAUDE.md`: o Claude Code o lê automaticamente em toda sessão.

## 1. O que é

Aplicação web de RPG simples, com operações de CRUD, criada como **playground para a mentoria**. O objetivo não é ser um jogo complexo: cada tela existe para exercitar técnicas de teste (formulários, listas, rede, tempo, aleatoriedade, regras de negócio no banco).

- Cada jogador (conta) tem **exatamente um personagem**.
- O protótipo navegável está em `docs/prototipo/quality-quest-prototipo.html` e é a referência visual e de comportamento.

## 2. Decisões de arquitetura

| ADR | Status | Decisão |
|---|---|---|
| [ADR-001](docs/adr/ADR-001-vercel-mongodb-atlas.md) | Substituída | Monolito na Vercel + MongoDB Atlas |
| [ADR-002](docs/adr/ADR-002-github-pages-supabase.md) | **Vigente** | Front estático no **GitHub Pages** + **Supabase** (Postgres, Auth, API REST) acessado direto do front |

Motivos principais do ADR-002:

- Sem back-end próprio para manter.
- O front faz requisições HTTP reais à API REST do Supabase, que os testes E2E podem interceptar e chamar diretamente.
- O MongoDB Atlas não serve sem back-end: o Atlas Data API foi removido em 30/09/2025, e a credencial ficaria exposta no front.
- Firebase foi descartado porque o SDK do Firestore usa canais de streaming, o que dificulta interceptar as requisições nos testes.

Os ADRs completos ficam em `docs/adr/`.

## 3. Stack

- **Front:** React (via Vite), React Router com `HashRouter`, `@supabase/supabase-js`.
- **Banco, login e API:** Supabase (plano gratuito), com Row Level Security em todas as tabelas.
- **Hospedagem:** GitHub Pages (repositório público no plano gratuito).
- **Testes:** a automação E2E fica em outro repositório, feito na mentoria (ver seção 8).
- **CI/CD:** GitHub Actions.

### Limites dos planos gratuitos que afetam o projeto

- **Supabase:** projetos com pouca atividade por 7 dias são pausados (podem ser retomados pelo painel); 500 MB de banco; 5 GB de egress por mês; 50 mil usuários ativos por mês; sem backups retidos.
- **Supabase Auth:** o envio de e-mail embutido permite só **2 e-mails por hora** no projeto inteiro. Para o playground, desligar a confirmação de e-mail ou configurar SMTP próprio. O endpoint `/auth/v1/token` aceita 1.800 requisições por hora por IP, com picos de até 30: quem automatiza testes deve obter o token uma vez e reaproveitá-lo.
- **GitHub Pages:** limite flexível de 100 GB de banda por mês; só arquivos estáticos; não redireciona rotas desconhecidas para o `index.html` (por isso `HashRouter`).
- **GitHub Actions:** em repositório público, workflows agendados são desativados após 60 dias sem atividade no repositório.

## 4. Regras de negócio

### Personagem

- Um personagem por conta. Sem personagem, a ficha (`#/heroi`) mostra a criação em 5 etapas: Classe, Raça, Atributos, Brasão e nome, Revisão (com o d20). Só avança com a etapa atual válida. Depois de criado, só o nome pode ser alterado.
- **Nome do herói:** 3 a 40 caracteres, **único entre todos os jogadores** (sem diferenciar maiúsculas).
- **Classes** (cada uma tem uma vantagem exclusiva):

  | Chave | Nome | HP base | Atributo principal | Brasão padrão | Vantagem |
  |---|---|---|---|---|---|
  | `guerreiro` | Guerreiro | 12 | Força | visored-helm em `goles` | **Pele de ferro:** +2 de defesa na arena. |
  | `mago` | Mago | 6 | Inteligência | pointy-hat em `blau` | **Mente arcana:** +20% de XP ao concluir missões. |
  | `ladino` | Ladino | 8 | Destreza | hood em `purpura` | **Mãos leves:** itens do mercador custam 10% a menos (arredondado para cima). |
  | `clerigo` | Clérigo | 10 | Constituição | holy-symbol em `ouro` | **Bênção:** a recarga da taverna é de 15 s, e não 30 s. |
  | `arqueiro` | Arqueiro | 9 | Destreza | bowman em `sinople` | **Olho de águia:** na arena, 19 ou 20 natural é crítico. |

- **Raças** (bônus somados aos atributos distribuídos):

  | Chave | Nome | Bônus | Vantagem |
  |---|---|---|---|
  | `humano` | Humano | nenhum | **Versátil:** distribui 22 pontos, e não 20. |
  | `elfo` | Elfo | +1 Destreza, +1 Inteligência | **Graça élfica.** |
  | `anao` | Anão | +2 Constituição | **Robustez.** |
  | `halfling` | Halfling | +1 Destreza | **Sortudo:** rola o d20 inicial duas vezes e fica com o maior. |
  | `orc` | Orc | +2 Força, −1 Inteligência | **Brutalidade.** |

- **Atributos:** Força, Destreza, Inteligência e Constituição. O jogador distribui pontos de 1 a 10 em cada um (**base**), e a soma precisa ser **exatamente 20** (22 para Humano). O **valor efetivo** = base + bônus da raça, nunca abaixo de 1 (vai de 1 a 12). Todas as fórmulas usam o valor efetivo.
- **Brasão:** ícone (15 opções) sobre uma tintura (7 opções). Começa com o brasão padrão da classe e pode ser trocado na criação.

  | Ícones (`brasao_icone`) | Tinturas (`brasao_cor`): campo / ícone |
  |---|---|
  | visored-helm, pointy-hat, hood, holy-symbol, bowman, lion, eagle-emblem, wolf-head, griffin-symbol, owl, stag-head, bear-head, raven, fleur-de-lys, crown | `goles` `#B3262E`/branco, `blau` `#1F4E9C`/branco, `sinople` `#2E7A4B`/branco, `purpura` `#5E3480`/branco, `sable` `#1D2333`/branco, `ouro` `#C79325`/`#1D2333`, `prata` `#E4E8EE`/`#1D2333` |

  Nos metais (ouro e prata) o ícone fica escuro, pela regra da tintura da heráldica.
- **d20 na criação:** rolado uma única vez (duas para Halfling, valendo o maior), obrigatório. **Ouro inicial = resultado × 10.**
- **HP máximo** = HP base da classe + Constituição efetiva × nível. HP inicial = HP base + Constituição efetiva.
- **Subir de nível:** exige XP ≥ nível × 100. Ao subir: XP −= nível × 100, nível + 1, HP atual += Constituição efetiva.
- **Ferido:** HP atual abaixo de 30% do HP máximo. Herói ferido não pode partir em missão nem lutar na arena.
- **Ouro** pertence ao herói.
- **Aposentar herói:** apaga herói, inventário e ouro, e libera a criação de um novo personagem. Bloqueado enquanto o herói estiver em missão.
- **Nome de exibição do jogador:** 3 a 20 caracteres.

### Inventário e mercador

- Capacidade de **10 itens**.
- **Só uma arma equipada por vez:** equipar outra arma desequipa a anterior.
- Consumíveis têm o botão "Usar": curam HP até o máximo e somem do inventário. Não podem ser usados com HP completo.
- Comprar exige ouro suficiente ("Ouro insuficiente. Faltam X moedas.") e espaço livre no inventário. Para Ladino, o preço cobrado é ⌈preço × 0,9⌉ (ex.: 45 → 41, 1200 → 1080), e a tela mostra o preço cheio riscado.
- Catálogo inicial (também no seed):

  | id | Nome | Ícone | Raridade | Tipo | Preço | Cura |
  |---|---|---|---|---|---|---|
  | `espada-longa` | Espada longa | broadsword | comum | arma | 60 | |
  | `escudo-redondo` | Escudo redondo | round-shield | comum | defesa | 45 | |
  | `pocao-cura` | Poção de cura | standing-potion | comum | consumivel | 25 | 20 |
  | `botas-ligeiras` | Botas ligeiras | boots | raro | equipamento | 120 | |
  | `frasco-alquimico` | Frasco alquímico | bubbling-flask | raro | consumivel | 150 | 45 |
  | `adaga-sombria` | Adaga sombria | plain-dagger | raro | arma | 180 | |
  | `grimorio` | Grimório das brumas | spell-book | epico | arma | 420 | |
  | `varinha-cristal` | Varinha de cristal | crystal-wand | epico | arma | 380 | |
  | `machado-anciao` | Machado ancião | battle-axe | lendario | arma | 900 | |
  | `colar-estrelas` | Colar das estrelas | gem-necklace | lendario | acessorio | 1200 | |

### Taverna

- Descansar recupera todo o HP.
- Depois de descansar, é preciso esperar **30 segundos** (15 para Clérigo) para descansar de novo.
- Não é possível descansar em missão. Com HP completo, o botão fica desabilitado.

### Missões

- **Uma missão por vez.** Enquanto houver missão ativa, os botões "Partir em missão" ficam desabilitados.
- Quando o tempo acaba, aparece "Coletar recompensa": soma ouro, XP e +1 em missões concluídas. Mago recebe XP × 1,2, arredondado (com a tabela atual: 60, 144, 360 e 1800).

  | id | Nome | Dificuldade | Duração | Ouro | XP |
  |---|---|---|---|---|---|
  | `porao` | Limpar o porão da taverna | fácil | 10 s | 30 | 50 |
  | `caravana` | Escoltar a caravana até Vila Serena | média | 60 s | 80 | 120 |
  | `torre` | Investigar a torre abandonada | difícil | 2 h | 200 | 300 |
  | `dragao` | Caçar o dragão de Monte Cinza | lendária | 8 h | 1000 | 1500 |

### Arena

O combate é resolvido no front (para permitir controlar o `Math.random` nos testes) e o resultado é registrado no banco por uma função RPC.

- **Ataque do herói:** d20 + mod contra a defesa do monstro, onde mod = ⌊atributo principal efetivo ÷ 2⌋. Um 20 natural (19 ou 20 para Arqueiro) sempre acerta e dobra o dano (crítico). Dano = d8 + mod.
- **Defender:** +4 de defesa no turno.
- **Defesa do herói:** 10 + ⌊Destreza efetiva ÷ 2⌋, +2 para Guerreiro.
- **Ataque do monstro:** d20 + bônus contra a defesa do herói. Dano conforme a tabela.
- **Vitória:** herói ganha o XP e o ouro do monstro. **Derrota:** herói fica com 1 de HP. **Fuga:** encerra sem recompensa.
- Não é possível lutar em missão nem ferido.

  | Chave | Nome | Ícone | HP | Defesa | Bônus | Dano | XP | Ouro |
  |---|---|---|---|---|---|---|---|---|
  | `goblin` | Goblin saqueador | goblin-head | 20 | 9 | +3 | 1d6 | 30 | 15 |
  | `troll` | Troll da ponte | troll | 45 | 11 | +5 | 2d6 | 80 | 40 |
  | `dragao` | Dragão de Monte Cinza | dragon-head | 90 | 14 | +8 | 2d10 | 250 | 150 |

### Hall da Fama

- Lista os heróis de **todos** os jogadores (um por conta), com o brasão de cada um e o do jogador destacado.
- Busca por nome do herói ou do jogador, filtro por classe, ordenação por "Maior nível" (desempate: missões, depois nome) ou "Mais missões concluídas" (desempate: nível, depois nome).
- **8 por página.** A posição exibida é a do ranking geral, mesmo com filtros aplicados.
- Mostra "Seu herói está em Xº lugar".

## 5. Telas e rotas

Todas as rotas usam `HashRouter` (`/#/...`). Fora o Portão, todas são protegidas: sem sessão, redirecionam para `#/portao`.

| Fase | Rota | Tela | Pontos principais |
|---|---|---|---|
| MVP | `#/portao` | Portão da Guilda | Abas Entrar / Criar conta, validação, "Esqueci minha senha". Após login, vai para `#/heroi`. |
| MVP | `#/heroi` | Ficha do herói (tela inicial) | **Sem herói:** criação em 5 etapas (cartões de classe e raça com vantagens, atributos com bônus da raça e "Sugerir para a classe", brasão e nome, revisão com d20), com prévia ao lado. **Com herói:** brasão, HP, XP, atributos (base + bônus), vantagens, editar nome, subir de nível, aposentar (modal, volta para a criação). |
| MVP | `#/hall-da-fama` | Hall da Fama | Tabela com busca, filtro, ordenação e paginação. |
| 2 | `#/inventario` | Inventário | Itens, espaços usados, equipar, usar, descartar (modal). |
| 2 | `#/mercador` | Mercador | Saldo, filtro por raridade, comprar. |
| 2 | `#/taverna` | Taverna | Descansar com tempo de recarga. |
| 3 | `#/missoes` | Quadro de missões | Missões disponíveis, missão atual com progresso, coletar recompensa. |
| 3 | `#/arena` | Arena | Escolha do monstro, combate por turnos, registro do combate. |
| Geral | `#/configuracoes` | Configurações | Nome de exibição, tema claro/escuro (localStorage), sair, excluir conta (exige digitar "excluir"). |
| Geral | qualquer outra | Perdido na masmorra (404) | Mostra a rota inexistente e volta para a ficha. |

Telas que dependem de herói mostram um estado vazio ("Você ainda não tem um personagem") com o botão "Criar personagem" (que leva a `#/heroi`) quando o jogador não tem um.

O protótipo tem controles só de demonstração no topo ("Simular primeiro acesso" e "+100 XP"), que não entram no app.

## 6. Banco de dados (proposta inicial)

Princípios:

- **Regras críticas ficam no banco** (constraints, grants e funções RPC). O front valida para dar feedback, mas não é a fonte da verdade.
- O cliente **não altera ouro, XP, HP nem inventário diretamente**: isso só acontece por funções RPC. Do herói, o cliente só pode editar o `nome`.

### Esquema e seed

A fonte da verdade são os arquivos versionados (não duplicar o SQL aqui):

- [`supabase/schema.sql`](supabase/schema.sql): tabelas `perfis`, `herois`, `itens`, `inventario`, `missoes` e `missoes_ativas`; funções de regra (`bonus_raca`, `atributo_efetivo`, `hp_max`, `preco_para`, `xp_missao`, `recarga_taverna`, `heroi_em_missao`, `ferido`); todas as RPCs da tabela abaixo; trigger `criar_perfil` (cria o perfil no cadastro a partir de `nome_exibicao` em `options.data` do `signUp`); políticas de RLS; grants; view `hall_da_fama`.
- [`supabase/seed.sql`](supabase/seed.sql): catálogo de itens e de missões (mesmos dados das tabelas da seção 4).

Pontos do esquema que afetam o front e os testes:

- `herois.user_id` é `unique`: garante um herói por conta.
- `herois` guarda os atributos **base** (1 a 10). A constraint `pontos_de_atributo_validos` exige soma 20, ou 22 para `humano`. O valor efetivo vem de `atributo_efetivo(raca, atributo, base)` e não é armazenado.
- `herois.brasao_icone` e `herois.brasao_cor` aceitam só as opções da seção 4 (check constraints).
- O índice `herois_nome_unico` em `lower(btrim(nome))` garante o nome único entre jogadores. Para dar feedback antes de criar, o front consulta a view `hall_da_fama` (`nome ilike ...` e `meu = false`), já que o RLS de `herois` só mostra o próprio herói. O banco continua sendo a garantia: em `criar_personagem`, a RPC captura `unique_violation` e responde com `hint = 'nome_em_uso'` (o front volta para a etapa do nome). Na edição de nome (`PATCH` direto em `herois`), o serviço do front traduz o código `23505`.
- A política de DELETE de `herois` usa a função `heroi_em_missao` (security definer). Consultar `missoes_ativas` direto na política gera recursão infinita no RLS, porque a política de `missoes_ativas` consulta `herois`.
- Recusas vindas de constraints chegam com a mensagem em português e o nome da constraint em `details` (útil nos testes de API).
- A view `hall_da_fama` expõe `posicao_nivel` e `posicao_missoes`, calculadas sobre todos os heróis. Filtros aplicados pela API não mudam a posição, e "Seu herói está em Xº lugar" vem da linha com `meu = true`.

### Funções RPC

Todas `security definer`, com `set search_path = ''`, operando sempre no herói de `auth.uid()` e lançando erros com mensagens claras em português (o front exibe a mensagem no toast).

| Função | Parâmetros | Regras |
|---|---|---|
| `criar_personagem` | nome, classe, raca, forca, destreza, inteligencia, constituicao, brasao_icone, brasao_cor, d20 | Jogador sem herói; atributos base (soma validada pela constraint, 20 ou 22); d20 entre 1 e 20 (para Halfling, o front já envia o maior das duas rolagens); ouro = d20 × 10; HP = `hp_max(classe, raca, constituicao, 1)`; nome repetido (`unique_violation`) vira "Já existe um herói com esse nome. Escolha outro." |
| `subir_nivel` | — | XP ≥ nível × 100; aplica a regra de subida (HP atual += `atributo_efetivo(raca, 'constituicao', constituicao)`). |
| `comprar_item` | item_id | Cobra `preco_para(classe, preco)`; ouro suficiente e menos de 10 itens; debita e insere na mesma transação. |
| `equipar_item` | inventario_id | Item do próprio herói, não consumível; alterna; se for arma, desequipa a anterior. |
| `usar_item` | inventario_id | Consumível; HP abaixo do máximo; cura até o máximo e remove o item. |
| `descansar` | — | Fora de missão; `now()` ≥ `descanso_disponivel_em`; HP abaixo do máximo; HP = máximo; recarga = `now()` + `recarga_taverna(classe)`. |
| `enviar_missao` | missao_id | Sem missão ativa; HP ≥ 30% do máximo. |
| `coletar_recompensa` | — | `now()` ≥ início + duração; soma ouro, `xp_missao(classe, xp)` e missões; apaga a missão ativa. |
| `registrar_combate` | monstro, resultado, hp_final | Fora de missão; herói não ferido (o HP salvo no banco é o de antes do combate, então a função checa HP atual ≥ 30% do máximo); resultado em vitória, derrota ou fuga; HP final entre 1 e o máximo; vitória soma XP e ouro do monstro. |

Em todas as funções, "máximo" é `hp_max(classe, raca, constituicao, nivel)`.

Todas estão implementadas. As das fases 2 e 3 ficam nos blocos "Fase 2" e "Fase 3" do fim do `schema.sql`, com `create or replace`, para rodar só o bloco num projeto existente. Retornos: `equipar_item` devolve a linha de `inventario`, `enviar_missao` a de `missoes_ativas` e as demais o herói atualizado. Descartar item não tem RPC: é um `DELETE` em `inventario`, liberado pelo RLS. Em `registrar_combate`, a derrota grava HP 1 independentemente do `hp_final` enviado, e as recompensas dos monstros estão na própria função (mesma tabela de `src/regras/combate.js`).

Ponto de atenção: o d20 da criação e o combate (incluindo Pele de ferro e Olho de águia) são resolvidos no front de propósito, para que os testes possam controlar o `Math.random`. Isso permite trapaça, o que é aceitável num playground. As funções só validam limites.

## 7. Front-end

### Estrutura sugerida

```
├─ CLAUDE.md
├─ README.md
├─ CREDITS.md                   créditos de ícones (CC BY 3.0) e fontes
├─ .env.example                 modelo das variáveis (o .env não é commitado)
├─ docs/
│  ├─ adr/                      ADR-001 (substituída) e ADR-002 (vigente)
│  └─ prototipo/                quality-quest-prototipo.html
├─ supabase/
│  ├─ schema.sql
│  └─ seed.sql
├─ src/
│  ├─ assets/icons/             SVGs do game-icons.net (fill = currentColor)
│  ├─ components/               Escudo, IconeItem, Medidor, Modal, Toasts, EstadoVazio...
│  ├─ contexto/                 sessão, herói e perfil do jogador, tema
│  ├─ lib/supabase.js           cliente único do Supabase
│  ├─ services/                 único lugar que fala com o Supabase
│  ├─ regras/                   constantes do jogo (classes, raças, monstros, fórmulas)
│  ├─ pages/                    uma pasta por tela
│  └─ main.jsx                  HashRouter
└─ .github/workflows/           deploy.yml, keep-alive.yml
```

### Configuração

- `vite.config.js` com `base: '/nome-do-repo/'`.
- `HashRouter` para evitar 404 ao recarregar no Pages.
- Ícones SVG importados como componente com `vite-plugin-svgr` (`import Icone from './x.svg?react'`), com `fill="currentColor"` nos arquivos.
- Fontes self-hosted via Fontsource, sem requisição externa.
- Variáveis de build (prefixo `VITE_`, embutidas no bundle):

  | Variável | Uso |
  |---|---|
  | `VITE_SUPABASE_URL` | URL do projeto |
  | `VITE_SUPABASE_KEY` | Chave pública (anon/publishable) |

- **A chave secreta do Supabase (service role/secret) nunca entra no front.**

### Design (seguir o protótipo)

- **Conceito:** heráldica. Cada herói tem um brasão (escudo com uma tintura e um ícone), que começa com o padrão da classe e pode ser personalizado na criação. Itens usam um octógono com gradiente radial por raridade. Monstros usam um círculo vermelho.
- **Escudo:** `viewBox="0 0 100 120"`, path `M8 6 H92 V50 C92 84 72 102 50 113 C28 102 8 84 8 50 Z`, contorno dourado `#C79325`.
- **Octógono:** `viewBox="0 0 512 512"`, pontos `256,0 437,75 512,256 437,437 256,512 75,437 0,256 75,75`.
- **Gradientes de raridade (centro → borda):** comum `#A3ABB8 → #4B5465`, raro `#4D93E8 → #163C7A`, épico `#E8234A → #7A12C9`, lendário `#F2B536 → #94570A`.
- **Tipografia:** Grenze Gotisch nos títulos, Alegreya Sans no restante.
- **Cores (tema claro):** fundo `#DDE1E4`, superfície `#F5F6F4`, texto `#1D2333`, texto secundário `#566074`, dourado `#C79325`, vermelho `#B3262E`, azul `#1F4E9C`, verde `#2E7A4B`, roxo `#6A3A8B`. O tema escuro está definido no protótipo.
- **Textos:** português do Brasil, frases em caixa normal, botões com verbos que dizem exatamente o que acontece, erros que explicam como corrigir.

### Ícones e licença

Ícones do [game-icons.net](https://game-icons.net), licença **CC BY 3.0** (crédito obrigatório, adaptações permitidas). Registrar em `CREDITS.md` autor, ícone e a observação de que as cores foram modificadas.

| Autor | Ícones usados |
|---|---|
| Lorc | wooden-sign, quill-ink, knapsack, beer-stein, treasure-map, crossed-swords, cog, visored-helm, pointy-hat, hood, holy-symbol, bowman, sprint, brain, heart-organ, sands-of-time, campfire, magnifying-glass, quill, sun, moon, broadsword, standing-potion, bubbling-flask, gem-necklace, boots, crystal-wand, battle-axe, plain-dagger, dragon-head, cross-mark, checked-shield, barefoot, lion, eagle-emblem, wolf-head, owl, stag-head, raven, crown |
| Delapouite | open-gate, scroll-quill, shop, laurels-trophy, dungeon-gate, biceps, dice-twenty-faces-twenty, two-coins, stars-stack, exit-door, trash-can, upgrade, spell-book, goblin-head, check-mark, person, woman-elf-face, dwarf-face, orc-head, griffin-symbol, bear-head, fleur-de-lys |
| Skoll | hearts, troll |
| Willdabeast | round-shield |

O repositório oficial dos ícones é `github.com/game-icons/icons` (pastas por autor, SVGs com fundo preto e desenho branco: remover o path de fundo `M0 0h512v512H0z` e trocar `fill="#fff"` por `currentColor`).

## 8. Testabilidade

A automação dos testes **não fica neste repositório**: ela é feita durante a mentoria, em um repositório separado que roda sobre o Quality Quest. Aqui não entram ferramentas, specs, comandos nem roteiros de teste; o papel deste projeto é ser um app testável.

### Convenção de seletores

Todo elemento interativo ou verificável recebe `data-cy` em kebab-case, com prefixo pelo tipo:

- `btn-` botões, `input-` campos, `select-` selects, `opcao-` radios, `link-` links, `nav-` itens de menu, `filtro-` filtros;
- `toast-sucesso` e `toast-erro` para avisos; `modal-confirmacao`, `btn-modal-confirmar`, `btn-modal-cancelar`, `input-confirmacao` no modal;
- `erro-<campo>` para mensagens de validação.

O protótipo já define os `data-cy` de cada tela e tem a chave "Mostrar data-cy" para visualizá-los.

### Decisões que existem para permitir testes

- Toda leitura e escrita passa pela API REST do Supabase (`/rest/v1/...` e `/rest/v1/rpc/...`), sem canais de streaming.
- O d20 da criação e os dados do combate usam `Math.random` no front (ver `rolar` em `src/regras/formulas.js`).
- As contagens regressivas (taverna e missões) usam o relógio do navegador (`Date.now()`), enquanto o banco valida com `now()`.
- As recusas das funções RPC chegam com a mensagem em português; as que vêm de constraints trazem o nome da constraint em `details`.

## 9. CI/CD

- **`deploy.yml` (push na `main`):** instalar → build → publicar no GitHub Pages.
- **`keep-alive.yml` (cron diário):** uma consulta simples na API para evitar a pausa do Supabase por inatividade.

## 10. Roteiro

1. **MVP:** Portão, Ficha do herói (com a criação), Hall da Fama e Configurações (sem "Excluir conta", em aberto). Esquema, RLS, seed, `criar_personagem` e `subir_nivel`. **Implementado** (06/10/2026).
2. **Fase 2:** Inventário, Mercador, Taverna e as RPCs correspondentes. **Implementado** (13/10/2026).
3. **Fase 3:** Quadro de missões e Arena. **Implementado** (13/10/2026).

## 11. Em aberto

- Como excluir a conta de verdade: exige a chave secreta (Edge Function) ou uma função no banco com acesso a `auth.users`.
- Cadastro aberto com confirmação de e-mail desligada, ou contas criadas manualmente no painel.
- Política final para a pausa do Supabase (workflow agendado ou uso manual).

## 12. Como trabalhar neste repositório

- Consultar este documento e o protótipo antes de implementar uma tela. O CSS do app (`src/styles/global.css`) é o do protótipo: mudanças visuais entram nos dois.
- Os ícones de `src/assets/icons/` são os mesmos do protótipo; ícone novo precisa de crédito em `CREDITS.md`.
- Todo acesso ao Supabase passa por `src/services/`. Componentes nunca chamam o Supabase direto.
- Regra de negócio nova vai para o banco (constraint, grant ou RPC). A validação no front serve para feedback.
- Mudanças de banco entram em `supabase/schema.sql` ou `supabase/seed.sql`, versionadas.
- Manter os `data-cy` do protótipo e seguir a convenção ao criar elementos novos.
- Não adicionar ferramentas, specs nem roteiros de teste automatizado: isso é feito na mentoria, em outro repositório.
- Nunca commitar `.env` nem chaves secretas.
- Textos da interface em português do Brasil.
