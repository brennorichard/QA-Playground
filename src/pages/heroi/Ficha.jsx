import { useEffect, useRef, useState } from 'react';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import Medidor from '../../components/Medidor';
import Modal from '../../components/Modal';
import Pips, { LegendaPips } from '../../components/Pips';
import { useAvisar } from '../../components/Toasts';
import { useJogo } from '../../contexto/Jogo';
import { atributoDe, bonusRaca, brasaoDe, erroTamanhoNome, hpMax, rotuloBrasao, textoBonus, xpParaSubir } from '../../regras/formulas';
import { ATRIBUTOS, CLASSES, RACAS } from '../../regras/personagem';
import { aposentarHeroi, renomearHeroi, subirNivel } from '../../services/herois';

function EdicaoNome({ heroi, aoSalvar, aoCancelar }) {
  const [nome, setNome] = useState(heroi.nome);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campo = useRef(null);

  useEffect(() => { campo.current.focus(); }, []);

  async function salvar(ev) {
    ev.preventDefault();
    const msg = erroTamanhoNome(nome);
    if (msg) { setErro(msg); campo.current.focus(); return; }
    setSalvando(true);
    try {
      await aoSalvar(nome);
    } catch (e) {
      // Nome repetido chega como violação do índice único e já vem traduzido
      setErro(e.message);
      setSalvando(false);
      campo.current.focus();
    }
  }

  return (
    <>
      <h1 tabIndex={-1} className="visualmente-oculto">Editar {heroi.nome}</h1>
      <form className="form-edicao" onSubmit={salvar} noValidate>
        <label htmlFor="f-editar-nome">Nome do herói</label>
        <input ref={campo} id="f-editar-nome" type="text" maxLength={40} value={nome} onChange={e => { setNome(e.target.value); setErro(''); }}
          aria-describedby="e-editar-nome" aria-invalid={erro ? 'true' : 'false'} data-cy="input-editar-nome" />
        <p className="erro" id="e-editar-nome" data-cy="erro-editar-nome">{erro}</p>
        <div className="form-botoes">
          <button type="button" className="btn" onClick={aoCancelar} data-cy="btn-cancelar-edicao">Cancelar</button>
          <button className="btn btn-primario" disabled={salvando} aria-busy={salvando} data-cy="btn-salvar-edicao">Salvar nome</button>
        </div>
      </form>
    </>
  );
}

