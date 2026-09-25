import Navbar from '../components/layout/Navbar';
import Footer from '../components/Footer';
import './Contact.css';

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

function ContactCard({ member }) {
  return (
    <li className="contact-card">
      <div className="contact-card__photo">
        {member.photo && <img src={member.photo} alt={member.name} />}
      </div>
      <div className="contact-card__info">
        <span className="contact-card__name">{member.name}</span>
        <a className="contact-card__email" href={`mailto:${member.email}`}>
          {member.email}
        </a>
      </div>
    </li>
  );
}

export default function Contact() {
  return (
    <div className="contact-page">
      <Navbar />

      <main className="contact-page__main">
        <header className="contact-page__header">
          <h1>Contato</h1>
          <p>Conheça a equipe por trás do Geantino Labs.</p>
        </header>

        <ul className="contact-page__grid">
          {TEAM.map((member) => (
            <ContactCard key={member.id} member={member} />
          ))}
        </ul>
      </main>

      <Footer />
    </div>
  );
}
