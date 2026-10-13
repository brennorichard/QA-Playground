import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Cabecalho from '../../components/Cabecalho';
import Escudo from '../../components/Escudo';
import EstadoVazio, { SemPersonagem } from '../../components/EstadoVazio';
import Icone from '../../components/Icone';
import Medalhao from '../../components/Medalhao';
import Medidor from '../../components/Medidor';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import { MONSTROS, novoCombate, resolverTurno } from '../../regras/combate';
import { brasaoDe, ferido, hpMax, rotuloBrasao } from '../../regras/formulas';
import { registrarCombate } from '../../services/arena';
import { buscarMissaoAtiva } from '../../services/missoes';

const VANTAGEM = {
  guerreiro: ' Como Guerreiro, você tem +2 de defesa (Pele de ferro).',
  arqueiro: ' Como Arqueiro, você acerta crítico com 19 ou 20 (Olho de águia).'
};

function Escolha({ heroi: h, emMissao, monstro, aoEscolher, aoIniciar }) {
  const b = brasaoDe(h);
  return (
    <>
      <Cabecalho titulo="Arena"
        desc={`Escolha um adversário. Cada ataque rola um d20 somado ao atributo principal da classe contra a defesa do oponente.${VANTAGEM[h.classe] || ''}`} />
      <div className="painel arena-setup">
        <div className="arena-heroi" data-cy="arena-seu-heroi">
          <Escudo tintura={b.tintura} icone={b.icone} tam={56} rotulo={rotuloBrasao(b.icone, b.tintura)} />
          <div><strong>{h.nome}</strong><p className="ajuda">HP {h.hpAtual} / {hpMax(h)}{emMissao ? ', em missão' : ''}</p></div>
        </div>
        <fieldset>
          <legend>Adversário</legend>
          <div className="arena-escolha">{Object.entries(MONSTROS).map(([k, m]) => (
            <div className="opcao" key={k}>
              <input type="radio" name="monstro" id={`mo-${k}`} value={k} checked={monstro === k} onChange={() => aoEscolher(k)} data-cy={`opcao-monstro-${k}`} />
              <label htmlFor={`mo-${k}`}><Medalhao icone={m.icone} tam={64} /><span>{m.nome}</span><small>HP {m.hp}, defesa {m.defesa}</small></label>
            </div>
          ))}</div>
        </fieldset>
        <button type="button" className="btn btn-primario" onClick={aoIniciar} data-cy="btn-iniciar-combate"><Icone nome="crossed-swords" />Iniciar combate</button>
      </div>
    </>
  );
}

const RESULTADOS = {
  vitoria: { titulo: 'Vitória', texto: (h, m) => `${h.nome} ganhou ${m.xp} XP e ${m.ouro} moedas.` },
  derrota: { titulo: 'Derrota', texto: h => `${h.nome} ficou com 1 de HP e precisa descansar na taverna.` },
  fuga: { titulo: 'Fuga', texto: h => `${h.nome} deixou a arena antes do fim do combate.` }
};

