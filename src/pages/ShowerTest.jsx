import { useState } from 'react';
import { Link } from 'react-router-dom';
import ShowerTitle from '../components/home/ShowerTitle';
import { NAVBAR_SHOWER_CONFIG } from '../components/home/emShowerTitle';
import '../components/layout/Navbar.css';

// Página de TESTE (só existe em `npm run dev`, ver App.jsx) — uma cópia
// da navbar com o logo "Geantino Labs" sendo escrito pelo chuveiro
// eletromagnético, mesmo tamanho/estilo da navbar real, com botão pra
// repetir. Quando estiver aprovado, troca o <Link className="navbar__brand">
// do Navbar.jsx pelo <ShowerTitle ...> abaixo (com playOnceKey, pra só
// animar no carregamento do site) e apaga esta página + a rota.
export default function ShowerTest() {
  const [run, setRun] = useState(0);

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner">
          <ShowerTitle
            key={run}
            as={Link}
            to="/"
            className="navbar__brand"
            config={NAVBAR_SHOWER_CONFIG}
          >
            Geantino Labs
          </ShowerTitle>

          <nav className="navbar__nav" aria-label="Principal">
            <Link to="/sobre" className="navbar__link">Sobre</Link>
            <Link to="/simulacoes" className="navbar__link">Simulações</Link>
            <Link to="/painel" className="navbar__link">Painel</Link>
            <span className="navbar__link navbar__link--danger">Sair</span>
          </nav>
        </div>
      </header>

      <main style={{ padding: 'var(--space-5) var(--space-3)' }}>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          style={{
            padding: '0.9rem 1.6rem',
            background: 'var(--color-beam)',
            color: 'var(--color-void)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Repetir animação
        </button>
      </main>
    </>
  );
}
