import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/400-italic.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import '@fontsource/grenze-gotisch/500.css';
import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/700.css';
import './styles/global.css';
import './styles/app.css';
import App from './App';
import { aplicarTema, temaSalvo } from './contexto/tema';

aplicarTema(temaSalvo());

// HashRouter: o GitHub Pages não redireciona rotas desconhecidas para o index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
