import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Cabecalho from '../../components/Cabecalho';
import EstadoVazio, { SemPersonagem } from '../../components/EstadoVazio';
import Icone from '../../components/Icone';
import IconeItem from '../../components/IconeItem';
import Medidor from '../../components/Medidor';
import Modal from '../../components/Modal';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import { hpMax } from '../../regras/formulas';
import { CAPACIDADE, descricaoItem, RARIDADES } from '../../regras/itens';
import { descartarItem, equiparItem, listarInventario, usarItem } from '../../services/inventario';

function CartaoItem({ entrada, ocupado, aoEquipar, aoUsar, aoDescartar }) {
  const { item: it, equipado } = entrada;
  return (
    <article className={`item ${equipado ? 'equipado' : ''}`.trim()} data-cy="item-inventario" data-raridade={it.raridade} data-equipado={equipado}>
      <IconeItem icone={it.icone} raridade={it.raridade} />
      <div className="item-info">
        <h3 className="item-nome">{it.nome}</h3>
        <p className={`raridade r-${it.raridade}`}>{RARIDADES[it.raridade]}</p>
        <p className="ajuda">{descricaoItem(it)}</p>
        {equipado && <span className="selo" data-cy="selo-equipado">Equipado</span>}
      </div>
      <div className="item-acoes">
        {it.tipo === 'consumivel'
          ? <button type="button" className="btn btn-pequeno" onClick={aoUsar} disabled={ocupado} data-cy="btn-usar-item">Usar</button>
          : <button type="button" className="btn btn-pequeno" onClick={aoEquipar} disabled={ocupado} data-cy="btn-equipar-item">{equipado ? 'Desequipar' : 'Equipar'}</button>}
        <button type="button" className="btn btn-pequeno btn-perigo" onClick={aoDescartar} disabled={ocupado} data-cy="btn-descartar-item">Descartar</button>
      </div>
    </article>
  );
}

export default function Inventario() {
  const { heroi: h, setHeroi, carregando } = useJogo();
  const avisar = useAvisar();
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [descartando, setDescartando] = useState(null);
  const tela = useRef(null);
  useTitulo('Inventário');

  const heroiId = h?.id ?? null;
  const carregar = useCallback(async () => {
    setErro('');
    try {
      setItens(await listarInventario());
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => { if (heroiId) carregar(); }, [heroiId, carregar]);

  // Depois de um item sumir da lista, o foco volta ao título da tela
  const focarTitulo = () => requestAnimationFrame(() => tela.current?.querySelector('h1')?.focus());

  async function acao(fn) {
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setOcupado(false);
    }
  }

  const equipar = entrada => acao(async () => {
    const it = entrada.item;
    const anterior = it.tipo === 'arma' && !entrada.equipado && itens.find(x => x.equipado && x.item.tipo === 'arma');
    await equiparItem(entrada.id);
    await carregar();
    if (entrada.equipado) avisar(`${it.nome} foi para a mochila.`);
    else if (anterior) avisar(`Arma trocada: ${it.nome} no lugar de ${anterior.item.nome}.`);
    else avisar(`${it.nome} equipado.`);
  });

  const usar = entrada => {
    // Feedback imediato; a RPC usar_item também recusa com HP completo
    if (h.hpAtual >= hpMax(h)) { avisar(`${h.nome} já está com o HP completo.`, 'erro'); return; }
    acao(async () => {
      const antes = h.hpAtual;
      const atualizado = await usarItem(entrada.id);
      setHeroi(atualizado);
      await carregar();
      avisar(`${atualizado.nome} usou ${entrada.item.nome} e recuperou ${atualizado.hpAtual - antes} HP.`);
      focarTitulo();
    });
  };

  const descartar = () => acao(async () => {
    const entrada = descartando;
    try {
      await descartarItem(entrada.id);
    } finally {
      setDescartando(null);
    }
    await carregar();
    avisar(`${entrada.item.nome} descartado.`);
    focarTitulo();
  });

  if (carregando) return <p className="carregando" role="status" data-cy="carregando">Carregando…</p>;
  if (!h) return <><Cabecalho titulo="Inventário" /><SemPersonagem /></>;

  function conteudo() {
    if (erro) {
      return (
        <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-inventario">
          <button type="button" className="btn btn-primario" onClick={carregar} data-cy="btn-tentar-de-novo">Tentar de novo</button>
        </EstadoVazio>
      );
    }
    if (!itens) return <p className="carregando" role="status" data-cy="carregando">Carregando o inventário…</p>;
    const livres = Math.max(0, CAPACIDADE - itens.length);
    return (
      <>
        <div className="inv-cab">
          <div className="capacidade">
            <div className="stat-linha"><span>Espaços usados</span><strong data-cy="capacidade-inventario">{itens.length} de {CAPACIDADE}</strong></div>
            <Medidor valor={itens.length} max={CAPACIDADE} tipo="cap" rotulo="Espaços usados no inventário" />
          </div>
        </div>
        <div className="grade-itens">
          {itens.map(e => (
            <CartaoItem key={e.id} entrada={e} ocupado={ocupado}
              aoEquipar={() => equipar(e)} aoUsar={() => usar(e)} aoDescartar={() => setDescartando(e)} />
          ))}
          {Array.from({ length: livres }, (_, i) => <div key={`livre-${i}`} className="slot-vazio" aria-hidden="true">Espaço livre</div>)}
        </div>
      </>
    );
  }

  return (
    <div ref={tela}>
      <Cabecalho titulo="Inventário" desc={`Os itens de ${h.nome}. Só uma arma fica equipada por vez.`}>
        <Link className="btn" to="/mercador" data-cy="link-mercador"><Icone nome="shop" />Ir ao mercador</Link>
      </Cabecalho>
      {conteudo()}
      {descartando && (
        <Modal titulo="Descartar item?" texto={`${descartando.item.nome} será removido do inventário.`} botao="Descartar item" perigo
          ocupado={ocupado} aoConfirmar={descartar} aoCancelar={() => setDescartando(null)} />
      )}
    </div>
  );
}
