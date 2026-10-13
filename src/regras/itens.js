// Constantes de inventário, mercador e taverna. As mesmas regras valem no banco
// (supabase/schema.sql: comprar_item, usar_item, descansar, preco_para, recarga_taverna).

export const CAPACIDADE = 10;

export const RARIDADES = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };

export const TIPOS = {
  arma: 'Arma',
  defesa: 'Defesa',
  equipamento: 'Equipamento',
  acessorio: 'Acessório',
  consumivel: 'Consumível'
};

// Mãos leves (ladino): 10% de desconto, arredondado para cima
export function precoPara(classe, preco) {
  return classe === 'ladino' ? Math.ceil(preco * 9 / 10) : preco;
}

// Bênção (clérigo): recarga da taverna em 15 segundos, e não 30 (em ms)
export function recargaTaverna(classe) {
  return classe === 'clerigo' ? 15000 : 30000;
}

export function descricaoItem(it) {
  return `${TIPOS[it.tipo]}${it.cura ? `, recupera ${it.cura} HP` : ''}`;
}

// Tempo restante em m:ss (ou h:mm:ss)
export function hms(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = n => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}
