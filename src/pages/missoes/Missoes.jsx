import { useCallback, useEffect, useState } from 'react';
import Cabecalho from '../../components/Cabecalho';
import Escudo from '../../components/Escudo';
import EstadoVazio, { SemPersonagem } from '../../components/EstadoVazio';
import Icone from '../../components/Icone';
import Medidor from '../../components/Medidor';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import { brasaoDe, ferido } from '../../regras/formulas';
import { hms } from '../../regras/itens';
import { DIFICULDADES, duracaoTexto, xpMissao } from '../../regras/missoes';
import { buscarMissaoAtiva, coletarRecompensa, enviarMissao, listarMissoes } from '../../services/missoes';

// Relógio do navegador (Date.now()), atualizado a cada segundo enquanto "ativo".
// O banco confere o fim da missão com now().
function useAgora(ativo) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    setAgora(Date.now());
    if (!ativo) return undefined;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ativo]);
  return agora;
}

function Andamento({ heroi: h, missao: m, inicio, ocupado, aoColetar }) {
  const fimEm = new Date(inicio).getTime() + m.duracao * 1000;
  const agora = useAgora(Date.now() < fimEm);
  const terminou = agora >= fimEm;
  const decorrido = Math.min(m.duracao * 1000, agora - new Date(inicio).getTime());
  const b = brasaoDe(h);
  return (
    <article className="andamento-item" data-cy="missao-andamento" data-fim={terminou ? 1 : 0}>
      <Escudo tintura={b.tintura} icone={b.icone} tam={38} />
      <div>
        <strong>{h.nome}</strong>
        <p className="ajuda">{m.nome}</p>
        <Medidor valor={Math.max(0, decorrido)} max={m.duracao * 1000} tipo="xp" rotulo={`Progresso de ${m.nome}`} />
        <p className="ajuda" data-cy="tempo-missao">{terminou ? 'Missão concluída' : `Termina em ${hms(fimEm - agora)}`}</p>
      </div>
      {terminou && (
        <button type="button" className="btn btn-primario" onClick={aoColetar} disabled={ocupado} aria-busy={ocupado} data-cy="btn-coletar-recompensa">
          Coletar recompensa
        </button>
      )}
    </article>
  );
}

export default function Missoes() {
  const { heroi: h, setHeroi, carregando } = useJogo();
  const avisar = useAvisar();
  const [missoes, setMissoes] = useState(null);
  const [ativa, setAtiva] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useTitulo('Quadro de missões');

  const heroiId = h?.id ?? null;
  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [lista, a] = await Promise.all([listarMissoes(), buscarMissaoAtiva()]);
      setMissoes(lista);
      setAtiva(a);
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => { if (heroiId) carregar(); }, [heroiId, carregar]);

  async function partir(m) {
    // Feedback imediato; a RPC enviar_missao confere as mesmas regras
    if (ferido(h)) { avisar(`${h.nome} está ferido demais para sair em missão. Descanse na taverna primeiro.`, 'erro'); return; }
    setOcupado(true);
    try {
      setAtiva(await enviarMissao(m.id));
      avisar(`${h.nome} partiu em "${m.nome}".`);
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function coletar() {
    const m = missoes.find(x => x.id === ativa.missaoId);
    setOcupado(true);
    try {
      const atualizado = await coletarRecompensa();
      setHeroi(atualizado);
      setAtiva(null);
      avisar(`${atualizado.nome} voltou de "${m.nome}" com ${m.ouro} moedas e ${xpMissao(atualizado.classe, m.xp)} XP.`);
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setOcupado(false);
    }
  }

  if (carregando) return <p className="carregando" role="status" data-cy="carregando">Carregando…</p>;
  if (!h) return <><Cabecalho titulo="Quadro de missões" /><SemPersonagem /></>;

  const desc = `Escolha uma missão para o seu herói. Quando o tempo acabar, colete a recompensa de ouro e experiência.${h.classe === 'mago' ? ' Como Mago, você ganha 20% a mais de XP (Mente arcana).' : ''}`;

  function conteudo() {
    if (erro) {
      return (
        <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-missoes">
          <button type="button" className="btn btn-primario" onClick={carregar} data-cy="btn-tentar-de-novo">Tentar de novo</button>
        </EstadoVazio>
      );
    }
    if (!missoes) return <p className="carregando" role="status" data-cy="carregando">Carregando o quadro de missões…</p>;
    const missaoAtiva = ativa && missoes.find(x => x.id === ativa.missaoId);
    return (
      <div className="missoes">
        <section aria-labelledby="t-disponiveis">
          <h2 id="t-disponiveis">Missões disponíveis</h2>
          {ativa && <p className="ajuda" style={{ marginBottom: '.75rem' }} data-cy="aviso-missao-ativa">Seu herói já está em uma missão. Colete a recompensa para partir de novo.</p>}
          <div className="lista-missoes">{missoes.map(m => (
            <article key={m.id} className="painel missao" data-cy={`missao-${m.id}`}>
              <h3>{m.nome}</h3>
              <p>{m.descricao}</p>
              <ul className="missao-dados">
                <li className={`dif dif-${m.dificuldade}`}>{DIFICULDADES[m.dificuldade]}</li>
                <li><Icone nome="sands-of-time" />{duracaoTexto(m.duracao)}</li>
                <li><Icone nome="two-coins" />{m.ouro} moedas</li>
                <li data-cy="xp-missao"><Icone nome="stars-stack" />{xpMissao(h.classe, m.xp)} XP</li>
              </ul>
              <div>
                <button type="button" className="btn btn-primario" onClick={() => partir(m)} disabled={!!ativa || ocupado} data-cy="btn-partir-missao">Partir em missão</button>
              </div>
            </article>
          ))}</div>
        </section>
        <section aria-labelledby="t-atual">
          <h2 id="t-atual">Missão atual</h2>
          <div className="painel">
            {missaoAtiva
              ? <Andamento heroi={h} missao={missaoAtiva} inicio={ativa.inicio} ocupado={ocupado} aoColetar={coletar} />
              : <p className="ajuda" data-cy="sem-missao">Nenhuma missão em andamento. Escolha uma missão ao lado.</p>}
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <Cabecalho titulo="Quadro de missões" desc={desc} />
      {conteudo()}
    </>
  );
}
