import { useEffect, useRef, useState } from 'react';
import Escudo, { EscudoVazio } from '../../components/Escudo';
import Icone from '../../components/Icone';
import Pips, { LegendaPips } from '../../components/Pips';
import { useAvisar } from '../../components/Toasts';
import { useJogo } from '../../contexto/Jogo';
import { bonusRaca, efetivo, erroTamanhoNome, hpMaxDe, rolar, rotuloBrasao, soma, textoBonus, totalPontos } from '../../regras/formulas';
import { ATRIBUTOS, CLASSES, ETAPAS, ICONES_BRASAO, MAX_ATR, MIN_ATR, RACAS, SUGESTOES, TINTURAS } from '../../regras/personagem';
import { criarPersonagem, nomeEmUso } from '../../services/herois';

const NOME_EM_USO = 'Esse nome já pertence ao herói de outro jogador.';

function novoRascunho() {
  return {
    classe: null, raca: null,
    base: { forca: 1, destreza: 1, inteligencia: 1, constituicao: 1 },
    nome: '', icone: null, tintura: null,
    rolagens: null, d20: null
  };
}

// Ícone e cor seguem a classe até o jogador escolher outros
const iconeAtual = r => r.icone || (r.classe ? CLASSES[r.classe].icone : null);
const tinturaAtual = r => r.tintura || (r.classe ? CLASSES[r.classe].tintura : null);
const restantes = r => totalPontos(r.raca) - soma(r.base);

function errosEtapa(r, i) {
  switch (ETAPAS[i].id) {
    case 'classe': return r.classe ? '' : 'Escolha uma classe para continuar.';
    case 'raca': return r.raca ? '' : 'Escolha uma raça para continuar.';
    case 'atributos': {
      const rest = restantes(r);
      return rest > 0 ? `Distribua mais ${rest} ${rest === 1 ? 'ponto' : 'pontos'} para continuar.` : '';
    }
    case 'brasao': return erroTamanhoNome(r.nome);
    case 'revisao': return r.d20 ? '' : 'Role o d20 para definir o ouro inicial.';
    default: return '';
  }
}
const podeIrPara = (r, i) => ETAPAS.slice(0, i).every((_, j) => !errosEtapa(r, j));

