// Constantes do quadro de missões. As mesmas regras valem no banco
// (supabase/schema.sql: enviar_missao, coletar_recompensa, xp_missao).

export const DIFICULDADES = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', lendaria: 'Lendária' };

// Mente arcana (mago): +20% de XP nas missões, arredondado
export function xpMissao(classe, xp) {
  return classe === 'mago' ? Math.round(xp * 1.2) : xp;
}

export function duracaoTexto(segundos) {
  if (segundos < 60) return `${segundos} segundos`;
  if (segundos < 3600) { const m = segundos / 60; return `${m} ${m === 1 ? 'minuto' : 'minutos'}`; }
  const h = segundos / 3600;
  return `${h} ${h === 1 ? 'hora' : 'horas'}`;
}
