import { useId } from 'react';
import { componenteIcone } from './Icone';

export const OCTOGONO = '256,0 437,75 512,256 437,437 256,512 75,437 0,256 75,75';

// Gradiente radial por raridade (centro → borda)
const GRADIENTES = {
  comum: ['#A3ABB8', '#4B5465'],
  raro: ['#4D93E8', '#163C7A'],
  epico: ['#E8234A', '#7A12C9'],
  lendario: ['#F2B536', '#94570A']
};

// Ícone de item: octógono com o gradiente da raridade e o desenho em branco (decorativo)
export default function IconeItem({ icone, raridade, tam = 56 }) {
  const Svg = componenteIcone(icone);
  const id = `grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [centro, borda] = GRADIENTES[raridade];
  return (
    <svg className="item-oct" viewBox="0 0 512 512" width={tam} height={tam} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={centro} />
          <stop offset="100%" stopColor={borda} />
        </radialGradient>
      </defs>
      <polygon points={OCTOGONO} fill={`url(#${id})`} stroke="rgba(0,0,0,.28)" strokeWidth="12" />
      <Svg x="106" y="106" width="300" height="300" style={{ color: '#fff' }} />
    </svg>
  );
}
