import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Se o login foi disparado pelo RequireAuth (tentou rodar uma
  // simulação sem estar logado), volta pra lá depois de entrar.
  const redirectTo = location.state?.from || '/simulacoes';

  function switchMode() {
    setMode((current) => (current === 'signup' ? 'login' : 'signup'));
    setError('');
    setInfo('');
  }

  function goToForgotPassword() {
    setMode('forgot');
    setError('');
    setInfo('');
  }

  function backToLogin() {
    setMode('login');
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
      } else if (mode === 'forgot') {
        await resetPasswordForEmail(email);
        // Mensagem genérica de propósito — não confirma nem nega se o
        // e-mail existe na base, pra não vazar quais e-mails têm conta.
        setInfo('Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha.');
      } else {
        const result = await signUp({ username, email, password });
        if (result?.session) {
          // Confirmação por e-mail desativada no projeto Supabase (ou
          // já confirmada automaticamente) — o cadastro já volta com
          // uma sessão ativa, então loga direto em vez de mandar
          // confirmar algo que não precisa.
          navigate(redirectTo, { replace: true });
        } else {
          // Confirmação por e-mail ativada — o Supabase não emite
          // sessão até o e-mail ser confirmado, então não tem como
          // logar automaticamente aqui; só avisa e volta pra tela de
          // entrar.
          setInfo('Conta criada! Confira sua caixa de entrada para confirmar o e-mail antes de entrar.');
          setMode('login');
          setPassword('');
        }
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
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Esqueci minha senha'}
          </h1>
          <p className="login-card__hint">
            {mode === 'forgot'
              ? 'Informe seu e-mail e enviamos um link para redefinir a senha.'
              : 'É preciso estar logado pra rodar as simulações.'}
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

            {mode !== 'forgot' && (
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
            )}

            {mode === 'login' && (
              <button type="button" className="login-form__forgot" onClick={goToForgotPassword}>
                Esqueci minha senha
              </button>
            )}

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
              {submitting
                ? 'Aguarde…'
                : mode === 'login'
                  ? 'Entrar'
                  : mode === 'signup'
                    ? 'Criar conta'
                    : 'Enviar link'}
            </button>
          </form>

          {mode === 'forgot' ? (
            <button type="button" className="login-card__switch" onClick={backToLogin}>
              ← Voltar pra tela de entrar
            </button>
          ) : (
            <button type="button" className="login-card__switch" onClick={switchMode}>
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </button>
          )}

          <Link to="/simulacoes" className="login-card__back">
            ← Voltar pras simulações
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
