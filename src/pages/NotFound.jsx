import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import { Zueira } from '../context/Zueira';
import './NotFound.css';

// Rota coringa (ver App.jsx, path="*") — pega qualquer URL que não bate
// com nenhuma rota real do site.
export default function NotFound() {
  return (
    <div className="not-found">
      <Navbar />

      <main className="not-found__main">
        <div className="not-found__nebula" aria-hidden="true">
          <div className="bgx-spiral-galaxy">
            <div className="bgx-spiral-galaxy-disk">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <div className="not-found__content">
          <p className="not-found__eyebrow">Erro 404</p>
          <h1 className="not-found__title">404</h1>
          <p className="not-found__lede">
            <Zueira fallback="Pelo jeito sua requisição foi para o espaço.">
              Você saiu do mapa. Nem o geantino passa por aqui.
            </Zueira>
          </p>
          <Link to="/" className="not-found__cta">
            <Zueira fallback="Voltar pra Terra">Voltar pro rolê</Zueira>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
