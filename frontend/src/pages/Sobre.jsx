import Navbar from '../components/layout/Navbar';
import AboutSection from '../components/About';
import Footer from '../components/Footer';
import './Sobre.css';

// Edit this list to match the real team — the grid below is generated
// entirely from this array, so adding, renaming or removing a member
// never requires touching the markup. `photo` is optional; while it's
// empty the card falls back to the placeholder block shown in the mock.
const TEAM = [
  { id: 1, name: 'Brenda Emanueli Weber', email: 'brendaemanueli190@gmail.com', photo: '/team/team-1.jpg' },
  { id: 2, name: 'Vitor Prestes Luzio', email: 'vitor.luzio@ifpr.edu.br', photo: '/team/team-2.jpg' },
  { id: 3, name: 'Helen de Menezes Eberhardt', email: '20241ac0080053@estudantes.ifpr.edu.br', photo: '/team/team-3.jpg' },
  { id: 4, name: 'Lorenzo Zottis Vanzella', email: 'chesslorenzo9@gmail.com', photo: '/team/team-4.png' },
  { id: 5, name: 'Nome do integrante', email: 'email@geantinolabs.org', photo: '' },
  { id: 6, name: 'Nome do integrante', email: 'email@geantinolabs.org', photo: '' },
];

function TeamCard({ member }) {
  return (
    <li className="team-card">
      <div className="team-card__photo">
        {member.photo && <img src={member.photo} alt={member.name} />}
      </div>
      <div className="team-card__info">
        <span className="team-card__name">{member.name}</span>
        <a className="team-card__email" href={`mailto:${member.email}`}>
          {member.email}
        </a>
      </div>
    </li>
  );
}

// Sobre + Contato unificados numa página só: a descrição do projeto (a
// mesma seção usada na Home) em cima, e o grid da equipe embaixo. A rota
// /contato foi removida da navbar e redireciona pra cá (ver App.jsx).
export default function Sobre() {
  return (
    <div className="sobre-page">
      <Navbar />

      <main>
        <AboutSection />

        <section className="team">
          <div className="team__inner">
            <h2 className="team__title">Equipe</h2>
            <ul className="team__grid">
              {TEAM.map((member) => (
                <TeamCard key={member.id} member={member} />
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
