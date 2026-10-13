import { componenteIcone } from './Icone';

// Monstro da arena: círculo vermelho com contorno dourado e o ícone em branco (decorativo)
export default function Medalhao({ icone, tam = 64 }) {
  const Svg = componenteIcone(icone);
  return (
    <svg className="roundel" viewBox="0 0 100 100" width={tam} height={tam} aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="46" style={{ fill: '#B3262E', stroke: 'var(--shield-rim)' }} strokeWidth="3.5" />
      <Svg x="21" y="21" width="58" height="58" style={{ color: '#fff' }} />
    </svg>
  );
}
