import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { SIMULATION_CATEGORIES } from '../../data/simulationCategories';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from './siteMeta';

// SEO por página. O site é uma SPA (uma página só, o React troca o
// conteúdo), então o index.html tem um <title>/descrição únicos. Este
// componente atualiza, a cada troca de rota: título da aba, meta
// description, link canonical, og:* e robots. O Google executa o
// JavaScript e lê esses valores; WhatsApp/redes sociais não executam JS e
// ficam com os do index.html (que descrevem o site como um todo).
//
// Páginas privadas (login, painel...) e o 404 recebem "noindex" pra não
// aparecerem nas buscas. A /apresentacao cuida disso sozinha.

const simulationTitles = {};
for (const category of SIMULATION_CATEGORIES) {
  for (const item of category.items) simulationTitles[item.path] = { item, category };
}

function metaFor(pathname) {
  if (pathname === '/') {
    return {
      title: `${SITE_NAME} — Simulações de física de partículas no navegador`,
      description: DEFAULT_DESCRIPTION,
    };
  }
  if (pathname === '/sobre') {
    return {
      title: `Sobre o projeto — ${SITE_NAME}`,
      description:
        'Conheça o Geantino Labs, laboratório virtual de física de partículas desenvolvido no IFPR: objetivos, equipe e como o Geant4 roda direto no navegador.',
    };
  }
  if (pathname === '/simulacoes') {
    return {
      title: `Simulações — ${SITE_NAME}`,
      description:
        'Simulações reais no Geant4 organizadas por área: física de partículas, física nuclear, astrofísica e física médica. Espalhamento de Rutherford, decaimento radioativo, PET e mais.',
    };
  }
  const categoryMatch = matchPath('/simulacoes/categoria/:slug', pathname);
  if (categoryMatch) {
    const category = SIMULATION_CATEGORIES.find((c) => c.slug === categoryMatch.params.slug);
    if (!category) return { title: `Página não encontrada — ${SITE_NAME}`, noindex: true };
    return {
      title: `${category.label} — Simulações | ${SITE_NAME}`,
      description: category.description,
    };
  }
  const simulation = simulationTitles[pathname];
  if (simulation) {
    // Executar a simulação exige login, então essas páginas não entram no
    // sitemap; mesmo assim ganham título e descrição bons.
    return {
      title: `${simulation.item.label} — ${SITE_NAME}`,
      description: `${simulation.item.label}: simulação de ${simulation.category.label.toLowerCase()} no Geant4, com visualização 3D direto no navegador.`,
    };
  }
  if (pathname === '/login') return { title: `Entrar — ${SITE_NAME}`, noindex: true };
  if (pathname === '/redefinir-senha') return { title: `Redefinir senha — ${SITE_NAME}`, noindex: true };
  if (pathname === '/painel') return { title: `Painel — ${SITE_NAME}`, noindex: true };
  if (pathname === '/apresentacao') return null; // a própria página cuida
  return { title: `Página não encontrada — ${SITE_NAME}`, noindex: true };
}

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = metaFor(pathname);
    if (!meta) return;
    const description = meta.description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;

    document.title = meta.title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', meta.noindex ? 'noindex, follow' : 'index, follow');
    setCanonical(url);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', description);
  }, [pathname]);

  return null;
}
