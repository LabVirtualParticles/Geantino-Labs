import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ShowerTitle from '../home/ShowerTitle';
import { NAVBAR_SHOWER_CONFIG } from '../home/emShowerTitle';
import './Navbar.css';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        {/* Logo "escrito" por um chuveiro eletromagnético toda vez que uma
            página carrega. O key={pathname} garante que a animação
            recomece a cada troca de página, mesmo quando o React
            reaproveita a Navbar (ex.: de uma categoria do catálogo pra
            outra, que usam o mesmo componente de página). Pra animar só
            no primeiro carregamento do site: tirar o key e adicionar
            playOnceKey="navbar-logo". */}
        <ShowerTitle
          key={pathname}
          as={Link}
          to="/"
          className="navbar__brand"
          config={NAVBAR_SHOWER_CONFIG}
        >
          Geantino Labs
        </ShowerTitle>

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
