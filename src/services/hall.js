import { supabase } from '../lib/supabase';
import { executar } from './erros';

export const POR_PAGINA = 8;

// A posição vem da view (ranking geral), então filtros não mudam a numeração
const COLUNA_POSICAO = { nivel: 'posicao_nivel', missoes: 'posicao_missoes' };

// Valor entre aspas para o filtro or() do PostgREST (aceita vírgulas e parênteses no termo)
const valorIlike = termo => `"*${termo.replace(/[\\"]/g, c => `\\${c}`)}*"`;

function paraLinha(l, ordem) {
  return {
    posicao: l[COLUNA_POSICAO[ordem]],
    nome: l.nome,
    jogador: l.jogador,
    classe: l.classe,
    brasao: { icone: l.brasao_icone, tintura: l.brasao_cor },
    nivel: l.nivel,
    missoes: l.missoes_concluidas,
    meu: l.meu
  };
}

export async function listarHall({ busca = '', classe = '', ordem = 'nivel', pagina = 1 }) {
  const coluna = COLUNA_POSICAO[ordem];
  let consulta = supabase.from('hall_da_fama').select('*', { count: 'exact' });
  const termo = busca.trim();
  if (termo) consulta = consulta.or(`nome.ilike.${valorIlike(termo)},jogador.ilike.${valorIlike(termo)}`);
  if (classe) consulta = consulta.eq('classe', classe);
  const inicio = (pagina - 1) * POR_PAGINA;
  const { data, count } = await executar(
    consulta.order(coluna).range(inicio, inicio + POR_PAGINA - 1),
    'Não foi possível carregar o Hall da Fama.'
  );
  return { linhas: data.map(l => paraLinha(l, ordem)), total: count };
}

export async function minhaPosicao(ordem = 'nivel') {
  const coluna = COLUNA_POSICAO[ordem];
  const { data } = await executar(
    supabase.from('hall_da_fama').select(coluna).eq('meu', true).maybeSingle(),
    'Não foi possível carregar a sua posição.'
  );
  return data ? data[coluna] : null;
}
