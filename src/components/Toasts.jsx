import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Icone from './Icone';

const DURACAO = 4500;
const ContextoToasts = createContext(null);

export function ProvedorToasts({ children }) {
  const [avisos, setAvisos] = useState([]);
  const proximoId = useRef(1);

  const avisar = useCallback((texto, tipo = 'sucesso') => {
    const id = proximoId.current++;
    setAvisos(a => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos(a => a.filter(x => x.id !== id)), DURACAO);
  }, []);

  return (
    <ContextoToasts.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map(a => (
          <div key={a.id} className={`aviso ${a.tipo === 'erro' ? 'aviso-erro' : ''}`.trim()} data-cy={a.tipo === 'erro' ? 'toast-erro' : 'toast-sucesso'}>
            <Icone nome={a.tipo === 'erro' ? 'cross-mark' : 'checked-shield'} />
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </ContextoToasts.Provider>
  );
}

// avisar('texto') ou avisar('texto', 'erro')
export function useAvisar() {
  return useContext(ContextoToasts);
}
