import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          Geantino Labs
        </Link>

        {/* Todos os itens são filhos diretos de .navbar__nav (sem
            agrupamento em <span>) pra ficarem com o mesmo espaçamento
            entre si — ver gap em .navbar__nav no Navbar.css. */}
        <nav className="navbar__nav" aria-label="Principal">
          <Link to="/sobre" className="navbar__link">
            Sobre
          </Link>

          <Link to="/simulacoes" className="navbar__link">
            Simulações
          </Link>

          {user ? (
            <>
              <Link to="/painel" className="navbar__link">
                Painel
              </Link>
              <button
                type="button"
                className="navbar__link navbar__link--danger"
                onClick={handleLogout}
              >
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="navbar__link">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
