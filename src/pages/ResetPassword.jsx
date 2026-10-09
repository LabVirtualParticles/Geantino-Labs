import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import './Login.css';

/**
 * Página de destino do link de "esqueci minha senha" (ver
 * AuthContext.resetPasswordForEmail). O supabase-js lê sozinho o token
 * de recuperação que vem na URL e abre uma sessão temporária — é essa
 * sessão (refletida em `user` via AuthContext) que autoriza o
 * updatePassword() abaixo.
 */
export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(
        err.message ||
          'Não foi possível atualizar a senha. O link pode ter expirado — peça um novo em "Esqueci minha senha".'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <Navbar />

      <main className="login-page__main">
        <div className="login-card">
          <h1 className="login-card__title">Redefinir senha</h1>

          {loading ? (
            <p className="login-card__hint">Verificando link…</p>
          ) : success ? (
            <>
              <p className="login-form__message login-form__message--info" role="status">
                Senha atualizada! Você já pode continuar.
              </p>
              <button
                type="button"
                className="login-form__submit"
                onClick={() => navigate('/simulacoes', { replace: true })}
              >
                Ir para simulações
              </button>
            </>
          ) : !user ? (
            <>
              <p className="login-card__hint">
                Este link de redefinição é inválido ou expirou. Peça um novo na tela de login.
              </p>
              <Link to="/login" className="login-card__back">
                ← Voltar para o login
              </Link>
            </>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-form__field">
                <span>Nova senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>

              <label className="login-form__field">
                <span>Confirmar nova senha</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>

              {error && (
                <p className="login-form__message login-form__message--error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="login-form__submit" disabled={submitting}>
                {submitting ? 'Aguarde…' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
