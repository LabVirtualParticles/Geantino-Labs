import { createContext, useContext, useEffect, useState } from 'react';
import { THEMES } from './themes';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'geantino-theme';

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (THEME_IDS.has(stored)) return stored;
  } catch {
    // sem localStorage (aba anônima bloqueada etc.) — usa o padrão
  }
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // sem localStorage — o tema só não fica salvo
    }
  }, [theme]);

  function setTheme(id) {
    if (THEME_IDS.has(id)) setThemeState(id);
  }

  // Mantido pra compatibilidade (alterna só entre escuro e claro).
  function toggleTheme() {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de um <ThemeProvider>');
  }
  return context;
}
