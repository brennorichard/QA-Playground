// Ícones do game-icons.net (CC BY 3.0, ver CREDITS.md), importados como componentes pelo vite-plugin-svgr
const arquivos = import.meta.glob('../assets/icons/*.svg', { eager: true, query: '?react', import: 'default' });

const ICONES = Object.fromEntries(
  Object.entries(arquivos).map(([caminho, componente]) => [caminho.match(/([a-z-]+)\.svg$/)[1], componente])
);

export function componenteIcone(nome) {
  const Svg = ICONES[nome];
  if (!Svg) throw new Error(`Ícone desconhecido: ${nome}`);
  return Svg;
}

// Ícone decorativo em linha com o texto (herda a cor via currentColor)
export default function Icone({ nome, className = '' }) {
  const Svg = componenteIcone(nome);
  return <Svg className={`ic ${className}`.trim()} aria-hidden="true" focusable="false" />;
}
