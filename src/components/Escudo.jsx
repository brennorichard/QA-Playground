import { TINTURAS } from '../regras/personagem';
import { componenteIcone } from './Icone';

export const ESCUDO_D = 'M8 6 H92 V50 C92 84 72 102 50 113 C28 102 8 84 8 50 Z';

// Brasão heráldico: escudo na cor da tintura com o ícone por cima.
// Sem rótulo, é decorativo (aria-hidden); com rótulo, vira uma imagem acessível.
export default function Escudo({ tintura, icone, tam = 56, rotulo = '', className = '', ...resto }) {
  const t = TINTURAS[tintura];
  const Svg = componenteIcone(icone);
  const a11y = rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true };
  return (
    <svg className={`escudo ${className}`.trim()} viewBox="0 0 100 120" width={tam} height={Math.round(tam * 1.2)} {...a11y} {...resto}>
      <path d={ESCUDO_D} style={{ fill: t.campo, stroke: 'var(--shield-rim)' }} strokeWidth="3.5" strokeLinejoin="round" />
      <Svg x="23" y="22" width="54" height="54" style={{ color: t.carga }} />
    </svg>
  );
}

export function EscudoVazio({ tam = 140 }) {
  return (
    <svg className="escudo" viewBox="0 0 100 120" width={tam} height={Math.round(tam * 1.2)} role="img" aria-label="Brasão ainda não definido">
      <path d={ESCUDO_D} style={{ fill: 'none', stroke: 'var(--line-strong)' }} strokeWidth="3" strokeDasharray="6 5" strokeLinejoin="round" />
      <text x="50" y="68" textAnchor="middle" style={{ font: '600 34px var(--font-display)', fill: 'var(--muted)' }}>?</text>
    </svg>
  );
}
