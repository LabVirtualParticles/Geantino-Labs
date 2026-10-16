// Ilustrações desenhadas de cada categoria — a 1ª imagem do carrossel
// dos cards da página /simulacoes (antes das simulações da área).
// Traço monocromático em `currentColor`: a cor vem do CSS (.sim-cover),
// então seguem o tema claro/escuro sem precisar de duas versões.
const COVERS = {
  particulas: (
    <>
      <line x1="0" y1="110" x2="196" y2="110" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeDasharray="6 6"/>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M200 110 C260 80 300 120 280 150 C265 172 235 160 245 140 C252 128 268 135 262 146"/>
      <path d="M200 110 C150 140 110 110 125 80 C136 60 162 68 156 86 C152 96 141 94 143 86"/>
      <path d="M200 110 Q300 60 392 36"/>
      <path d="M200 110 Q280 170 340 214"/>
      </g>
      <g fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round">
      <path d="M200 110 Q160 40 120 8"/>
      <path d="M200 110 Q250 30 300 6"/>
      <path d="M200 110 Q120 180 40 212"/>
      </g>
      <line x1="200" y1="110" x2="380" y2="150" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="4 5"/>
      <g fill="currentColor">
      <circle cx="246" cy="83" r="2"/>
      <circle cx="292" cy="60" r="2"/>
      <circle cx="340" cy="47" r="2"/>
      <circle cx="246" cy="146" r="2"/>
      <circle cx="290" cy="180" r="2"/>
      <circle cx="150" cy="128" r="2"/>
      </g>
      <circle cx="200" cy="110" r="5" fill="currentColor"/>
    </>
  ),
  nuclear: (
    <>
      <circle cx="30" cy="110" r="6" fill="none" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="38" y1="110" x2="108" y2="110" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeDasharray="5 5"/>
      <circle cx="140" cy="110" r="32" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="3 4"/>
      <g fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="4 5">
      <path d="M160 98 L220 70"/>
      <path d="M160 122 L228 152"/>
      </g>
      <circle cx="245" cy="58" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="259" cy="62" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="233" cy="64" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="249" cy="45" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="237" cy="47" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="257" cy="48" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="243" cy="72" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="256" cy="74" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="252" cy="160" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="266" cy="164" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="240" cy="166" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="256" cy="147" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="244" cy="149" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="264" cy="150" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <circle cx="250" cy="174" r="8" fill="currentColor" fillOpacity="0.85"/>
      <circle cx="263" cy="176" r="8" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4"/>
      <g fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.1" strokeDasharray="3 5">
      <path d="M174 110 L322 110"/>
      <path d="M174 106 L342 80"/>
      <path d="M174 114 L338 142"/>
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="330" cy="110" r="6"/>
      <circle cx="350" cy="78" r="6"/>
      <circle cx="346" cy="144" r="6"/>
      </g>
      <path d="M176 96 q9 -13 19 -7 t19 -8 t19 -7 t19 -8 t19 -7 t19 -8 t19 -7 t19 -8" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.3"/>
    </>
  ),
  astrofisica: (
    <>
      <g fill="currentColor" fillOpacity="0.7">
      <circle cx="40" cy="20" r="1.4"/>
      <circle cx="96" cy="44" r="1"/>
      <circle cx="150" cy="16" r="1.2"/>
      <circle cx="62" cy="78" r="1"/>
      <circle cx="372" cy="30" r="1.4"/>
      <circle cx="260" cy="22" r="1"/>
      <circle cx="352" cy="88" r="1.1"/>
      <circle cx="120" cy="96" r="0.9"/>
      <circle cx="20" cy="130" r="1"/>
      <circle cx="388" cy="134" r="0.9"/>
      </g>
      <path d="M-10 222 Q200 172 410 222 L410 230 L-10 230 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2"/>
      <path d="M-10 196 Q200 146 410 196" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"/>
      <circle cx="330" cy="6" r="3" fill="currentColor"/>
      <line x1="330" y1="6" x2="232" y2="118" stroke="currentColor" strokeWidth="1.8"/>
      <g fill="none" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.2" strokeLinecap="round">
      <path d="M232 118 L206 152 L186 196"/>
      <path d="M206 152 L214 197"/>
      <path d="M232 118 L250 154 L242 197"/>
      <path d="M250 154 L272 196"/>
      <path d="M206 152 L170 196"/>
      <path d="M250 154 L290 194"/>
      </g>
      <g fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 4">
      <path d="M232 118 L140 198"/>
      <path d="M232 118 L318 194"/>
      </g>
    </>
  ),
  medica: (
    <>
      <ellipse cx="245" cy="110" rx="128" ry="84" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2"/>
      <line x1="6" y1="96" x2="117" y2="96" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="6 6"/>
      <line x1="117" y1="96" x2="290" y2="96" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="292" cy="96" r="17" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3"/>
      <path d="M126 176 L340 176" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1"/>
      <path d="M126 170 C196 167 246 160 274 138 L288 104 L300 172" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="288" cy="104" r="3.5" fill="currentColor"/>
    </>
  ),
};

export default function CategoryCover({ name, className = '' }) {
  const art = COVERS[name];
  if (!art) return null;
  return (
    <svg viewBox="0 0 400 220" className={className} aria-hidden="true" focusable="false">
      {art}
    </svg>
  );
}
