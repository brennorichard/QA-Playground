import { createContext, useContext, useEffect, useState } from 'react';
import { aoMudarSessao, obterSessao } from '../services/auth';

const ContextoSessao = createContext(null);

export function ProvedorSessao({ children }) {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    obterSessao()
      .then(s => { if (ativo) setSessao(s); })
      .catch(() => { if (ativo) setSessao(null); })
      .finally(() => { if (ativo) setCarregando(false); });
    const cancelar = aoMudarSessao(s => setSessao(s));
    return () => { ativo = false; cancelar(); };
  }, []);

  return <ContextoSessao.Provider value={{ sessao, carregando }}>{children}</ContextoSessao.Provider>;
}

export function useSessao() {
  return useContext(ContextoSessao);
}