export default function Ficha() {
  const { heroi: h, setHeroi } = useJogo();
  const avisar = useAvisar();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const cartao = useRef(null);
  const recemCriado = useRef(h.recemCriado);

  const c = CLASSES[h.classe], rc = RACAS[h.raca], b = brasaoDe(h);
  const max = hpMax(h), xpProx = xpParaSubir(h);

  // Depois de criar, o foco vai para o nome do herói
  useEffect(() => {
    if (recemCriado.current) cartao.current.querySelector('h1')?.focus();
  }, []);

  function focar(seletor) {
    requestAnimationFrame(() => cartao.current?.querySelector(seletor)?.focus());
  }

  async function salvarNome(nome) {
    const atualizado = await renomearHeroi(h.id, nome);
    setHeroi(atualizado);
    setEditando(false);
    avisar('Nome do herói atualizado.');
    focar('h1');
  }

  async function subir() {
    setOcupado(true);
    try {
      const atualizado = await subirNivel();
      setHeroi(atualizado);
      avisar(`${atualizado.nome} subiu para o nível ${atualizado.nivel}.`);
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function aposentar() {
    setOcupado(true);
    try {
      await aposentarHeroi(h.id);
      setConfirmando(false);
      avisar(`${h.nome} foi aposentado. Crie o seu novo herói.`);
      setHeroi(null);
    } catch (e) {
      setConfirmando(false);
      setOcupado(false);
      avisar(e.message, 'erro');
    }
  }

  return (
    <div className="ficha" data-cy="ficha-heroi">
      <section ref={cartao} className="painel ficha-id" aria-label="Identidade do herói">
        <Escudo tintura={b.tintura} icone={b.icone} tam={140} rotulo={rotuloBrasao(b.icone, b.tintura)} className={recemCriado.current ? 'recem-criado' : ''} />
        {editando
          ? <EdicaoNome heroi={h} aoSalvar={salvarNome} aoCancelar={() => { setEditando(false); focar('[data-cy="btn-editar-heroi"]'); }} />
          : <h1 tabIndex={-1} className="ficha-nome" data-cy="nome-heroi">{h.nome}</h1>}
        <p className="card-sub" data-cy="classe-raca-heroi">{c.nome}, {rc.nome}</p>
        <p className="nivel-grande" data-cy="nivel-heroi">Nível {h.nivel}</p>
        <div className="ficha-acoes">
          {!editando && <button type="button" className="btn" onClick={() => setEditando(true)} data-cy="btn-editar-heroi"><Icone nome="quill" />Editar nome</button>}
          <button type="button" className="btn btn-primario" onClick={subir} disabled={h.xp < xpProx || ocupado} data-cy="btn-subir-nivel"><Icone nome="upgrade" />Subir de nível</button>
          <button type="button" className="btn btn-perigo" onClick={() => setConfirmando(true)} data-cy="btn-aposentar"><Icone nome="trash-can" />Aposentar herói</button>
        </div>
      </section>

      <div className="stats">
        <section className="painel">
          <div className="stat-linha"><h2 className="com-icone"><Icone nome="hearts" className="ic-hp" />Pontos de vida</h2><strong data-cy="hp-heroi">{h.hpAtual} / {max}</strong></div>
          <Medidor valor={h.hpAtual} max={max} cy="barra-hp" rotulo="Pontos de vida" />
          <p className="ajuda">HP máximo = base da classe ({c.hpBase}) + Constituição ({atributoDe(h, 'constituicao')}) × nível ({h.nivel}).</p>
        </section>
        <section className="painel">
          <div className="stat-linha"><h2 className="com-icone"><Icone nome="stars-stack" className="ic-xp" />Experiência</h2><strong data-cy="xp-heroi">{h.xp} / {xpProx} XP</strong></div>
          <Medidor valor={h.xp} max={xpProx} tipo="xp" cy="barra-xp" rotulo="Experiência" />
          <p className="ajuda" data-cy="dica-xp">{h.xp >= xpProx ? 'Experiência suficiente para subir de nível.' : `Faltam ${xpProx - h.xp} XP para o nível ${h.nivel + 1}.`}</p>
        </section>
        <section className="painel"><h2>Atributos</h2>
          <div className="attr-grade">{Object.entries(ATRIBUTOS).map(([k, a]) => {
            const bonusTxt = textoBonus(h.raca, k);
            return (
              <div className="attr" key={k} data-cy={`atributo-${k}`}>
                <div className="attr-cab">
                  <span><Icone nome={a.icone} />{a.nome}{c.principal === k && <span className="selo-principal">Principal</span>}</span>
                  <span><strong data-cy={`valor-${k}`}>{atributoDe(h, k)}</strong>{bonusTxt && <small>{h.base[k]} {bonusTxt.replace(/^([+−])/, '$1 ')}</small>}</span>
                </div>
                <Pips base={h.base[k]} bonus={bonusRaca(h.raca, k)} />
              </div>
            );
          })}</div>
          <LegendaPips />
        </section>
        <section className="painel"><h2>Vantagens</h2>
          <div className="vantagens">
            <div className="vantagem-item" data-cy="vantagem-classe"><Escudo tintura={c.tintura} icone={c.icone} tam={36} />
              <p className="vantagem"><strong>{c.vantagem.nome}</strong> ({c.nome}). {c.vantagem.texto}</p></div>
            <div className="vantagem-item" data-cy="vantagem-raca"><span className="raca-icone"><Icone nome={rc.icone} /></span>
              <p className="vantagem"><strong>{rc.vantagem.nome}</strong> ({rc.nome}). {rc.vantagem.texto}</p></div>
          </div>
        </section>
      </div>

      {confirmando && (
        <Modal titulo="Aposentar herói?" botao="Aposentar herói" perigo ocupado={ocupado}
          texto={`${h.nome} vai deixar a guilda junto com o inventário e o ouro. Depois disso, você volta para a criação de personagem. Essa ação não pode ser desfeita.`}
          aoConfirmar={aposentar} aoCancelar={() => setConfirmando(false)} />
      )}
    </div>
  );
}
