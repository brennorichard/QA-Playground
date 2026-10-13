import { useEffect, useState } from 'react';
import Cabecalho from '../../components/Cabecalho';
import Escudo from '../../components/Escudo';
import EstadoVazio, { SemPersonagem } from '../../components/EstadoVazio';
import Icone from '../../components/Icone';
import Medidor from '../../components/Medidor';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import { brasaoDe, hpMax, rotuloBrasao } from '../../regras/formulas';
import { hms, recargaTaverna } from '../../regras/itens';
import { CLASSES } from '../../regras/personagem';
import { buscarMissaoAtiva } from '../../services/missoes';
import { descansar } from '../../services/taverna';

// A recarga é contada com o relógio do navegador (Date.now()). O banco confere com now().
function useRestante(ate) {
  const alvo = ate ? new Date(ate).getTime() : 0;
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    setAgora(Date.now());
    if (alvo <= Date.now()) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setAgora(n);
      if (n >= alvo) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [alvo]);
  return Math.max(0, alvo - agora);
}

export default function Taverna() {
  const { heroi: h, setHeroi, carregando } = useJogo();
  const avisar = useAvisar();
  const [missao, setMissao] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const resta = useRestante(h?.descansoDisponivelEm);
  useTitulo('Taverna');

  const heroiId = h?.id ?? null;
  useEffect(() => {
    if (!heroiId) return undefined;
    let ativo = true;
    setErro('');
    buscarMissaoAtiva()
      .then(m => { if (ativo) setMissao(!!m); })
      .catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [heroiId, tentativa]);

  async function descansarAgora() {
    setOcupado(true);
    try {
      const atualizado = await descansar();
      setHeroi(atualizado);
      avisar(`${atualizado.nome} descansou e recuperou todo o HP.`);
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setOcupado(false);
    }
  }

  if (carregando) return <p className="carregando" role="status" data-cy="carregando">Carregando…</p>;
  if (!h) return <><Cabecalho titulo="Taverna" /><SemPersonagem /></>;

  const max = hpMax(h), b = brasaoDe(h);
  const bencao = h.classe === 'clerigo' ? ' Como Clérigo, a sua recarga é menor (Bênção).' : '';

  function botao() {
    if (missao === null) return <button type="button" className="btn" disabled data-cy="btn-descansar">Carregando…</button>;
    if (missao) return <button type="button" className="btn" disabled data-cy="btn-descansar">Em missão</button>;
    if (resta > 0) return <button type="button" className="btn" disabled data-cy="btn-descansar" data-recarga>Disponível em {hms(resta)}</button>;
    if (h.hpAtual >= max) return <button type="button" className="btn" disabled data-cy="btn-descansar">HP completo</button>;
    return (
      <button type="button" className="btn btn-primario" onClick={descansarAgora} disabled={ocupado} aria-busy={ocupado} data-cy="btn-descansar">
        <Icone nome="campfire" />Descansar
      </button>
    );
  }

  return (
    <>
      <Cabecalho titulo="Taverna"
        desc={`Descansar recupera todo o HP. Depois disso, é preciso esperar ${recargaTaverna(h.classe) / 1000} segundos para descansar de novo.${bencao}`} />
      {erro ? (
        <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-taverna">
          <button type="button" className="btn btn-primario" onClick={() => setTentativa(t => t + 1)} data-cy="btn-tentar-de-novo">Tentar de novo</button>
        </EstadoVazio>
      ) : (
        <section className="painel taverna-painel" data-cy="painel-taverna">
          <Escudo tintura={b.tintura} icone={b.icone} tam={72} rotulo={rotuloBrasao(b.icone, b.tintura)} />
          <div>
            <h2>{h.nome}</h2>
            <p className="ajuda">{CLASSES[h.classe].nome}, nível {h.nivel}</p>
            <div className="stat-linha" style={{ marginTop: '.75rem' }}><span className="ajuda">HP</span><strong data-cy="hp-taverna">{h.hpAtual} / {max}</strong></div>
            <Medidor valor={h.hpAtual} max={max} rotulo={`HP de ${h.nome}`} />
          </div>
          {botao()}
        </section>
      )}
    </>
  );
}
