import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guarda de rota: só deixa passar quem está logado. Usado só nas
 * páginas que efetivamente RODAM uma simulação (ex.: /simulacoes/rutherford)
 * — o mapa de simulações e o catálogo por categoria continuam públicos,
 * é só a execução em si que exige login.
 */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Evita um "flash" de redirecionamento pro /login enquanto a sessão
    // ainda está sendo checada no primeiro carregamento da página.
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
