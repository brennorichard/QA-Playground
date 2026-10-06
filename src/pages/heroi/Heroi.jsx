import EstadoVazio from '../../components/EstadoVazio';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import Criacao from './Criacao';
import Ficha from './Ficha';

// Tela inicial. Sem herói (primeiro acesso ou depois de aposentar), mostra a criação.
export default function Heroi() {
  const { heroi, carregando, erro, recarregar } = useJogo();
  useTitulo(heroi || carregando ? 'Ficha do herói' : 'Crie o seu herói');

  if (carregando) return <p className="carregando" role="status" data-cy="carregando">Carregando o seu herói…</p>;
  if (erro) {
    return (
      <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-carregar-heroi">
        <button type="button" className="btn btn-primario" onClick={recarregar} data-cy="btn-tentar-de-novo">Tentar de novo</button>
      </EstadoVazio>
    );
  }
  // key: ao aposentar e criar de novo, a criação começa do zero
  return heroi ? <Ficha key={heroi.id} /> : <Criacao />;
}
