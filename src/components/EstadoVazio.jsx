import { Link } from 'react-router-dom';
import Icone from './Icone';

export default function EstadoVazio({ icone, titulo, texto, children, cy = 'estado-vazio' }) {
  return (
    <div className="vazio" data-cy={cy}>
      <Icone nome={icone} />
      <strong>{titulo}</strong>
      <p>{texto}</p>
      {children}
    </div>
  );
}

// Telas que dependem de herói mostram isto quando o jogador ainda não tem um
export function SemPersonagem() {
  return (
    <EstadoVazio icone="scroll-quill" titulo="Você ainda não tem um personagem." cy="sem-personagem"
      texto="Cada jogador tem um único herói. Crie o seu para acessar esta tela.">
      <Link className="btn btn-primario" to="/heroi" data-cy="link-criar-personagem">Criar personagem</Link>
    </EstadoVazio>
  );
}
