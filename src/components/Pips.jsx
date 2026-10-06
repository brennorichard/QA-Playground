import { MAX_PIPS, MIN_ATR } from '../regras/personagem';

// 12 marcadores: pontos distribuídos em azul, bônus da raça em dourado, penalidade hachurada
export default function Pips({ base, bonus }) {
  const ef = Math.max(MIN_ATR, base + bonus);
  const classe = i => {
    if (bonus >= 0) return i < base ? 'on' : i < base + bonus ? 'bonus' : '';
    return i < ef ? 'on' : i < base ? 'penal' : '';
  };
  return (
    <div className="pips doze" aria-hidden="true">
      {Array.from({ length: MAX_PIPS }, (_, i) => <span key={i} className={classe(i)} />)}
    </div>
  );
}

export function LegendaPips() {
  return (
    <p className="legenda-pips">
      <span className="l-base">Pontos distribuídos</span>
      <span className="l-bonus">Bônus da raça</span>
      <span className="l-penal">Penalidade da raça</span>
    </p>
  );
}
