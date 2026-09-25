import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Se o login foi disparado pelo RequireAuth (tentou rodar uma
  // simulação sem estar logado), volta pra lá depois de entrar.
  const redirectTo = location.state?.from || '/simulacoes';

  function switchMode() {
    setMode((current) => (current === 'login' ? 'signup' : 'login'));
    setError('');
    setInfo('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn({ email, password });
        navigate(redirectTo, { replace: true });
      } else {
        await signUp({ username, email, password });
        // Se a confirmação por e-mail estiver ativada no projeto
        // Supabase, o login só funciona depois de confirmar — por isso
        // não loga automático aqui, só avisa e volta pra tela de entrar.
        setInfo('Conta criada! Se a confirmação por e-mail estiver ativa no projeto, confira sua caixa de entrada antes de entrar.');
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Algo deu errado. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <Navbar />

      <main className="login-page__main">
        <div className="login-card">
          <h1 className="login-card__title">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="login-card__hint">
            É preciso estar logado pra rodar as simulações.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="login-form__field">
                <span>Nome de usuário</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  autoComplete="username"
                />
              </label>
            )}

            <label className="login-form__field">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="login-form__field">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && (
              <p className="login-form__message login-form__message--error" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="login-form__message login-form__message--info" role="status">
                {info}
              </p>
            )}

            <button type="submit" className="login-form__submit" disabled={submitting}>
              {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <button type="button" className="login-card__switch" onClick={switchMode}>
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>

          <Link to="/simulacoes" className="login-card__back">
            ← Voltar pras simulações
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
