import { supabase } from '../lib/supabase';
import { executar } from './erros';
import { paraHeroi } from './herois';

function paraMissao(l) {
  return {
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    dificuldade: l.dificuldade,
    duracao: l.duracao_segundos,
    ouro: l.ouro,
    xp: l.xp
  };
}

export async function listarMissoes() {
  const { data } = await executar(
    supabase.from('missoes').select('id, nome, descricao, dificuldade, duracao_segundos, ouro, xp').order('duracao_segundos'),
    'Não foi possível carregar o quadro de missões.'
  );
  return data.map(paraMissao);
}

// Missão em andamento ({ missaoId, inicio }) ou null. O RLS só devolve a do próprio herói.
export async function buscarMissaoAtiva() {
  const { data } = await executar(
    supabase.from('missoes_ativas').select('missao_id, inicio').maybeSingle(),
    'Não foi possível conferir a missão em andamento.'
  );
  return data && { missaoId: data.missao_id, inicio: data.inicio };
}

export async function enviarMissao(missaoId) {
  const { data } = await executar(supabase.rpc('enviar_missao', { p_missao_id: missaoId }), 'Não foi possível partir em missão.');
  return { missaoId: data.missao_id, inicio: data.inicio };
}

export async function coletarRecompensa() {
  const { data } = await executar(supabase.rpc('coletar_recompensa'), 'Não foi possível coletar a recompensa.');
  return paraHeroi(data);
}
