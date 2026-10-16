import { PLAYBACK_SPEEDS } from './eventPlayback';
import { formatNumber } from './formatParams';

// Faixa de controles embaixo do visualizador: play/pause, linha do tempo
// (arrastar = pular pra um evento) e velocidade. Só aparece depois que a
// simulação termina (ver SimulationExample.jsx).
export default function PlaybackControls({ playback }) {
  const { revealedEvents, eventCount, isPlaying, toggle, seek, speed, setSpeed } = playback;
  const atEnd = revealedEvents >= eventCount;
  const playLabel = isPlaying ? 'Pausar' : atEnd ? 'Repetir do começo' : 'Reproduzir';

  return (
    <div className="playback" role="group" aria-label="Reprodução evento a evento">
      <button
        type="button"
        className="playback__toggle"
        onClick={toggle}
        aria-label={playLabel}
        title={playLabel}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          {isPlaying ? (
            <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
          ) : atEnd ? (
            <path
              d="M12 5a7 7 0 1 1-6.6 4.7M5 4v5h5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          )}
        </svg>
      </button>

      <input
        className="playback__timeline"
        type="range"
        min={0}
        max={eventCount}
        step={1}
        value={revealedEvents}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Linha do tempo dos eventos"
        aria-valuetext={`Evento ${revealedEvents} de ${eventCount}`}
        style={{ '--playback-progress': `${eventCount ? (revealedEvents / eventCount) * 100 : 0}%` }}
      />

      <span className="playback__count">
        Evento {formatNumber(revealedEvents, 0)} / {formatNumber(eventCount, 0)}
      </span>

      <div className="playback__speeds" role="group" aria-label="Velocidade">
        {PLAYBACK_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={`playback__speed${speed === value ? ' is-active' : ''}`}
            aria-pressed={speed === value}
            onClick={() => setSpeed(value)}
          >
            {formatNumber(value, 1)}×
          </button>
        ))}
      </div>
    </div>
  );
}
