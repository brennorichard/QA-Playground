import { Link, useLocation } from 'react-router-dom';
import Icone from '../../components/Icone';
import useTitulo from '../../components/useTitulo';

export default function Perdido() {
  const { pathname } = useLocation();
  useTitulo('Perdido na masmorra');
  return (
    <section className="perdido" data-cy="tela-404">
      <Icone nome="dungeon-gate" className="ic-gigante" />
      <h1 tabIndex={-1}>Perdido na masmorra</h1>
      <p className="tela-desc">O caminho <code data-cy="rota-inexistente">#{pathname}</code> não leva a lugar nenhum. Confira o endereço ou volte para a ficha do herói.</p>
      <Link className="btn btn-primario" to="/heroi" data-cy="btn-voltar-ficha">Voltar à ficha do herói</Link>
    </section>
  );
}
