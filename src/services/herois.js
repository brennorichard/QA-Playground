import { supabase } from '../lib/supabase';
import { ErroServico, executar } from './erros';

const COLUNAS = 'id, nome, classe, raca, brasao_icone, brasao_cor, nivel, xp, forca, destreza, inteligencia, constituicao, hp_atual, ouro, missoes_concluidas, descanso_disponivel_em';

// Linha do banco → herói usado na interface
export function paraHeroi(l) {
  if (!l) return null;
  return {
    id: l.id,
    nome: l.nome,
    classe: l.classe,
    raca: l.raca,
    brasao: { icone: l.brasao_icone, tintura: l.brasao_cor },
    base: { forca: l.forca, destreza: l.destreza, inteligencia: l.inteligencia, constituicao: l.constituicao },
    nivel: l.nivel,
    xp: l.xp,
    hpAtual: l.hp_atual,
    ouro: l.ouro,
    missoes: l.missoes_concluidas,
    descansoDisponivelEm: l.descanso_disponivel_em
  };
}

// O RLS só devolve o herói do próprio jogador
export async function buscarMeuHeroi() {
  const { data } = await executar(supabase.from('herois').select(COLUNAS).maybeSingle(), 'Não foi possível carregar o seu herói.');
  return paraHeroi(data);
}

export async function criarPersonagem({ nome, classe, raca, base, brasao, d20 }) {
  const { data } = await executar(supabase.rpc('criar_personagem', {
    p_nome: nome.trim(),
    p_classe: classe,
    p_raca: raca,
    p_forca: base.forca,
    p_destreza: base.destreza,
    p_inteligencia: base.inteligencia,
    p_constituicao: base.constituicao,
    p_brasao_icone: brasao.icone,
    p_brasao_cor: brasao.tintura,
    p_d20: d20
  }), 'Não foi possível criar o personagem.');
  return paraHeroi(data);
}

// Do herói, o cliente só pode editar o nome (grant de coluna no banco)
export async function renomearHeroi(id, nome) {
  const { data } = await executar(
    supabase.from('herois').update({ nome: nome.trim() }).eq('id', id).select(COLUNAS).single(),
    'Não foi possível salvar o nome.'
  );
  return paraHeroi(data);
}

export async function subirNivel() {
  const { data } = await executar(supabase.rpc('subir_nivel'), 'Não foi possível subir de nível.');
  return paraHeroi(data);
}

// O RLS não apaga herói em missão e também não gera erro: confere se algo foi apagado
export async function aposentarHeroi(id) {
  const { data } = await executar(supabase.from('herois').delete().eq('id', id).select('id'), 'Não foi possível aposentar o herói.');
  if (!data.length) throw new ErroServico('O herói está em missão e não pode ser aposentado agora.');
}

// Feedback rápido na criação e na edição. O banco garante a unicidade de qualquer forma.
export async function nomeEmUso(nome) {
  const termo = nome.trim().replace(/[\\%_]/g, c => `\\${c}`);
  const { count } = await executar(
    supabase.from('hall_da_fama').select('nome', { count: 'exact', head: true }).ilike('nome', termo).eq('meu', false),
    'Não foi possível conferir o nome.'
  );
  return count > 0;
}
