import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { SIMULATION_CATEGORIES } from '../data/simulationCategories';
import './SimulationCatalog.css';

// Catalog for one category, reached from a SimulationsMap card. Lists
// every simulation registered for it, or "Em breve" while it's still
// empty — the only thing to touch when a new simulation is ready is
// data/simulationCategories.js.
export default function SimulationCatalog() {
  const { slug } = useParams();
  const category = SIMULATION_CATEGORIES.find((item) => item.slug === slug);

  return (
    <>
      <Navbar />
      <main className="catalog-page">
        <Link to="/simulacoes" className="catalog-page__back">
          ← Simulações
        </Link>

        {!category ? (
          <p className="catalog-page__soon">Categoria não encontrada.</p>
        ) : (
          <>
            <h1 className="catalog-page__title">{category.label}</h1>

            {category.items.length > 0 ? (
              <ul className="catalog-page__grid">
                {category.items.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className="catalog-page__card">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="catalog-page__soon">
                Em breve — ainda não temos simulações nesta área.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
