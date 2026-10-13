import { supabase } from '../lib/supabase';
import { executar } from './erros';
import { paraHeroi } from './herois';

// O combate é resolvido no front; o banco registra o resultado e valida limites
export async function registrarCombate({ monstro, resultado, hpFinal }) {
  const { data } = await executar(
    supabase.rpc('registrar_combate', { p_monstro: monstro, p_resultado: resultado, p_hp_final: hpFinal }),
    'Não foi possível registrar o combate.'
  );
  return paraHeroi(data);
}
