import { supabase } from '../lib/supabase';
import { executar } from './erros';

// O perfil é criado pelo banco no cadastro (trigger criar_perfil)
export async function buscarMeuPerfil() {
  const { data } = await executar(supabase.from('perfis').select('user_id, nome_exibicao').maybeSingle(), 'Não foi possível carregar o seu perfil.');
  return data && { userId: data.user_id, nomeExibicao: data.nome_exibicao };
}

export async function salvarNomeExibicao(userId, nome) {
  const { data } = await executar(
    supabase.from('perfis').update({ nome_exibicao: nome.trim() }).eq('user_id', userId).select('user_id, nome_exibicao').single(),
    'Não foi possível salvar o nome de exibição.'
  );
  return { userId: data.user_id, nomeExibicao: data.nome_exibicao };
}
