import { useEffect, useRef, useState } from 'react';
import { playShowerTitle } from './emShowerTitle';
import './ShowerTitle.css';

// Se a fonte do título (Ykar) não carregar até aqui, mostra o texto
// normal em vez de deixar o título invisível esperando.
const FONT_TIMEOUT_MS = 2500;

// Animações marcadas com `playOnceKey` que já rodaram neste carregamento
// da página. Fica no módulo (não no componente) de propósito: a Navbar é
// desmontada e montada de novo a cada troca de página, e sem isso o
// logo se "re-escreveria" toda vez que o usuário navega. Recarregar o
// site (F5) zera isso — que é justamente "quando o site carrega".
const playedThisLoad = new Set();

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldPlay(playOnceKey) {
  if (prefersReducedMotion()) return false;
  if (playOnceKey && playedThisLoad.has(playOnceKey)) return false;
  return true;
}

/**
 * Texto que é "escrito" por um chuveiro eletromagnético ao aparecer.
 * O elemento real continua no DOM o tempo todo (mesmo tamanho, mesma
 * fonte, leitor de tela e SEO enxergam normal) — durante a animação ele
 * só fica com a cor transparente, e um canvas por cima desenha a cascata
 * e vai revelando as letras. No fim, o canvas some e o texto real
 * reaparece no mesmo lugar.
 *
 * Props:
 *  - as: elemento/componente do texto (default 'h1'; ex.: Link do router)
 *  - config: ajustes do chuveiro (ver SHOWER_CONFIG / NAVBAR_SHOWER_CONFIG
 *    em emShowerTitle.js)
 *  - playOnceKey: se definido, anima só na primeira vez que aparece em
 *    cada carregamento do site
 *  - demais props (className, to, aria-label...) vão pro elemento do texto
 *
 * Ex.: <ShowerTitle as={Link} to="/" className="navbar__brand"
 *        config={NAVBAR_SHOWER_CONFIG} playOnceKey="navbar-logo">
 *        Geantino Labs
 *      </ShowerTitle>
 */
export default function ShowerTitle({
  as: Tag = 'h1',
  className = '',
  config,
  playOnceKey,
  children,
  ...rest
}) {
  const titleRef = useRef(null);
  const canvasRef = useRef(null);
  // pending: esperando a fonte | playing | done
  const [phase, setPhase] = useState(() => (shouldPlay(playOnceKey) ? 'pending' : 'done'));

  useEffect(() => {
    if (!shouldPlay(playOnceKey)) {
      setPhase('done');
      return undefined;
    }

    let alive = true;
    let cancel = () => {};
    const fallback = setTimeout(() => alive && setPhase('done'), FONT_TIMEOUT_MS);

    document.fonts.ready.then(() => {
      if (!alive) return;
      clearTimeout(fallback);
      if (playOnceKey) playedThisLoad.add(playOnceKey);
      setPhase('playing');
      cancel = playShowerTitle(titleRef.current, canvasRef.current, {
        config,
        onDone: () => alive && setPhase('done'),
      });
    });

    return () => {
      alive = false;
      clearTimeout(fallback);
      cancel();
    };
    // `config` é tratado como fixo (é lido só no início da animação).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playOnceKey]);

  return (
    <div className="shower-title" data-phase={phase}>
      <Tag ref={titleRef} className={`${className} shower-title__text`} {...rest}>
        {children}
      </Tag>
      <canvas ref={canvasRef} className="shower-title__canvas" aria-hidden="true" />
    </div>
  );
}
