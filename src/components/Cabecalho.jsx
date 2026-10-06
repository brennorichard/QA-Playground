// Cabeçalho padrão das telas: título (recebe o foco ao navegar), descrição e ações
export default function Cabecalho({ titulo, desc, children }) {
  return (
    <header className="tela-cab">
      <div>
        <h1 tabIndex={-1}>{titulo}</h1>
        {desc && <p className="tela-desc">{desc}</p>}
      </div>
      {children}
    </header>
  );
}
