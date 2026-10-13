// Combate da arena, resolvido no front de propósito: os dados usam Math.random
// (via rolar), que os testes podem controlar. O banco só registra o
// resultado e valida limites (registrar_combate em supabase/schema.sql).
import { atributoDe, rolar } from './formulas';
import { CLASSES } from './personagem';

// Mesmas recompensas de registrar_combate
export const MONSTROS = {
  goblin: { nome: 'Goblin saqueador',      icone: 'goblin-head', hp: 20, defesa: 9,  ataque: 3, dano: [1, 6],  xp: 30,  ouro: 15 },
  troll:  { nome: 'Troll da ponte',        icone: 'troll',       hp: 45, defesa: 11, ataque: 5, dano: [2, 6],  xp: 80,  ouro: 40 },
  dragao: { nome: 'Dragão de Monte Cinza', icone: 'dragon-head', hp: 90, defesa: 14, ataque: 8, dano: [2, 10], xp: 250, ouro: 150 }
};

// mod = ⌊atributo principal efetivo ÷ 2⌋
export function modAtaque(h) { return Math.floor(atributoDe(h, CLASSES[h.classe].principal) / 2); }

// Olho de águia (arqueiro): crítico com 19 ou 20 natural
export function minimoCritico(h) { return h.classe === 'arqueiro' ? 19 : 20; }

// 10 + ⌊Destreza efetiva ÷ 2⌋, +2 com Pele de ferro (guerreiro), +4 ao defender
export function defesaHeroi(h, defendendo = false) {
  return 10 + Math.floor(atributoDe(h, 'destreza') / 2) + (h.classe === 'guerreiro' ? 2 : 0) + (defendendo ? 4 : 0);
}

export function novoCombate(h, monstro) {
  return {
    monstro,
    hpHeroi: h.hpAtual,
    hpMonstro: MONSTROS[monstro].hp,
    turno: 1,
    fim: null,
    log: [{ texto: `${h.nome} entrou na arena para enfrentar ${MONSTROS[monstro].nome}.`, tipo: '' }]
  };
}

// Resolve um turno (atacar, defender ou fugir) e devolve o novo estado do combate.
// Ordem das rolagens: d20 do herói, d8 do dano (se acertar), d20 do monstro, dados de dano do monstro.
export function resolverTurno(c, h, acao) {
  const m = MONSTROS[c.monstro];
  const log = [...c.log];
  const registrar = (texto, tipo = '') => log.push({ texto: `Turno ${c.turno}: ${texto}`, tipo });
  let { hpHeroi, hpMonstro } = c;

  if (acao === 'fugir') {
    registrar(`${h.nome} fugiu da batalha.`);
    return { ...c, log, fim: 'fuga' };
  }

  if (acao === 'atacar') {
    const mod = modAtaque(h), d = rolar(20), total = d + mod, critico = d >= minimoCritico(h);
    if (critico || total >= m.defesa) {
      let dano = rolar(8) + mod;
      if (critico) dano *= 2;
      hpMonstro = Math.max(0, hpMonstro - dano);
      registrar(`${h.nome} rolou ${d} + ${mod} = ${total}${critico ? ' (crítico)' : ''} e causou ${dano} de dano.`, 'acerto');
    } else {
      registrar(`${h.nome} rolou ${d} + ${mod} = ${total} contra defesa ${m.defesa} e errou.`);
    }
  } else {
    registrar(`${h.nome} ergueu a guarda e ganhou +4 de defesa neste turno.`);
  }

  if (hpMonstro <= 0) {
    registrar(`${m.nome} foi derrotado.`, 'acerto');
    return { ...c, hpMonstro, log, fim: 'vitoria' };
  }

  const defesa = defesaHeroi(h, acao === 'defender');
  const dm = rolar(20), totalM = dm + m.ataque;
  if (totalM >= defesa) {
    let dano = 0;
    for (let i = 0; i < m.dano[0]; i++) dano += rolar(m.dano[1]);
    hpHeroi = Math.max(0, hpHeroi - dano);
    registrar(`${m.nome} rolou ${dm} + ${m.ataque} = ${totalM} contra defesa ${defesa} e causou ${dano} de dano.`, 'dano');
  } else {
    registrar(`${m.nome} rolou ${dm} + ${m.ataque} = ${totalM} contra defesa ${defesa} e errou.`);
  }

  // Derrota: o herói fica com 1 de HP
  if (hpHeroi <= 0) {
    registrar(`${h.nome} caiu e foi carregado para a taverna.`, 'dano');
    return { ...c, hpHeroi: 1, hpMonstro, log, turno: c.turno + 1, fim: 'derrota' };
  }
  return { ...c, hpHeroi, hpMonstro, log, turno: c.turno + 1 };
}
