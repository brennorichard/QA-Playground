import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Cabecalho from '../../components/Cabecalho';
import Escudo from '../../components/Escudo';
import EstadoVazio from '../../components/EstadoVazio';
import Icone from '../../components/Icone';
import useTitulo from '../../components/useTitulo';
import { CLASSES } from '../../regras/personagem';
import { listarHall, minhaPosicao, POR_PAGINA } from '../../services/hall';

const ESPERA_BUSCA = 300;
const FILTROS_INICIAIS = { busca: '', classe: '', ordem: 'nivel', pagina: 1 };

export default function HallDaFama() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useTitulo('Hall da Fama');

  // A busca espera o jogador parar de digitar antes de consultar
  useEffect(() => {
    const t = setTimeout(() => setFiltros(f => (f.busca === busca ? f : { ...f, busca, pagina: 1 })), ESPERA_BUSCA);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    setErro('');
    Promise.all([listarHall(filtros), minhaPosicao(filtros.ordem)])
      .then(([r, p]) => { if (ativo) { setResultado(r); setPosicao(p); } })
      .catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [filtros, tentativa]);

  const mudar = mudanca => setFiltros(f => ({ ...f, ...mudanca, pagina: mudanca.pagina ?? 1 }));
  const limpar = () => { setBusca(''); setFiltros(f => ({ ...FILTROS_INICIAIS, ordem: f.ordem })); };

  const total = resultado?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function lista() {
    if (erro) {
      return (
        <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-hall">
          <button type="button" className="btn btn-primario" onClick={() => setTentativa(t => t + 1)} data-cy="btn-tentar-de-novo">Tentar de novo</button>
        </EstadoVazio>
      );
    }
    if (!resultado) return <p className="carregando" role="status" data-cy="carregando">Carregando o ranking…</p>;
    const resumo = (
      <p className="contagem" aria-live="polite">
        <span data-cy="contador-aventureiros">{total} {total === 1 ? 'aventureiro encontrado' : 'aventureiros encontrados'}</span>
        {posicao && <>. Seu herói está em <strong data-cy="minha-posicao">{posicao}º lugar</strong>.</>}
      </p>
    );
    if (!resultado.linhas.length) {
      return (
        <>
          {resumo}
          <EstadoVazio icone="magnifying-glass" titulo="Nenhum aventureiro encontrado." texto="Tente outro nome ou outra classe.">
            <button type="button" className="btn" onClick={limpar} data-cy="btn-limpar-filtros">Limpar filtros</button>
          </EstadoVazio>
        </>
      );
    }
    return (
      <>
        {resumo}
        <div className="tabela-wrap">
          <table data-cy="tabela-ranking">
            <caption className="visualmente-oculto">Ranking de heróis</caption>
            <thead><tr>
              <th scope="col">Posição</th><th scope="col">Herói</th><th scope="col">Jogador</th><th scope="col">Classe</th>
              <th scope="col" className="num">Nível</th><th scope="col" className="num">Missões</th>
            </tr></thead>
            <tbody>{resultado.linhas.map(l => (
              <tr key={`${l.posicao}-${l.nome}`} className={l.meu ? 'meu' : undefined} data-cy={l.meu ? 'linha-meu-heroi' : 'linha-ranking'}>
                <td className={`pos pos-${l.posicao}`}>{l.posicao}º</td>
                <td><span className="celula-heroi"><Escudo tintura={l.brasao.tintura} icone={l.brasao.icone} tam={26} />{l.meu ? <Link to="/heroi">{l.nome}</Link> : l.nome}</span></td>
                <td>{l.meu ? <strong>Você</strong> : l.jogador}</td>
                <td>{CLASSES[l.classe].nome}</td>
                <td className="num">{l.nivel}</td>
                <td className="num">{l.missoes}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {paginas > 1 && (
          <nav className="paginacao" aria-label="Paginação do Hall da Fama">
            <button type="button" className="btn btn-pequeno" onClick={() => mudar({ pagina: filtros.pagina - 1 })} disabled={filtros.pagina === 1} data-cy="btn-pagina-anterior">Anterior</button>
            <span data-cy="pagina-atual">Página {filtros.pagina} de {paginas}</span>
            <button type="button" className="btn btn-pequeno" onClick={() => mudar({ pagina: filtros.pagina + 1 })} disabled={filtros.pagina >= paginas} data-cy="btn-pagina-proxima">Próxima</button>
          </nav>
        )}
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Hall da Fama" desc="Os heróis de todos os jogadores, um por conta. O seu aparece destacado." />
      <div className="barra" role="search">
        <div className="campo busca">
          <label htmlFor="f-busca" className="visualmente-oculto">Buscar por herói ou jogador</label>
          <Icone nome="magnifying-glass" />
          <input id="f-busca" type="search" placeholder="Buscar por herói ou jogador" value={busca} onChange={e => setBusca(e.target.value)} data-cy="input-busca-hall" />
        </div>
        <div className="campo">
          <label htmlFor="f-classe" className="visualmente-oculto">Filtrar por classe</label>
          <select id="f-classe" value={filtros.classe} onChange={e => mudar({ classe: e.target.value })} data-cy="select-filtro-classe">
            <option value="">Todas as classes</option>
            {Object.entries(CLASSES).map(([k, c]) => <option key={k} value={k}>{c.nome}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="f-ordem" className="visualmente-oculto">Classificar por</label>
          <select id="f-ordem" value={filtros.ordem} onChange={e => mudar({ ordem: e.target.value })} data-cy="select-ordem-ranking">
            <option value="nivel">Maior nível</option>
            <option value="missoes">Mais missões concluídas</option>
          </select>
        </div>
      </div>
      <div>{lista()}</div>
    </>
  );
}
