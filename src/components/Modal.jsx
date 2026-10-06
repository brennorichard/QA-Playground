import { useEffect, useId, useRef, useState } from 'react';

// Modal de confirmação. Com "exigir", o botão só habilita depois de digitar o texto.
export default function Modal({ titulo, texto, botao, perigo = false, exigir = null, ocupado = false, aoConfirmar, aoCancelar }) {
  const [digitado, setDigitado] = useState('');
  const caixa = useRef(null);
  const anterior = useRef(document.activeElement);
  const id = useId();

  useEffect(() => {
    const voltar = anterior.current;
    caixa.current.querySelector(exigir ? 'input' : '[data-cy="btn-modal-cancelar"]').focus();
    return () => { if (voltar && document.contains(voltar)) voltar.focus(); };
  }, [exigir]);

  function tecla(e) {
    if (e.key === 'Escape') { aoCancelar(); return; }
    if (e.key !== 'Tab') return;
    const focaveis = caixa.current.querySelectorAll('button:not([disabled]), input');
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }

  const liberado = !exigir || digitado.trim() === exigir;

  return (
    <div className="modal-fundo" onMouseDown={e => { if (e.target === e.currentTarget) aoCancelar(); }} onKeyDown={tecla}>
      <div ref={caixa} className="modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-cy="modal-confirmacao">
        <h2 id={`${id}-t`}>{titulo}</h2>
        <p id={`${id}-d`}>{texto}</p>
        {exigir && (
          <div className="campo">
            <label htmlFor={`${id}-i`}>Digite <strong>{exigir}</strong> para confirmar</label>
            <input id={`${id}-i`} type="text" autoComplete="off" value={digitado} onChange={e => setDigitado(e.target.value)} data-cy="input-confirmacao" />
          </div>
        )}
        <div className="modal-acoes">
          <button type="button" className="btn" onClick={aoCancelar} data-cy="btn-modal-cancelar">Cancelar</button>
          <button type="button" className={`btn ${perigo ? 'btn-perigo-cheio' : 'btn-primario'}`} onClick={aoConfirmar}
            disabled={!liberado || ocupado} data-cy="btn-modal-confirmar">{botao}</button>
        </div>
      </div>
    </div>
  );
}
