import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
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

        <nav className="navbar__nav" aria-label="Principal">
          <Link to="/sobre" className="navbar__link">
            Sobre
          </Link>

          <Link to="/simulacoes" className="navbar__link">
            Simulações
          </Link>

          <span className="navbar__link-group">
            {user ? (
              <button type="button" className="navbar__link" onClick={handleLogout}>
                Sair
              </button>
            ) : (
              <Link to="/login" className="navbar__link">
                Login
              </Link>
            )}
            <ThemeToggle />
          </span>
        </nav>
      </div>
    </header>
  );
}
