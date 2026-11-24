import { createContext, useContext } from 'react';
import { useTheme } from './ThemeContext';
import { THEMES } from './themes';

// Temas de zueira (hoje só o "Geantino City"). Eles NUNCA podem aparecer
// em nada de rigor científico: visualizador, parâmetros, resultados,
// explicações, créditos do Geant4 e relatórios.
//
// Duas proteções:
//   1. CSS — tudo dentro de `.sim-page` ou `.rigor` volta pros tokens do
//      tema Escuro (ver o fim do bloco do tema em styles/themes.css).
//   2. Texto — piadas só saem por <Zueira>, que mostra o `fallback`
//      (texto normal) fora do tema de zueira OU dentro de uma <RigorZone>.

const PLAYFUL_IDS = new Set(THEMES.filter((theme) => theme.playful).map((theme) => theme.id));

const RigorContext = createContext(false);

// Área científica: envolve o conteúdo e marca a árvore React como "sem
// zueira". Use `as` pra trocar a tag (padrão: div).
export function RigorZone({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <RigorContext.Provider value>
      <Tag className={`rigor ${className}`.trim()} {...props}>
        {children}
      </Tag>
    </RigorContext.Provider>
  );
}

// true quando a zueira pode aparecer aqui.
function useZueira() {
  const { theme } = useTheme();
  const inRigor = useContext(RigorContext);
  return PLAYFUL_IDS.has(theme) && !inRigor;
}

export function Zueira({ children, fallback = null }) {
  return useZueira() ? children : fallback;
}
