// Barra de progresso. Para HP, fica vermelha abaixo de 30% (herói ferido).
export default function Medidor({ valor, max, tipo = 'hp', rotulo = '', cy }) {
  const pct = max ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  const baixo = tipo === 'hp' && pct < 30 ? 'baixo' : '';
  return (
    <div
      className={`medidor ${tipo} ${baixo}`.trim()}
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax={max}
      aria-valuenow={Math.round(valor)}
      aria-label={rotulo || undefined}
      data-cy={cy}
    >
      <span style={{ width: `${pct.toFixed(1)}%` }} />
    </div>
  );
}
