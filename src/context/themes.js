// Temas disponíveis. As cores de cada um ficam em styles/tokens.css
// (escuro e claro) e styles/themes.css (os outros). `swatch` são só as
// cores da amostrinha no Painel → Aparência: [fundo, texto, destaque].
export const THEMES = [
  {
    id: 'dark',
    label: 'Escuro',
    description: 'Preto e branco, o padrão do site.',
    swatch: ['#000000', '#ffffff', '#9a9a9a'],
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Branco e preto.',
    swatch: ['#ffffff', '#0a0a0a', '#8a8a8a'],
  },
  {
    id: 'bolhas',
    label: 'Câmara de bolhas',
    description: 'Papel envelhecido em sépia, como as fotos antigas do CERN.',
    swatch: ['#efe6d1', '#2a1f15', '#8c7a5e'],
  },
  {
    id: 'fosforo',
    label: 'Terminal',
    description: 'Verde fósforo de monitor antigo, com linhas de varredura.',
    swatch: ['#040a05', '#3dff7f', '#1f9a4d'],
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Azul de planta técnica com quadriculado.',
    swatch: ['#123c6e', '#eaf3ff', '#8db4e4'],
  },
  {
    id: 'sincrotron',
    label: 'Síncrotron',
    description: 'Roxo escuro com ciano neon e brilho suave.',
    swatch: ['#0a0517', '#45f3ff', '#b46cff'],
  },
  {
    // Tema de zueira: `playful` faz o <Zueira> (context/Zueira.jsx) mostrar
    // as piadas. Simulações e relatórios continuam no tema Escuro.
    id: 'tropical',
    label: 'Geantino City',
    description: 'Zueira: pôr do sol neon e coqueiros. Simulações e relatórios ficam sóbrios.',
    swatch: ['#2a0f4a', '#ff5fa2', '#3ff0e0'],
    playful: true,
  },
];
