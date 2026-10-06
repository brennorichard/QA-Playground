import { useEffect } from 'react';

// Título da aba: "<tela> | Quality Quest"
export default function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | Quality Quest` : 'Quality Quest';
  }, [titulo]);
}
