import { CLASSES, ICONES_BRASAO, MIN_ATR, NOME_HEROI_MAX, NOME_HEROI_MIN, PONTOS_BASE, RACAS, TINTURAS } from './personagem';

export const soma = o => Object.values(o).reduce((a, b) => a + b, 0);

// d20 e demais dados usam Math.random de propósito: permite controlar nos testes
export const rolar = faces => Math.floor(Math.random() * faces) + 1;

export function totalPontos(raca) { return PONTOS_BASE + (raca ? RACAS[raca].pontosExtras : 0); }
export function bonusRaca(raca, atr) { return raca ? (RACAS[raca].bonus[atr] || 0) : 0; }

// Valor efetivo = pontos distribuídos + bônus da raça, nunca abaixo de 1
export function efetivo(base, raca, atr) { return Math.max(MIN_ATR, base[atr] + bonusRaca(raca, atr)); }
export function atributoDe(h, atr) { return efetivo(h.base, h.raca, atr); }

export function hpMaxDe(classe, base, raca, nivel) {
  return CLASSES[classe].hpBase + efetivo(base, raca, 'constituicao') * nivel;
}
export function hpMax(h) { return hpMaxDe(h.classe, h.base, h.raca, h.nivel); }
export function xpParaSubir(h) { return h.nivel * 100; }

export function textoBonus(raca, atr) {
  const b = bonusRaca(raca, atr);
  return b ? `${b > 0 ? '+' : '−'}${Math.abs(b)} ${RACAS[raca].nome}` : '';
}

// Brasão de um herói; quem não personalizou usa o da classe
export function brasaoDe(h) {
  return h.brasao || { icone: CLASSES[h.classe].icone, tintura: CLASSES[h.classe].tintura };
}
export function rotuloBrasao(icone, tintura) {
  const ico = ICONES_BRASAO.find(i => i.id === icone);
  return `Brasão: ${ico ? ico.nome.toLowerCase() : 'ícone'} sobre ${TINTURAS[tintura].nome.toLowerCase()}`;
}

// Validação de tamanho; a unicidade é conferida no banco
export function erroTamanhoNome(nome) {
  const n = nome.trim();
  if (n.length < NOME_HEROI_MIN) return 'Dê ao herói um nome com pelo menos 3 letras.';
  if (n.length > NOME_HEROI_MAX) return 'Use no máximo 40 caracteres.';
  return '';
}

// Ferido: HP atual abaixo de 30% do máximo. Não parte em missão nem luta na arena.
export function ferido(h) { return h.hpAtual * 10 < hpMax(h) * 3; }
