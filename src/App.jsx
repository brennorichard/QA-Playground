import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ProvedorToasts } from './components/Toasts';
import { ProvedorJogo } from './contexto/Jogo';
import { ProvedorSessao, useSessao } from './contexto/Sessao';
import Arena from './pages/arena/Arena';
import Configuracoes from './pages/configuracoes/Configuracoes';
import HallDaFama from './pages/hall-da-fama/HallDaFama';
import Heroi from './pages/heroi/Heroi';
import Inventario from './pages/inventario/Inventario';
import Mercador from './pages/mercador/Mercador';
import Missoes from './pages/missoes/Missoes';
import Perdido from './pages/perdido/Perdido';
import Portao from './pages/portao/Portao';
import Taverna from './pages/taverna/Taverna';

function Carregando() {
  return <p className="carregando" role="status" data-cy="carregando">Carregando…</p>;
}

// Fora o Portão, todas as rotas exigem sessão
function RotaProtegida({ children }) {
  const { sessao, carregando } = useSessao();
  if (carregando) return <Carregando />;
  if (!sessao) return <Navigate to="/portao" replace />;
  return children;
}

function RotaPublica({ children }) {
  const { sessao, carregando } = useSessao();
  if (carregando) return <Carregando />;
  if (sessao) return <Navigate to="/heroi" replace />;
  return children;
}

export default function App() {
  return (
    <ProvedorToasts>
      <ProvedorSessao>
        <ProvedorJogo>
          <Routes>
            <Route path="/" element={<Navigate to="/heroi" replace />} />
            <Route path="/portao" element={<RotaPublica><Portao /></RotaPublica>} />
            <Route element={<RotaProtegida><Layout /></RotaProtegida>}>
              <Route path="/heroi" element={<Heroi />} />
              <Route path="/hall-da-fama" element={<HallDaFama />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/mercador" element={<Mercador />} />
              <Route path="/taverna" element={<Taverna />} />
              <Route path="/missoes" element={<Missoes />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<Perdido />} />
            </Route>
          </Routes>
        </ProvedorJogo>
      </ProvedorSessao>
    </ProvedorToasts>
  );
}
