import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getProfile, uploadAvatar } from '../lib/profile';
import { listReports, deleteReport } from '../lib/reports';
import {
  PARAM_LABELS_BY_SIMULATION,
  formatParams,
  formatSeed,
} from '../features/simulation-demo/formatParams';
import { formatResults } from '../features/simulation-demo/formatResults';
import './Dashboard.css';

// Legenda do gráfico salvo em cada relatório (chart_data_url), por
// simulação. Sem entrada aqui = "Distribuição angular" (Rutherford).
const CHART_CAPTIONS = {
  'pet-b3a': 'Imagem reconstruída (corte x–y)',
  'espectrometro-b5': 'Identificação de partículas',
  'decaimento-rdecay01': 'Cadeia de decaimento',
  'telescopio-gammaraytel': 'Erro na direção dos raios gama',
};

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
  const { theme, setTheme, themes } = useTheme();

  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-panel__title">Aparência</h2>
      <p className="dashboard-panel__hint">Vale só neste navegador.</p>

      <div className="appearance-panel__options" role="radiogroup" aria-label="Tema do site">
        {themes.map((option) => {
          const active = theme === option.id;
          const [bg, fg, accent] = option.swatch;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`appearance-panel__option${active ? ' appearance-panel__option--active' : ''}`}
              onClick={() => setTheme(option.id)}
            >
              {/* Amostra: mini "página" nas cores do tema */}
              <span className="appearance-panel__swatch" style={{ background: bg }} aria-hidden="true">
                <span className="appearance-panel__swatch-title" style={{ background: fg }} />
                <span className="appearance-panel__swatch-line" style={{ background: fg, opacity: 0.45 }} />
                <span className="appearance-panel__swatch-line short" style={{ background: fg, opacity: 0.45 }} />
                <span className="appearance-panel__swatch-dot" style={{ background: accent }} />
              </span>
              <span className="appearance-panel__name">{option.label}</span>
              <span className="appearance-panel__desc">{option.description}</span>
            </button>
          );
        })}
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
    <section className="dashboard-panel rigor">
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
                          {formatParams(report.params, PARAM_LABELS_BY_SIMULATION[report.simulation_id]).map((row) => (
                            <div key={row.key}>
                              <dt>{row.label}</dt>
                              <dd>{row.value}</dd>
                            </div>
                          ))}
                        </dl>

                        {formatResults(report.results, report.params).length > 0 && (
                          <>
                            <h3>Resultados</h3>
                            <dl className="reports-list__dl">
                              {formatResults(report.results, report.params).map((row) => (
                                <div key={row.key}>
                                  <dt>{row.label}</dt>
                                  <dd>{row.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}

                        <h3>Seed</h3>
                        {formatSeed(report.seed) ? (
                          <p className="reports-list__seed">{formatSeed(report.seed)}</p>
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
                            <img
                              src={report.chart_data_url}
                              alt={CHART_CAPTIONS[report.simulation_id] ?? 'Distribuição angular'}
                            />
                            <figcaption>
                              {CHART_CAPTIONS[report.simulation_id] ?? 'Distribuição angular'}
                            </figcaption>
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