export default function Arena() {
  const { heroi: h, setHeroi, carregando } = useJogo();
  const avisar = useAvisar();
  const [emMissao, setEmMissao] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [monstro, setMonstro] = useState('goblin');
  const [combate, setCombate] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const tela = useRef(null);
  useTitulo('Arena');

  const heroiId = h?.id ?? null;
  useEffect(() => {
    if (!heroiId) return undefined;
    let ativo = true;
    setErro('');
    buscarMissaoAtiva()
      .then(a => { if (ativo) setEmMissao(!!a); })
      .catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [heroiId, tentativa]);

  const focar = seletor => requestAnimationFrame(() => tela.current?.querySelector(seletor)?.focus());

  function iniciar() {
    // Feedback imediato; registrar_combate confere as mesmas regras no fim da luta
    if (emMissao) { avisar(`${h.nome} está em missão e não pode lutar agora.`, 'erro'); return; }
    if (ferido(h)) { avisar(`${h.nome} está ferido demais para lutar. Descanse na taverna primeiro.`, 'erro'); return; }
    setCombate(novoCombate(h, monstro));
    focar('h1');
  }

  async function turno(acao) {
    const novo = resolverTurno(combate, h, acao);
    setCombate(novo);
    if (!novo.fim) { focar('[data-cy="btn-atacar"]'); return; }
    setRegistrando(true);
    try {
      setHeroi(await registrarCombate({ monstro: novo.monstro, resultado: novo.fim, hpFinal: novo.hpHeroi }));
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setRegistrando(false);
      focar('[data-cy="btn-nova-batalha"]');
    }
  }

  function novaBatalha() {
    setCombate(null);
    focar('h1');
  }

  if (carregando) return <p className="carregando" role="status" data-cy="carregando">Carregando…</p>;
  if (!h) return <><Cabecalho titulo="Arena" /><SemPersonagem /></>;
  if (erro) {
    return (
      <>
        <Cabecalho titulo="Arena" />
        <EstadoVazio icone="cross-mark" titulo={erro} texto="Tente de novo em instantes." cy="erro-arena">
          <button type="button" className="btn btn-primario" onClick={() => setTentativa(t => t + 1)} data-cy="btn-tentar-de-novo">Tentar de novo</button>
        </EstadoVazio>
      </>
    );
  }
  if (emMissao === null) return <p className="carregando" role="status" data-cy="carregando">Carregando a arena…</p>;

  if (!combate) {
    return <div ref={tela}><Escolha heroi={h} emMissao={emMissao} monstro={monstro} aoEscolher={setMonstro} aoIniciar={iniciar} /></div>;
  }

  const m = MONSTROS[combate.monstro], max = hpMax(h), b = brasaoDe(h);
  const resultado = combate.fim && RESULTADOS[combate.fim];

  return (
    <div ref={tela}>
      <Cabecalho titulo="Arena" desc={`${h.nome} contra ${m.nome}.`} />
      <div className="combate">
        <section className="painel combatente" data-cy="painel-heroi">
          <Escudo tintura={b.tintura} icone={b.icone} tam={90} rotulo={rotuloBrasao(b.icone, b.tintura)} />
          <h2>{h.nome}</h2>
          <div>
            <div className="stat-linha"><span className="ajuda">HP</span><strong data-cy="hp-heroi-combate">{combate.hpHeroi} / {max}</strong></div>
            <Medidor valor={combate.hpHeroi} max={max} rotulo={`HP de ${h.nome}`} />
          </div>
        </section>
        <p className="versus" aria-hidden="true">contra</p>
        <section className="painel combatente" data-cy="painel-monstro">
          <Medalhao icone={m.icone} tam={90} />
          <h2>{m.nome}</h2>
          <div>
            <div className="stat-linha"><span className="ajuda">HP</span><strong data-cy="hp-monstro">{combate.hpMonstro} / {m.hp}</strong></div>
            <Medidor valor={combate.hpMonstro} max={m.hp} rotulo={`HP de ${m.nome}`} />
          </div>
        </section>
      </div>

      {resultado ? (
        <div className={`resultado ${combate.fim}`} data-cy="resultado-combate">
          <h2>{resultado.titulo}</h2>
          <p>{resultado.texto(h, m)}</p>
          <div className="atalhos">
            <button type="button" className="btn btn-primario" onClick={novaBatalha} disabled={registrando} aria-busy={registrando} data-cy="btn-nova-batalha">Nova batalha</button>
            {combate.fim === 'derrota'
              ? <Link className="btn" to="/taverna" data-cy="link-taverna">Ir à taverna</Link>
              : <Link className="btn" to="/heroi" data-cy="link-ficha">Ver ficha</Link>}
          </div>
        </div>
      ) : (
        <div className="acoes-combate">
          <button type="button" className="btn btn-primario" onClick={() => turno('atacar')} data-cy="btn-atacar"><Icone nome="crossed-swords" />Atacar</button>
          <button type="button" className="btn" onClick={() => turno('defender')} data-cy="btn-defender"><Icone nome="round-shield" />Defender</button>
          <button type="button" className="btn btn-perigo" onClick={() => turno('fugir')} data-cy="btn-fugir">Fugir</button>
        </div>
      )}

      <section className="painel">
        <h2>Registro do combate</h2>
        <ol className="log" data-cy="log-combate" aria-live="polite">
          {combate.log.slice().reverse().map((l, i) => <li key={combate.log.length - i} className={l.tipo || undefined}>{l.texto}</li>)}
        </ol>
      </section>
    </div>
  );
}
