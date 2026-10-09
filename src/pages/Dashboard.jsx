import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getProfile, uploadAvatar } from '../lib/profile';
import { listReports, deleteReport } from '../lib/reports';
import './Dashboard.css';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'relatorios', label: 'Relatórios' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('perfil');

  return (
    <div className="dashboard-page">
      <Navbar />

      <main className="dashboard-page__main">
        <h1 className="dashboard-page__title">Painel</h1>

        <div className="dashboard-page__layout">
          <nav className="dashboard-tabs" aria-label="Seções do painel">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`dashboard-tabs__item${activeTab === tab.id ? ' dashboard-tabs__item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="dashboard-page__panel">
            {activeTab === 'perfil' && <ProfilePanel />}
            {activeTab === 'seguranca' && <SecurityPanel />}
            {activeTab === 'aparencia' && <AppearancePanel />}
            {activeTab === 'relatorios' && <ReportsPanel />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// --------------------------------------------------------------------- //
// Perfil — avatar + username + e-mail
// --------------------------------------------------------------------- //

function ProfilePanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    getProfile(user.id)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((err) => {
        if (active) setError(err.message ?? String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const avatarUrl = await uploadAvatar(user.id, file);
      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  const initials = (profile?.username || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-panel__title">Perfil</h2>

      {loading ? (
        <p className="dashboard-panel__hint">Carregando…</p>
      ) : (
        <div className="profile-panel__row">
          <div className="profile-panel__avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Foto de perfil" />
            ) : (
              <span className="profile-panel__avatar-fallback">{initials}</span>
            )}
          </div>

          <div className="profile-panel__info">
            <p className="profile-panel__username">{profile?.username ?? '—'}</p>
            <p className="profile-panel__email">{user.email}</p>

            <button
              type="button"
              className="dashboard-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Enviando…' : 'Alterar foto'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="dashboard-panel__message dashboard-panel__message--error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

// --------------------------------------------------------------------- //
// Segurança — trocar senha (já logado, não precisa do fluxo de e-mail)
// --------------------------------------------------------------------- //

function SecurityPanel() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-panel__title">Segurança</h2>
      <p className="dashboard-panel__hint">Trocar a senha da sua conta.</p>

      <form className="dashboard-form" onSubmit={handleSubmit}>
        <label className="dashboard-form__field">
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

        <label className="dashboard-form__field">
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
          <p className="dashboard-panel__message dashboard-panel__message--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="dashboard-panel__message dashboard-panel__message--info" role="status">
            Senha atualizada!
          </p>
        )}

        <button type="submit" className="dashboard-button dashboard-button--primary" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </section>
  );
}

// --------------------------------------------------------------------- //
// Aparência — mesmo ThemeContext usado no resto do site (persistido no
// localStorage deste navegador, não por conta — ver ThemeContext.jsx)
// --------------------------------------------------------------------- //

function AppearancePanel() {
  const { theme, toggleTheme } = useTheme();

  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-panel__title">Aparência</h2>
      <p className="dashboard-panel__hint">Vale só neste navegador.</p>

      <div className="appearance-panel__options">
        <button
          type="button"
          className={`appearance-panel__option${theme === 'dark' ? ' appearance-panel__option--active' : ''}`}
          onClick={() => theme !== 'dark' && toggleTheme()}
        >
          Escuro
        </button>
        <button
          type="button"
          className={`appearance-panel__option${theme === 'light' ? ' appearance-panel__option--active' : ''}`}
          onClick={() => theme !== 'light' && toggleTheme()}
        >
          Claro
        </button>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------- //
// Relatórios — histórico de simulações, cada um é um item expansível
// (seed, parâmetros, print do detector e gráfico de distribuição angular)
// --------------------------------------------------------------------- //

function ReportsPanel() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let active = true;
    listReports(user.id)
      .then((data) => {
        if (active) setReports(data);
      })
      .catch((err) => {
        if (active) setError(err.message ?? String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  async function handleDelete(id) {
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((report) => report.id !== id));
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }

  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-panel__title">Relatórios</h2>
      <p className="dashboard-panel__hint">
        Gerados pelo botão "Gerar relatório" na página de uma simulação.
      </p>

      {loading ? (
        <p className="dashboard-panel__hint">Carregando…</p>
      ) : reports.length === 0 ? (
        <p className="dashboard-panel__hint">Nenhum relatório ainda.</p>
      ) : (
        <ul className="reports-list">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            return (
              <li key={report.id} className="reports-list__item">
                <button
                  type="button"
                  className="reports-list__header"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="reports-list__caret" aria-hidden="true">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span className="reports-list__label">{report.label}</span>
                  <span className="reports-list__date">{formatDate(report.created_at)}</span>
                </button>

                {isExpanded && (
                  <div className="reports-list__body">
                    <div className="reports-list__grid">
                      <div>
                        <h3>Parâmetros</h3>
                        <dl className="reports-list__dl">
                          {Object.entries(report.params ?? {}).map(([key, value]) => (
                            <div key={key}>
                              <dt>{key}</dt>
                              <dd>{String(value)}</dd>
                            </div>
                          ))}
                        </dl>

                        <h3>Seed</h3>
                        {report.seed ? (
                          <dl className="reports-list__dl">
                            {Object.entries(report.seed).map(([key, value]) => (
                              <div key={key}>
                                <dt>{key}</dt>
                                <dd>{String(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="dashboard-panel__hint">Não disponível para este relatório.</p>
                        )}

                        {report.duration_seconds != null && (
                          <p className="reports-list__meta">
                            Duração: {report.duration_seconds.toFixed(2)}s · {report.trajectory_count ?? 0} trajetórias
                          </p>
                        )}
                      </div>

                      <div className="reports-list__images">
                        {report.screenshot_data_url && (
                          <figure>
                            <img src={report.screenshot_data_url} alt="Print do detector" />
                            <figcaption>Detector</figcaption>
                          </figure>
                        )}
                        {report.chart_data_url && (
                          <figure>
                            <img src={report.chart_data_url} alt="Distribuição angular" />
                            <figcaption>Distribuição angular</figcaption>
                          </figure>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dashboard-button dashboard-button--danger"
                      onClick={() => handleDelete(report.id)}
                    >
                      Excluir relatório
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="dashboard-panel__message dashboard-panel__message--error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
