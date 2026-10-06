import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Escudo from '../../components/Escudo';
import { useAvisar } from '../../components/Toasts';
import useTitulo from '../../components/useTitulo';
import { NOME_EXIBICAO_MAX, NOME_EXIBICAO_MIN } from '../../regras/personagem';
import { criarConta, entrar, enviarRedefinicaoSenha } from '../../services/auth';

const emailValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const VAZIO = { nome: '', email: '', senha: '', confirmar: '' };

function Campo({ id, rotulo, tipo, auto, cy, ajuda, valor, erro, aoMudar }) {
  const desc = [ajuda && `a-${id}`, `e-${id}`].filter(Boolean).join(' ');
  return (
    <div className="campo">
      <label htmlFor={`f-${id}`}>{rotulo}</label>
      <input id={`f-${id}`} name={id} type={tipo} autoComplete={auto} value={valor} onChange={e => aoMudar(e.target.value)}
        aria-describedby={desc} aria-invalid={erro ? 'true' : 'false'} data-cy={cy} />
      {ajuda && <p className="ajuda" id={`a-${id}`}>{ajuda}</p>}
      <p className="erro" id={`e-${id}`} data-cy={`erro-${id}`}>{erro}</p>
    </div>
  );
}

export default function Portao() {
  const [modo, setModo] = useState('entrar');
  const [valores, setValores] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const form = useRef(null);
  const avisar = useAvisar();
  const navegar = useNavigate();
  const criar = modo === 'criar';
  useTitulo('Portão da Guilda');

  const mudar = campo => v => setValores(atual => ({ ...atual, [campo]: v }));

  function trocarModo(novo) {
    setModo(novo);
    setErros({});
  }

  function validar() {
    const e = {};
    if (criar) {
      const n = valores.nome.trim().length;
      if (n < NOME_EXIBICAO_MIN || n > NOME_EXIBICAO_MAX) e.nome = 'Use de 3 a 20 caracteres.';
    }
    if (!emailValido(valores.email)) e.email = 'Informe um e-mail válido, como nome@exemplo.com.';
    if (valores.senha.length < 6) e.senha = 'A senha precisa ter pelo menos 6 caracteres.';
    if (criar && (valores.confirmar !== valores.senha || !valores.senha)) e.confirmar = 'As senhas não são iguais.';
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => form.current.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setEnviando(true);
    try {
      if (criar) {
        const sessao = await criarConta({ nome: valores.nome, email: valores.email, senha: valores.senha });
        if (sessao) {
          avisar('Conta criada. Agora crie o seu herói.');
          navegar('/heroi');
        } else {
          // Confirmação de e-mail ligada: a sessão só existe depois do clique no link
          avisar(`Conta criada. Enviamos um e-mail de confirmação para ${valores.email.trim()}.`);
          setValores(VAZIO);
          trocarModo('entrar');
        }
      } else {
        await entrar(valores.email, valores.senha);
        navegar('/heroi');
      }
    } catch (erro) {
      avisar(erro.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  async function esqueci() {
    if (!emailValido(valores.email)) {
      setErros({ email: 'Informe o seu e-mail para receber o link de redefinição.' });
      form.current.querySelector('#f-email').focus();
      return;
    }
    setErros({});
    try {
      await enviarRedefinicaoSenha(valores.email);
      avisar(`Enviamos um link de redefinição para ${valores.email.trim()}.`);
    } catch (erro) {
      avisar(erro.message, 'erro');
    }
  }

  return (
    <main className="conteudo conteudo-portao" id="conteudo" tabIndex={-1}>
      <section className="portao">
        <div className="portao-arte">
          <Escudo tintura="goles" icone="crossed-swords" tam={150} />
          <p className="portao-titulo">Quality Quest</p>
          <p className="tela-desc">Crie o seu herói, equipe a mochila e parta em missões. Um playground para a mentoria.</p>
        </div>
        <div className="painel">
          <h1 tabIndex={-1}>Portão da Guilda</h1>
          <div className="abas" role="tablist" aria-label="Forma de acesso">
            <button type="button" role="tab" className="aba" aria-selected={!criar} onClick={() => trocarModo('entrar')} data-cy="aba-entrar">Entrar</button>
            <button type="button" role="tab" className="aba" aria-selected={criar} onClick={() => trocarModo('criar')} data-cy="aba-criar-conta">Criar conta</button>
          </div>
          <form ref={form} className="form" onSubmit={enviar} noValidate data-cy="form-portao">
            {criar && <Campo id="nome-cadastro" rotulo="Nome de exibição" tipo="text" auto="username" cy="input-nome-cadastro"
              valor={valores.nome} erro={erros.nome} aoMudar={mudar('nome')} />}
            <Campo id="email" rotulo="E-mail" tipo="email" auto="email" cy="input-email"
              valor={valores.email} erro={erros.email} aoMudar={mudar('email')} />
            <Campo id="senha" rotulo="Senha" tipo="password" auto={criar ? 'new-password' : 'current-password'} cy="input-senha"
              ajuda={criar ? 'Mínimo de 6 caracteres.' : ''} valor={valores.senha} erro={erros.senha} aoMudar={mudar('senha')} />
            {criar && <Campo id="confirmar" rotulo="Confirmar senha" tipo="password" auto="new-password" cy="input-confirmar-senha"
              valor={valores.confirmar} erro={erros.confirmar} aoMudar={mudar('confirmar')} />}
            <button className="btn btn-primario btn-bloco" disabled={enviando} aria-busy={enviando} data-cy={criar ? 'btn-criar-conta' : 'btn-entrar'}>
              {criar ? 'Criar conta' : 'Entrar na guilda'}
            </button>
            {criar
              ? <p className="ajuda">Depois do cadastro, enviamos um e-mail de confirmação para ativar a conta.</p>
              : <button type="button" className="btn-link" onClick={esqueci} data-cy="link-esqueci-senha">Esqueci minha senha</button>}
          </form>
        </div>
      </section>
    </main>
  );
}
