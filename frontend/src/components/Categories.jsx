import './Categories.css';

const categories = [
  { name: 'Física Médica', desc: 'Simulações de radioterapia e imagem médica' },
  { name: 'Astrofísica', desc: 'Interações de partículas em ambientes cósmicos' },
  { name: 'Física Nuclear', desc: 'Decaimento, fissão e reações nucleares' },
];

export default function Categories() {
  return (
    <section className="categories">
      <div className="categories__inner">
        <h2 className="categories__title">Explore por área</h2>
        <div className="categories__grid">
          {categories.map((cat) => (
            <a key={cat.name} href="#" className="categories__card">
              <h3 className="categories__card-title">{cat.name}</h3>
              <p className="categories__card-text">{cat.desc}</p>
              <span className="categories__card-soon">Em breve</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
