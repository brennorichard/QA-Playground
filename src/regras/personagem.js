// Constantes do personagem. As mesmas regras valem no banco (supabase/schema.sql):
// o front usa estes dados para exibir e validar; o banco é a fonte da verdade.

export const PONTOS_BASE = 20;
export const MIN_ATR = 1;
export const MAX_ATR = 10;
export const MAX_PIPS = 12;
export const NOME_HEROI_MIN = 3;
export const NOME_HEROI_MAX = 40;
export const NOME_EXIBICAO_MIN = 3;
export const NOME_EXIBICAO_MAX = 20;

export const ATRIBUTOS = {
  forca:        { nome: 'Força',        icone: 'biceps',      desc: 'Ataque e dano de guerreiros' },
  destreza:     { nome: 'Destreza',     icone: 'sprint',      desc: 'Defesa na arena; ataque de ladinos e arqueiros' },
  inteligencia: { nome: 'Inteligência', icone: 'brain',       desc: 'Ataque e dano de magos' },
  constituicao: { nome: 'Constituição', icone: 'heart-organ', desc: 'HP máximo a cada nível' }
};

// Tinturas heráldicas. Em metais (ouro e prata) o ícone fica escuro (regra da tintura).
export const TINTURAS = {
  goles:   { nome: 'Goles',   campo: '#B3262E', carga: '#FFFFFF' },
  blau:    { nome: 'Blau',    campo: '#1F4E9C', carga: '#FFFFFF' },
  sinople: { nome: 'Sinople', campo: '#2E7A4B', carga: '#FFFFFF' },
  purpura: { nome: 'Púrpura', campo: '#5E3480', carga: '#FFFFFF' },
  sable:   { nome: 'Sable',   campo: '#1D2333', carga: '#FFFFFF' },
  ouro:    { nome: 'Ouro',    campo: '#C79325', carga: '#1D2333' },
  prata:   { nome: 'Prata',   campo: '#E4E8EE', carga: '#1D2333' }
};

export const CLASSES = {
  guerreiro: { nome: 'Guerreiro', icone: 'visored-helm', tintura: 'goles',   hpBase: 12, principal: 'forca',
    vantagem: { nome: 'Pele de ferro', texto: '+2 de defesa nos combates da arena.' },
    prioridade: ['forca', 'constituicao', 'destreza', 'inteligencia'] },
  mago:      { nome: 'Mago',      icone: 'pointy-hat',   tintura: 'blau',    hpBase: 6,  principal: 'inteligencia',
    vantagem: { nome: 'Mente arcana', texto: '+20% de XP ao concluir missões.' },
    prioridade: ['inteligencia', 'constituicao', 'destreza', 'forca'] },
  ladino:    { nome: 'Ladino',    icone: 'hood',         tintura: 'purpura', hpBase: 8,  principal: 'destreza',
    vantagem: { nome: 'Mãos leves', texto: 'Itens do mercador custam 10% a menos.' },
    prioridade: ['destreza', 'inteligencia', 'constituicao', 'forca'] },
  clerigo:   { nome: 'Clérigo',   icone: 'holy-symbol',  tintura: 'ouro',    hpBase: 10, principal: 'constituicao',
    vantagem: { nome: 'Bênção', texto: 'O descanso na taverna recarrega em 15 segundos, e não em 30.' },
    prioridade: ['constituicao', 'inteligencia', 'forca', 'destreza'] },
  arqueiro:  { nome: 'Arqueiro',  icone: 'bowman',       tintura: 'sinople', hpBase: 9,  principal: 'destreza',
    vantagem: { nome: 'Olho de águia', texto: 'Na arena, acerta crítico com 19 ou 20 no d20.' },
    prioridade: ['destreza', 'forca', 'constituicao', 'inteligencia'] }
};

export const RACAS = {
  humano:   { nome: 'Humano',   icone: 'person',         bonus: {},                              pontosExtras: 2,
    vantagem: { nome: 'Versátil', texto: 'Começa com 22 pontos de atributo para distribuir, e não 20.' } },
  elfo:     { nome: 'Elfo',     icone: 'woman-elf-face', bonus: { destreza: 1, inteligencia: 1 }, pontosExtras: 0,
    vantagem: { nome: 'Graça élfica', texto: '+1 em Destreza e +1 em Inteligência.' } },
  anao:     { nome: 'Anão',     icone: 'dwarf-face',     bonus: { constituicao: 2 },             pontosExtras: 0,
    vantagem: { nome: 'Robustez', texto: '+2 em Constituição, o que aumenta o HP a cada nível.' } },
  halfling: { nome: 'Halfling', icone: 'barefoot',       bonus: { destreza: 1 },                 pontosExtras: 0,
    vantagem: { nome: 'Sortudo', texto: '+1 em Destreza, e rola o d20 inicial duas vezes, ficando com o maior resultado.' } },
  orc:      { nome: 'Orc',      icone: 'orc-head',       bonus: { forca: 2, inteligencia: -1 },   pontosExtras: 0,
    vantagem: { nome: 'Brutalidade', texto: '+2 em Força, mas −1 em Inteligência (nunca abaixo de 1).' } }
};

export const ICONES_BRASAO = [
  { id: 'visored-helm', nome: 'Elmo' }, { id: 'pointy-hat', nome: 'Chapéu' }, { id: 'hood', nome: 'Capuz' },
  { id: 'holy-symbol', nome: 'Símbolo' }, { id: 'bowman', nome: 'Arqueiro' }, { id: 'lion', nome: 'Leão' },
  { id: 'eagle-emblem', nome: 'Águia' }, { id: 'wolf-head', nome: 'Lobo' }, { id: 'griffin-symbol', nome: 'Grifo' },
  { id: 'owl', nome: 'Coruja' }, { id: 'stag-head', nome: 'Cervo' }, { id: 'bear-head', nome: 'Urso' },
  { id: 'raven', nome: 'Corvo' }, { id: 'fleur-de-lys', nome: 'Flor-de-lis' }, { id: 'crown', nome: 'Coroa' }
];

// Distribuições sugeridas, na ordem de prioridade da classe
export const SUGESTOES = { 20: [8, 6, 4, 2], 22: [9, 7, 4, 2] };

export const ETAPAS = [
  { id: 'classe', titulo: 'Classe' },
  { id: 'raca', titulo: 'Raça' },
  { id: 'atributos', titulo: 'Atributos' },
  { id: 'brasao', titulo: 'Brasão e nome' },
  { id: 'revisao', titulo: 'Revisão' }
];
