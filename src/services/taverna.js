import { supabase } from '../lib/supabase';
import { executar } from './erros';
import { paraHeroi } from './herois';

export async function descansar() {
  const { data } = await executar(supabase.rpc('descansar'), 'Não foi possível descansar.');
  return paraHeroi(data);
}
