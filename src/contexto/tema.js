// Tema claro/escuro, salvo só neste navegador
const CHAVE_TEMA = 'quality-quest:tema';

export function temaSalvo() {
  try {
    const t = localStorage.getItem(CHAVE_TEMA);
    if (t === 'claro' || t === 'escuro') return t;
  } catch { /* armazenamento indisponível */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema === 'escuro' ? 'dark' : 'light';
  try { localStorage.setItem(CHAVE_TEMA, tema); } catch { /* armazenamento indisponível */ }
}
