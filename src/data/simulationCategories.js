// Central place for the simulation category taxonomy. The map page
// (`SimulationsMap`) and the per-category catalog page
// (`SimulationCatalog`) both read from here, so adding a category or
// wiring a new simulation into one never requires touching page markup.
//
// `directPath` is a temporary shortcut: when set, clicking the
// category card on the map skips straight to that route instead of
// its own (still empty) catalog page. Remove it once the category has
// real items of its own.
export const SIMULATION_CATEGORIES = [
  {
    slug: 'fisica-de-particulas',
    label: 'Física de Partículas',
    items: [{ label: 'Espalhamento de Rutherford', path: '/simulacoes/rutherford' }],
  },
  {
    slug: 'fisica-nuclear',
    label: 'Física Nuclear',
    items: [],
    directPath: '/simulacoes/rutherford', // TODO: remover quando a Física Nuclear tiver catálogo próprio
  },
  {
    slug: 'astrofisica',
    label: 'Astrofísica',
    items: [],
  },
  {
    slug: 'fisica-medica',
    label: 'Física Médica',
    items: [],
  },
];
