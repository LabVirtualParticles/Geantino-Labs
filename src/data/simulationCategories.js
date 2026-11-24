// Central place for the simulation category taxonomy. The map page
// (`SimulationsMap`) and the per-category catalog page
// (`SimulationCatalog`) both read from here, so adding a category or
// wiring a new simulation into one never requires touching page markup.
//
// Campos de cada categoria:
//  - slug / label: identificação e nome exibido
//  - description: frase curta mostrada no card aberto da página /simulacoes
//  - cover: qual ilustração desenhada abre o carrossel do card
//    (ver components/simulations/CategoryCover.jsx)
//  - items: simulações da área. Cada uma com label, path e image — a
//    image entra no carrossel do card (depois da ilustração) e no
//    catálogo da categoria. Área sem itens aparece como "Em breve".
export const SIMULATION_CATEGORIES = [
  {
    slug: 'fisica-de-particulas',
    label: 'Física de Partículas',
    description:
      'Como partículas interagem com a matéria. Comece pelo espalhamento de Rutherford: partículas alfa de 5 MeV contra uma folha de ouro.',
    cover: 'particulas',
    items: [
      {
        label: 'Espalhamento de Rutherford',
        path: '/simulacoes/rutherford',
        image: '/simulations/rutherford-scattering.jpg',
      },
      {
        label: 'Espectrômetro de partículas',
        path: '/simulacoes/espectrometro',
        image: '/simulations/espectrometro-b5.jpg',
      },
    ],
  },
  {
    slug: 'fisica-nuclear',
    label: 'Física Nuclear',
    description: 'Núcleos, decaimentos e reações nucleares.',
    cover: 'nuclear',
    items: [],
  },
  {
    slug: 'astrofisica',
    label: 'Astrofísica',
    description: 'Raios cósmicos e partículas que chegam do espaço.',
    cover: 'astrofisica',
    items: [],
  },
  {
    slug: 'fisica-medica',
    label: 'Física Médica',
    description:
      'Partículas usadas em diagnóstico e terapia. Comece pelo PET: um tomógrafo de verdade do Geant4 detectando a aniquilação de pósitrons.',
    cover: 'medica',
    items: [
      {
        label: 'PET — tomografia por emissão de pósitrons',
        path: '/simulacoes/pet',
        image: '/simulations/pet-b3a.jpg',
      },
    ],
  },
];
