import { useCallback, useEffect, useState } from 'react';
import Cabecalho from '../../components/Cabecalho';
import EstadoVazio, { SemPersonagem } from '../../components/EstadoVazio';
import Icone from '../../components/Icone';
import IconeItem from '../../components/IconeItem';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import { CAPACIDADE, descricaoItem, precoPara, RARIDADES } from '../../regras/itens';
import { comprarItem, contarInventario, listarCatalogo } from '../../services/inventario';

const FILTROS = ['todas', ...Object.keys(RARIDADES)];

export default function Mercador() {
  const { heroi: h, setHeroi, carregando } = useJogo();
  const avisar = useAvisar();
  const [catalogo, setCatalogo] = useState(null);
  const [usados, setUsados] = useState(0);
  const [filtro, setFiltro] = useState('todas');
  const [erro, setErro] = useState('');
  const [comprando, setComprando] = useState(null);
  useTitulo('Mercador');

  const heroiId = h?.id ?? null;
  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [c, n] = await Promise.all([listarCatalogo(), contarInventario()]);
      setCatalogo(c);
      setUsados(n);
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => { if (heroiId) carregar(); }, [heroiId, carregar]);

  async function comprar(it) {
    const preco = precoPara(h.classe, it.preco);
    // Feedback imediato; a RPC comprar_item confere as mesmas regras
    if (usados >= CAPACIDADE) { avisar(`O inventário está cheio (${CAPACIDADE} de ${CAPACIDADE}). Descarte ou use um item antes de comprar.`, 'erro'); return; }
    if (preco > h.ouro) { avisar(`Ouro insuficiente. Faltam ${preco - h.ouro} moedas.`, 'erro'); return; }
    setComprando(it.id);
    try {
      setHeroi(await comprarItem(it.id));
      setUsados(n => n + 1);
      avisar(`Comprado: ${it.nome}.`);
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setComprando(null);
    }
  }

  if (carregando) return <p className="carregando" role="status" data-cy="carregando">Carregando…</p>;
  if (!h) return <><Cabecalho titulo="Mercador" /><SemPersonagem /></>;

  const desconto = h.classe === 'ladino';

  function conteudo() {
    if (erro) {
      return (
        <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-mercador">
          <button type="button" className="btn btn-primario" onClick={carregar} data-cy="btn-tentar-de-novo">Tentar de novo</button>
        </EstadoVazio>
      );
    }
    if (!catalogo) return <p className="carregando" role="status" data-cy="carregando">Carregando o catálogo…</p>;
    const lista = catalogo.filter(it => filtro === 'todas' || it.raridade === filtro);
    return (
      <>
        <div className="mercado-cab painel">
          <div className="saldo-grande"><Icone nome="two-coins" /><div><span className="ajuda">Seu ouro</span><strong data-cy="saldo-mercador">{h.ouro} moedas</strong></div></div>
          <p className="ajuda" data-cy="espacos-mercador">Inventário: {usados} de {CAPACIDADE} espaços usados</p>
        </div>
        <div className="chips filtros" role="group" aria-label="Filtrar por raridade">
          {FILTROS.map(k => (
            <button key={k} type="button" className="chip-btn" aria-pressed={filtro === k} onClick={() => setFiltro(k)} data-cy={`filtro-raridade-${k}`}>
              {k === 'todas' ? 'Todas' : RARIDADES[k]}
            </button>
          ))}
        </div>
        {lista.length ? (
          <div className="catalogo">{lista.map(it => {
            const preco = precoPara(h.classe, it.preco);
            return (
              <article key={it.id} className="item" data-cy="oferta-item" data-raridade={it.raridade}>
                <IconeItem icone={it.icone} raridade={it.raridade} />
                <div className="item-info">
                  <h3 className="item-nome">{it.nome}</h3>
                  <p className={`raridade r-${it.raridade}`}>{RARIDADES[it.raridade]}</p>
                  <p className="ajuda">{descricaoItem(it)}</p>
                </div>
                <div className="oferta-rodape">
                  <span className={`preco ${preco > h.ouro ? 'caro' : ''}`.trim()} data-cy="preco-item">
                    <Icone nome="two-coins" />
                    {preco !== it.preco && <s className="preco-original" data-cy="preco-original"><span className="visualmente-oculto">De </span>{it.preco}</s>}
                    {preco !== it.preco && <span className="visualmente-oculto"> por </span>}
                    {preco}<span className="visualmente-oculto"> moedas</span>
                  </span>
                  <button type="button" className="btn btn-pequeno btn-primario" onClick={() => comprar(it)}
                    disabled={comprando !== null} aria-busy={comprando === it.id} data-cy="btn-comprar">Comprar</button>
                </div>
              </article>
            );
          })}</div>
        ) : (
          <EstadoVazio icone="shop" titulo="Nenhum item com essa raridade." texto="O mercador está sem estoque dessa raridade. Escolha outro filtro." cy="mercador-vazio" />
        )}
      </>
    );
  }

  return (
    <>
      <Cabecalho titulo="Mercador"
        desc={`Compre itens com o ouro do seu herói. A compra vai direto para o inventário.${desconto ? ' Como Ladino, você paga 10% a menos (Mãos leves).' : ''}`} />
      {conteudo()}
    </>
  );
}
