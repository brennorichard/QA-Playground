import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cabecalho from '../../components/Cabecalho';
import Icone from '../../components/Icone';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { useJogo } from '../../contexto/Jogo';
import { aplicarTema, temaSalvo } from '../../contexto/tema';
import { NOME_EXIBICAO_MAX, NOME_EXIBICAO_MIN } from '../../regras/personagem';
import { sair } from '../../services/auth';
import { salvarNomeExibicao } from '../../services/perfis';

const TEMAS = [['claro', 'Claro', 'sun'], ['escuro', 'Escuro', 'moon']];

export default function Configuracoes() {
  const { perfil, setPerfil } = useJogo();
  const [nome, setNome] = useState(perfil?.nomeExibicao ?? '');
  const [erroNome, setErroNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [tema, setTema] = useState(temaSalvo);
  const avisar = useAvisar();
  const navegar = useNavigate();
  useTitulo('Configurações');

  // O perfil pode chegar depois da primeira renderização
  useEffect(() => { if (perfil) setNome(perfil.nomeExibicao); }, [perfil]);

  async function salvarNome(ev) {
    ev.preventDefault();
    const n = nome.trim().length;
    if (n < NOME_EXIBICAO_MIN || n > NOME_EXIBICAO_MAX) {
      setErroNome('Use de 3 a 20 caracteres.');
      ev.currentTarget.querySelector('input').focus();
      return;
    }
    setSalvando(true);
    try {
      setPerfil(await salvarNomeExibicao(perfil.userId, nome));
      setErroNome('');
      avisar('Nome de exibição salvo.');
    } catch (e) {
      avisar(e.message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  function mudarTema(t) {
    setTema(t);
    aplicarTema(t);
  }

  async function sairDaGuilda() {
    try {
      await sair();
      avisar('Você saiu da guilda.');
      navegar('/portao');
    } catch (e) {
      avisar(e.message, 'erro');
    }
  }

  return (
    <>
      <Cabecalho titulo="Configurações" desc="Ajuste o seu perfil e a aparência da guilda." />
      <div className="config">
        <section className="painel"><h2>Perfil</h2>
          <form onSubmit={salvarNome} noValidate>
            <div className="campo"><label htmlFor="f-nome-exib">Nome de exibição</label>
              <div className="linha-form">
                <input id="f-nome-exib" type="text" maxLength={NOME_EXIBICAO_MAX} value={nome} onChange={e => { setNome(e.target.value); setErroNome(''); }}
                  aria-describedby="e-nome-exib" aria-invalid={erroNome ? 'true' : 'false'} data-cy="input-nome-exibicao" />
                <button className="btn btn-primario" disabled={salvando || !perfil} aria-busy={salvando} data-cy="btn-salvar-nome">Salvar nome</button>
              </div>
              <p className="erro" id="e-nome-exib" data-cy="erro-nome-exibicao">{erroNome}</p>
            </div>
          </form>
        </section>
        <section className="painel"><h2>Aparência</h2>
          <fieldset><legend>Tema</legend>
            <div className="chips">{TEMAS.map(([v, t, i]) => (
              <span className="chip" key={v}>
                <input type="radio" name="tema" id={`tm-${v}`} value={v} checked={tema === v} onChange={() => mudarTema(v)} data-cy={`opcao-tema-${v}`} />
                <label htmlFor={`tm-${v}`}><Icone nome={i} />{t}</label>
              </span>
            ))}</div>
            <p className="ajuda" style={{ marginTop: '.6rem' }}>O tema fica salvo neste navegador.</p>
          </fieldset>
        </section>
        <section className="painel zona-perigo"><h2>Conta</h2>
          <div className="atalhos">
            <button type="button" className="btn" onClick={sairDaGuilda} data-cy="btn-sair"><Icone nome="exit-door" />Sair da guilda</button>
          </div>
        </section>
        <section className="painel"><h2>Créditos</h2>
          <p className="ajuda">Ícones de Lorc, Delapouite, Skoll e Willdabeast, disponíveis em <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">game-icons.net</a> sob a licença CC BY 3.0. Cores adaptadas.</p>
        </section>
      </div>
    </>
  );
}
