import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { buscarMeuHeroi } from '../services/herois';
import { buscarMeuPerfil } from '../services/perfis';
import { useSessao } from './Sessao';

const ContextoJogo = createContext(null);

// Herói e perfil do jogador logado, compartilhados entre as telas
export function ProvedorJogo({ children }) {
  const { sessao } = useSessao();
  const userId = sessao?.user?.id ?? null;
  const [heroi, setHeroi] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const recarregar = useCallback(async () => {
    if (!userId) { setHeroi(null); setPerfil(null); setCarregando(false); return; }
    setCarregando(true);
    setErro('');
    try {
      const [h, p] = await Promise.all([buscarMeuHeroi(), buscarMeuPerfil()]);
      setHeroi(h);
      setPerfil(p);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => { recarregar(); }, [recarregar]);

  return (
    <ContextoJogo.Provider value={{ heroi, setHeroi, perfil, setPerfil, carregando, erro, recarregar }}>
      {children}
    </ContextoJogo.Provider>
  );
}

export function useJogo() {
  return useContext(ContextoJogo);
}