export default function Criacao() {
  const [r, setR] = useState(novoRascunho);
  const [etapa, setEtapa] = useState(0);
  const [erroEtapa, setErroEtapa] = useState('');
  const [erroNome, setErroNome] = useState('');
  const [avisoPontos, setAvisoPontos] = useState(false);
  const [rolando, setRolando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const painel = useRef(null);
  const primeiraVez = useRef(true);
  const { setHeroi } = useJogo();
  const avisar = useAvisar();
  const id = ETAPAS[etapa].id;
  const ultima = etapa === ETAPAS.length - 1;

  // Ao trocar de etapa, o foco vai para o título da etapa
  useEffect(() => {
    if (primeiraVez.current) { primeiraVez.current = false; return; }
    painel.current?.querySelector('.etapa-titulo')?.focus();
  }, [etapa]);

  const atualizar = mudanca => { setR(atual => ({ ...atual, ...mudanca })); setErroEtapa(''); };

  function irPara(j) {
    if (j === etapa || !podeIrPara(r, j)) return;
    if (ETAPAS[etapa].id === 'atributos') setAvisoPontos(false);
    setErroEtapa('');
    setEtapa(j);
  }

  function escolherRaca(raca) {
    // Trocar para uma raça com menos pontos reinicia a distribuição
    if (soma(r.base) > totalPontos(raca)) {
      atualizar({ raca, base: { forca: 1, destreza: 1, inteligencia: 1, constituicao: 1 } });
      setAvisoPontos(true);
    } else {
      atualizar({ raca });
    }
  }

  function mudarAtributo(k, dir) {
    const novo = r.base[k] + dir;
    if (novo < MIN_ATR || novo > MAX_ATR || (dir > 0 && restantes(r) <= 0)) return;
    atualizar({ base: { ...r.base, [k]: novo } });
  }

  function sugerir() {
    const valores = SUGESTOES[totalPontos(r.raca)], base = { ...r.base };
    CLASSES[r.classe].prioridade.forEach((k, i) => { base[k] = valores[i]; });
    atualizar({ base });
  }

  function mudarNome(nome) {
    atualizar({ nome });
    setErroNome('');
  }

  // Halfling (Sortudo) rola duas vezes e fica com o maior
  function rolarD20() {
    if (r.d20) return;
    const rolagens = r.raca === 'halfling' ? [rolar(20), rolar(20)] : [rolar(20)];
    atualizar({ rolagens, d20: Math.max(...rolagens) });
    setRolando(true);
    requestAnimationFrame(() => painel.current?.querySelector('[data-cy="resultado-d20"]')?.focus());
  }

  async function continuar(ev) {
    ev.preventDefault();
    if (enviando) return;
    const erro = errosEtapa(r, etapa);
    if (erro) {
      setErroEtapa(erro);
      if (id === 'brasao') { setErroNome(erro); painel.current.querySelector('#f-nome-heroi').focus(); }
      return;
    }
    if (id === 'brasao') {
      setEnviando(true);
      let emUso = false;
      try { emUso = await nomeEmUso(r.nome); } catch { /* sem resposta: o banco confere na criação */ }
      setEnviando(false);
      if (emUso) {
        setErroEtapa(NOME_EM_USO);
        setErroNome(NOME_EM_USO);
        painel.current.querySelector('#f-nome-heroi').focus();
        return;
      }
    }
    if (!ultima) { irPara(etapa + 1); return; }
    setEnviando(true);
    try {
      const heroi = await criarPersonagem({ ...r, brasao: { icone: iconeAtual(r), tintura: tinturaAtual(r) } });
      avisar(`Personagem criado: ${heroi.nome}. Você começa com ${heroi.ouro} moedas.`);
      setHeroi({ ...heroi, recemCriado: true });
    } catch (erro) {
      setEnviando(false);
      avisar(erro.message, 'erro');
      // Nome tomado entre a conferência e a criação: volta para a etapa do nome
      if (erro.original?.hint === 'nome_em_uso') {
        setErroNome(erro.message);
        setEtapa(ETAPAS.findIndex(e => e.id === 'brasao'));
      }
    }
  }

  const conteudo = {
    classe: () => (
      <>
        <h2 className="etapa-titulo" tabIndex={-1}>Escolha a sua classe</h2>
        <p className="ajuda">A classe define o HP base, o atributo usado nos ataques e uma vantagem exclusiva.</p>
        <fieldset><legend className="visualmente-oculto">Classe</legend>
          <div className="cartoes-opcao">{Object.entries(CLASSES).map(([k, c]) => (
            <div className="opcao opcao-cartao" key={k}>
              <input type="radio" name="classe" id={`cl-${k}`} value={k} checked={r.classe === k} onChange={() => atualizar({ classe: k })} data-cy={`opcao-classe-${k}`} />
              <label htmlFor={`cl-${k}`}>
                <span className="cartao-topo"><Escudo tintura={c.tintura} icone={c.icone} tam={44} />
                  <span><span className="cartao-nome">{c.nome}</span><span className="ajuda">HP base {c.hpBase}, ataca com {ATRIBUTOS[c.principal].nome}</span></span></span>
                <span className="vantagem" data-cy={`vantagem-classe-${k}`}><strong>{c.vantagem.nome}.</strong> {c.vantagem.texto}</span>
              </label>
            </div>
          ))}</div>
        </fieldset>
      </>
    ),

    raca: () => (
      <>
        <h2 className="etapa-titulo" tabIndex={-1}>Escolha a sua raça</h2>
        <p className="ajuda">A raça soma bônus aos atributos e traz uma vantagem própria.</p>
        <fieldset><legend className="visualmente-oculto">Raça</legend>
          <div className="cartoes-opcao">{Object.entries(RACAS).map(([k, rc]) => (
            <div className="opcao opcao-cartao" key={k}>
              <input type="radio" name="raca" id={`rc-${k}`} value={k} checked={r.raca === k} onChange={() => escolherRaca(k)} data-cy={`opcao-raca-${k}`} />
              <label htmlFor={`rc-${k}`}>
                <span className="cartao-topo"><span className="raca-icone"><Icone nome={rc.icone} /></span>
                  <span><span className="cartao-nome">{rc.nome}</span>
                    <span className="bonus-chips">
                      {Object.entries(rc.bonus).map(([a, v]) => (
                        <span key={a} className={`bonus-chip ${v < 0 ? 'negativo' : ''}`.trim()}>{v > 0 ? '+' : '−'}{Math.abs(v)} {ATRIBUTOS[a].nome}</span>
                      ))}
                      {rc.pontosExtras > 0 && <span className="bonus-chip">+{rc.pontosExtras} pontos</span>}
                    </span></span></span>
                <span className="vantagem" data-cy={`vantagem-raca-${k}`}><strong>{rc.vantagem.nome}.</strong> {rc.vantagem.texto}</span>
              </label>
            </div>
          ))}</div>
        </fieldset>
      </>
    ),

    atributos: () => {
      const c = CLASSES[r.classe], rest = restantes(r);
      return (
        <>
          <h2 className="etapa-titulo" tabIndex={-1}>Distribua os pontos</h2>
          <p className="ajuda">Cada atributo vai de 1 a 10 antes dos bônus. Como {RACAS[r.raca].nome}, você tem {totalPontos(r.raca)} pontos para distribuir. O bônus da raça entra depois.</p>
          {avisoPontos && <p className="aviso-inline" data-cy="aviso-pontos-reiniciados">Os pontos foram reiniciados porque a raça escolhida mudou o total disponível.</p>}
          <div className="pontos-cab">
            <p className="pontos">Pontos restantes <strong data-cy="pontos-restantes">{rest}</strong></p>
            <div className="pontos-acoes">
              <button type="button" className="btn btn-pequeno" onClick={sugerir} data-cy="btn-sugerir-distribuicao">Sugerir para {c.nome}</button>
              <button type="button" className="btn btn-pequeno" onClick={() => atualizar({ base: { forca: 1, destreza: 1, inteligencia: 1, constituicao: 1 } })} data-cy="btn-reiniciar-pontos">Reiniciar</button>
            </div>
          </div>
          <div className="atributos">{Object.entries(ATRIBUTOS).map(([k, a]) => {
            const bonusTxt = textoBonus(r.raca, k);
            return (
              <div key={k} className={`atributo atributo-criacao ${c.principal === k ? 'principal' : ''}`.trim()} data-cy={`atributo-${k}`}>
                <span className="atributo-nome"><Icone nome={a.icone} />
                  <span>{a.nome}{c.principal === k && <span className="selo-principal">Principal</span>}<small>{a.desc}</small></span></span>
                <span className="atributo-pips"><Pips base={r.base[k]} bonus={bonusRaca(r.raca, k)} /></span>
                <div className="passo">
                  <button type="button" className="btn" onClick={() => mudarAtributo(k, -1)} disabled={r.base[k] <= MIN_ATR} aria-label={`Diminuir ${a.nome}`} data-cy={`btn-menos-${k}`}>−</button>
                  <output data-cy={`valor-${k}`} aria-live="polite">{r.base[k]}</output>
                  <button type="button" className="btn" onClick={() => mudarAtributo(k, 1)} disabled={r.base[k] >= MAX_ATR || rest <= 0} aria-label={`Aumentar ${a.nome}`} data-cy={`btn-mais-${k}`}>+</button>
                </div>
                <span className="efetivo" data-cy={`efetivo-${k}`}><strong>{efetivo(r.base, r.raca, k)}</strong>{bonusTxt && <small>{bonusTxt}</small>}</span>
              </div>
            );
          })}</div>
          <LegendaPips />
        </>
      );
    },

    brasao: () => {
      const tintura = tinturaAtual(r), icone = iconeAtual(r);
      return (
        <>
          <h2 className="etapa-titulo" tabIndex={-1}>Monte o brasão e dê um nome</h2>
          <div className="campo"><label htmlFor="f-nome-heroi">Nome do herói</label>
            <input id="f-nome-heroi" type="text" maxLength={40} autoComplete="off" value={r.nome} onChange={e => mudarNome(e.target.value)}
              aria-describedby="a-nome-heroi e-nome-heroi" aria-invalid={erroNome ? 'true' : 'false'} data-cy="input-nome-heroi" />
            <p className="ajuda" id="a-nome-heroi">De 3 a 40 caracteres. O nome precisa ser único entre todos os jogadores.</p>
            <p className="erro" id="e-nome-heroi" data-cy="erro-nome-heroi">{erroNome}</p></div>
          <fieldset className="secao-brasao"><legend>Ícone do brasão</legend>
            <div className="galeria-icones">{ICONES_BRASAO.map(i => (
              <div className="opcao opcao-icone" key={i.id}>
                <input type="radio" name="icone" id={`ico-${i.id}`} value={i.id} checked={icone === i.id} onChange={() => atualizar({ icone: i.id })} data-cy={`opcao-icone-${i.id}`} />
                <label htmlFor={`ico-${i.id}`}><Escudo tintura={tintura} icone={i.id} tam={34} /><small>{i.nome}</small></label>
              </div>
            ))}</div>
          </fieldset>
          <fieldset className="secao-brasao"><legend>Cor do brasão</legend>
            <div className="galeria-cores">{Object.entries(TINTURAS).map(([k, t]) => (
              <span className="opcao-cor" key={k}>
                <input type="radio" name="tintura" id={`tt-${k}`} value={k} checked={tintura === k} onChange={() => atualizar({ tintura: k })} data-cy={`opcao-cor-${k}`} />
                <label htmlFor={`tt-${k}`}><span className="amostra" style={{ background: t.campo }} />{t.nome}</label>
              </span>
            ))}</div>
            <p className="ajuda" style={{ marginTop: '.6rem' }}>O ícone e a cor começam com os da sua classe. Em ouro e prata, o ícone fica escuro, como manda a regra da heráldica.</p>
          </fieldset>
        </>
      );
    },

    revisao: () => {
      const c = CLASSES[r.classe], rc = RACAS[r.raca];
      const linha = (rotulo, valor, j) => (
        <div><dt>{rotulo}</dt><dd>{valor}</dd>
          <dd><button type="button" className="btn-link" onClick={() => irPara(j)} data-cy={`link-alterar-${ETAPAS[j].id}`}>Alterar</button></dd></div>
      );
      return (
        <>
          <h2 className="etapa-titulo" tabIndex={-1}>Revise e role o d20</h2>
          <dl className="resumo" data-cy="resumo-criacao">
            {linha('Classe', <>{c.nome} <small>{c.vantagem.nome}</small></>, 0)}
            {linha('Raça', <>{rc.nome} <small>{rc.vantagem.nome}</small></>, 1)}
            {linha('Atributos', Object.entries(ATRIBUTOS).map(([k, a]) => `${a.nome} ${efetivo(r.base, r.raca, k)}`).join(', '), 2)}
            {linha('Nome e brasão', <>{r.nome.trim()} <small>{rotuloBrasao(iconeAtual(r), tinturaAtual(r)).replace('Brasão: ', '')}</small></>, 3)}
          </dl>
          <div className="dado-painel">
            <button type="button" className={`dado-btn ${rolando ? 'rolando' : ''}`.trim()} onClick={rolarD20} disabled={!!r.d20}
              aria-label={r.d20 ? 'd20 já rolado' : 'Rolar d20'} data-cy="btn-rolar-d20"><Icone nome="dice-twenty-faces-twenty" /></button>
            <div aria-live="polite">
              {r.d20 ? (
                <>
                  <p className="resultado-dado" tabIndex={-1} data-cy="resultado-d20">{r.d20}</p>
                  {r.rolagens.length > 1
                    ? <p className="ajuda" data-cy="rolagens-d20">Rolagens: {r.rolagens.join(' e ')}. Fica o maior. Ouro inicial: {r.d20 * 10} moedas.</p>
                    : <p className="ajuda">Ouro inicial: {r.d20 * 10} moedas.</p>}
                </>
              ) : (
                <p className="ajuda">Clique no dado para rolar. O resultado vezes 10 vira o ouro inicial.{r.raca === 'halfling' && ' Como Halfling, você rola duas vezes e fica com o maior.'}</p>
              )}
            </div>
          </div>
        </>
      );
    }
  };

  const icone = iconeAtual(r), tintura = tinturaAtual(r);

  return (
    <>
      <header className="tela-cab"><div>
        <h1 tabIndex={-1}>Crie o seu herói</h1>
        <p className="tela-desc">Este é o seu primeiro acesso. Cada jogador tem um único herói, e depois de criado só o nome pode ser alterado.</p>
      </div></header>
      <ol className="etapas" aria-label="Etapas da criação" data-cy="indicador-etapas">{ETAPAS.map((e, j) => {
        const atual = j === etapa, feita = j < etapa && !errosEtapa(r, j);
        return (
          <li key={e.id} className={`etapa ${atual ? 'atual' : ''} ${feita ? 'feita' : ''}`.trim()}>
            <button type="button" onClick={() => irPara(j)} aria-current={atual ? 'step' : undefined} disabled={atual || !podeIrPara(r, j)} data-cy={`etapa-${e.id}`}>
              <span className="etapa-num">{feita ? <Icone nome="check-mark" /> : j + 1}</span><span className="etapa-nome">{e.titulo}</span>
            </button>
          </li>
        );
      })}</ol>
      <div className="criacao">
        <aside className="painel previa-ficha" aria-label="Prévia do herói" data-cy="previa-heroi">
          {icone ? <Escudo tintura={tintura} icone={icone} tam={130} rotulo={rotuloBrasao(icone, tintura)} /> : <EscudoVazio tam={130} />}
          <h2 className="ficha-nome" data-cy="previa-nome">{r.nome.trim() || 'Herói sem nome'}</h2>
          <p className="card-sub" data-cy="previa-classe-raca">{r.classe ? CLASSES[r.classe].nome : 'Classe a escolher'}, {r.raca ? RACAS[r.raca].nome : 'raça a escolher'}</p>
          <p className="nivel-grande">Nível 1</p>
          <dl className="previa-dados">
            <dt>HP inicial</dt><dd data-cy="previa-hp">{r.classe ? hpMaxDe(r.classe, r.base, r.raca, 1) : 'Escolha a classe'}</dd>
            <dt>Ouro inicial</dt><dd data-cy="previa-ouro">{r.d20 ? `${r.d20 * 10} moedas` : 'Role o d20'}</dd>
          </dl>
          <div className="previa-attrs" data-cy="previa-atributos">{Object.entries(ATRIBUTOS).map(([k, a]) => (
            <span key={k}>{a.nome}<strong data-cy={`previa-${k}`}>{efetivo(r.base, r.raca, k)}</strong></span>
          ))}</div>
        </aside>
        <form ref={painel} className="painel etapa-painel" onSubmit={continuar} noValidate data-cy="form-criacao">
          <div data-cy={`etapa-${id}-conteudo`}>{conteudo[id]()}</div>
          <p className="erro erro-etapa" role="alert" data-cy="erro-etapa">{erroEtapa}</p>
          <div className="etapa-botoes">
            {etapa > 0 ? <button type="button" className="btn" onClick={() => irPara(etapa - 1)} data-cy="btn-etapa-voltar">Voltar</button> : <span />}
            {ultima
              ? <button className="btn btn-primario" disabled={enviando} aria-busy={enviando} data-cy="btn-criar-personagem"><Icone nome="quill-ink" />Criar personagem</button>
              : <button className="btn btn-primario" disabled={enviando} aria-busy={enviando} data-cy="btn-etapa-continuar">Continuar</button>}
          </div>
        </form>
      </div>
    </>
  );
}
