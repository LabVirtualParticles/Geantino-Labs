import './About.css';

export default function About() {
  return (
    <section className="about">
      <div className="about__inner">
        <h2 className="about__title">
          Simulação de física de partículas direto no navegador
        </h2>
        <p className="about__lede">
          Uma plataforma web para simulação e visualização de interações entre
          partículas subatômicas, desenvolvida com base no toolkit Geant4 do
          CERN. Com ela, é possível configurar partículas, definir materiais e
          geometrias, e analisar os resultados — sem precisar instalar nada.
        </p>

        <div className="about__grid">
          <div className="about__card">
            <h3 className="about__card-title">Ensino e pesquisa</h3>
            <p className="about__card-text">
              Exploração de fenômenos físicos em contexto acadêmico.
            </p>
          </div>
          <div className="about__card">
            <h3 className="about__card-title">Prototipagem rápida</h3>
            <p className="about__card-text">
              Configuração e teste de simulações sem ambiente local instalado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
