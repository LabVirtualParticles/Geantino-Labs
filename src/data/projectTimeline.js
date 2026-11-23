// Marcos do projeto mostrados na timeline da página Sobre.
// Fonte: diário de bordo do projeto. Para adicionar um marco, é só
// incluir um objeto aqui na ordem cronológica — o componente
// ProjectTimeline agrupa por ano sozinho.
//
// Campos:
//   year       — ano (usado para agrupar)
//   date       — texto exibido (ex.: "Nov 2025", "02 set 2026")
//   dateTime   — data em formato ISO para o <time> (acessibilidade/SEO)
//   title      — título curto do marco
//   text       — uma ou duas frases
//   tag        — opcional; selo de destaque (ex.: "Prêmio")
//   upcoming   — opcional; marca algo que ainda vai acontecer
export const PROJECT_TIMELINE = [
  {
    year: 2025,
    date: '2025',
    dateTime: '2025',
    title: 'A ideia nasce numa Masterclass',
    text: 'A participação na Masterclass de Física de Partículas do IPPOG despertou a vontade de levar experimentos de física de partículas para a sala de aula.',
  },
  {
    year: 2025,
    date: 'Out 2025',
    dateTime: '2025-10',
    title: 'Primeiros passos com o Geant4',
    text: 'Estudo e compilação do Geant4 no Linux, com apoio das videoaulas do Prof. Dr. Gustavo Valdiviesso (UNIFAL), e a primeira simulação em C++: o espalhamento de Rutherford.',
  },
  {
    year: 2025,
    date: '06–07 nov 2025',
    dateTime: '2025-11-06',
    title: '1º lugar na XI FEPIAC',
    text: 'A simulação de Rutherford, apresentada como prova de conceito na feira do IFPR Campus Assis Chateaubriand, conquistou o primeiro lugar.',
    tag: 'Prêmio',
  },
  {
    year: 2026,
    date: 'Fev 2026',
    dateTime: '2026-02-12',
    title: 'Nasce o Geantino Labs',
    text: 'Em reunião de orientação, o projeto muda de rumo: em vez de simulações isoladas, um laboratório virtual que roda o Geant4 direto no navegador.',
  },
  {
    year: 2026,
    date: 'Jun 2026',
    dateTime: '2026-06-03',
    title: 'A equipe cresce',
    text: 'Brenda entra para o grupo, que passa a ter três autores.',
  },
  {
    year: 2026,
    date: 'Ago 2026',
    dateTime: '2026-08-20',
    title: '4ª Masterclass na UTFPR Toledo',
    text: 'De volta ao evento do IPPOG que deu origem ao projeto, agora com o Geantino Labs em construção.',
  },
  {
    year: 2026,
    date: 'Ago 2026',
    dateTime: '2026-08-30',
    title: 'O Geant4 responde à web',
    text: 'Um back-end em Python (FastAPI) passa a executar o Geant4 a partir de uma requisição e a devolver os resultados em JSON.',
  },
  {
    year: 2026,
    date: '02 set 2026',
    dateTime: '2026-09-02',
    title: 'Primeira simulação no navegador',
    text: 'Pela primeira vez o caminho completo funcionou: o site pediu a simulação, o Geant4 rodou e a folha de ouro, as partículas alfa e o detector apareceram em 3D.',
    tag: 'Marco',
  },
  {
    year: 2026,
    date: '04 set 2026',
    dateTime: '2026-09-04',
    title: 'Conceito A na pré-banca',
    text: 'O projeto foi apresentado aos professores avaliadores e recebeu conceito A.',
    tag: 'Avaliação',
  },
  {
    year: 2026,
    date: 'Set 2026',
    dateTime: '2026-09-25',
    title: 'Cadastro e login',
    text: 'Usuários passam a ter conta própria para rodar simulações.',
  },
  {
    year: 2026,
    date: 'Out 2026',
    dateTime: '2026-10-09',
    title: 'Painel e relatórios',
    text: 'Cada usuário ganha um painel com histórico de simulações e relatórios com parâmetros, captura do detector e gráfico da distribuição angular.',
  },
  {
    year: 2026,
    date: 'Nov 2026',
    dateTime: '2026-11-19',
    title: 'No ar em servidor próprio',
    text: 'O Geant4 11.4.3 passa a rodar num servidor definitivo, e o site executa simulações reais de qualquer lugar.',
    tag: 'Marco',
  },
  {
    year: 2026,
    date: 'Em breve',
    dateTime: '2026-11-22',
    title: 'Novas simulações',
    text: 'Efeito fotoelétrico, tomografia PET, radioterapia, telescópios de raios gama e X, raios cósmicos e câmara de nuvens.',
    upcoming: true,
  },
];
