import { Zueira } from '../context/Zueira';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        Geantino Labs — projeto acadêmico do IFPR
        <Zueira> · nenhum múon foi multado na produção deste site</Zueira>
      </p>
      <a href="https://github.com/LabVirtualParticles/LabVirtualParticles" className="footer__link">
        GitHub
      </a>
    </footer>
  );
}
