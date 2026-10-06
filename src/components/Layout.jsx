import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useJogo } from '../contexto/Jogo';
import Escudo from './Escudo';
import Icone from './Icone';

// Menu: só as telas já implementadas (as das fases 2 e 3 entram quando ficarem prontas)
const MENU = [
  { rota: '/heroi', titulo: 'Ficha do herói', icone: 'scroll-quill', cy: 'nav-heroi' },
  { rota: '/hall-da-fama', titulo: 'Hall da Fama', icone: 'laurels-trophy', cy: 'nav-hall-da-fama' },
  { rota: '/configuracoes', titulo: 'Configurações', icone: 'cog', cy: 'nav-configuracoes' }
];

export default function Layout() {
  const { heroi, perfil } = useJogo();
  const { pathname } = useLocation();
  const conteudo = useRef(null);
  const primeiraVez = useRef(true);

  // Ao trocar de tela, leva o foco ao título (leitores de tela anunciam a nova página)
  useEffect(() => {
    if (primeiraVez.current) { primeiraVez.current = false; return; }
    window.scrollTo(0, 0);
    const h1 = conteudo.current?.querySelector('h1');
    (h1 || conteudo.current)?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="pular" href="#conteudo" onClick={e => { e.preventDefault(); conteudo.current.focus(); }}>Pular para o conteúdo</a>
      <div className="app">
        <aside className="lateral" aria-label="Navegação">
          <Link className="marca" to="/heroi" data-cy="link-marca">
            <Escudo tintura="goles" icone="crossed-swords" tam={44} />
            <span className="marca-nome">Quality Quest</span>
          </Link>
          <nav className="nav" aria-label="Telas">
            <ul className="nav-lista">
              {MENU.map(m => (
                <li key={m.rota}>
                  <NavLink to={m.rota} data-cy={m.cy}><Icone nome={m.icone} /><span>{m.titulo}</span></NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="creditos">
            Ícones de Lorc, Delapouite, Skoll e Willdabeast em <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">game-icons.net</a>, licença CC BY 3.0. Cores adaptadas.
          </p>
        </aside>
        <div className="principal">
          <header className="topo">
            <span className="saldo" data-cy="saldo-ouro" title="Ouro do herói"><Icone nome="two-coins" />{heroi ? heroi.ouro : 0} moedas</span>
            <span className="jogador" data-cy="nome-jogador"><Icone nome="visored-helm" />{perfil?.nomeExibicao ?? ''}</span>
          </header>
          <main className="conteudo" id="conteudo" tabIndex={-1} ref={conteudo}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
