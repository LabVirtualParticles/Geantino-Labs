import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import './NotFound.css';

// Rota coringa (ver App.jsx, path="*") — pega qualquer URL que não bate
// com nenhuma rota real do site.
export default function NotFound() {
  return (
    <div className="not-found">
      <Navbar />

      <main className="not-found__main">
        <div className="not-found__nebula" aria-hidden="true">
          <span className="not-found__stars" />
          <span className="not-found__cloud not-found__cloud--1" />
          <span className="not-found__cloud not-found__cloud--2" />
          <span className="not-found__cloud not-found__cloud--3" />
        </div>

        <div className="not-found__content">
          <p className="not-found__eyebrow">Erro 404</p>
          <h1 className="not-found__title">404</h1>
          <p className="not-found__lede">
            Pelo jeito sua requisição foi para o espaço.
          </p>
          <Link to="/" className="not-found__cta">
            Voltar pra Terra
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
