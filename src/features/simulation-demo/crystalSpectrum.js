// Espectro de energia nos cristais do PET (B3a): quantos cristais
// receberam cada faixa de energia, somando todos os eventos. Os dados vêm
// prontos do C++ (resultados.json → crystal_spectrum, faixas de 10 keV).
//
// O que aparece: o fotopico em 511 keV (fóton absorvido inteiro), a faixa
// contínua do espalhamento Compton abaixo da borda Compton (~341 keV) e a
// linha do limite de 500 keV que o exemplo usa para aceitar um cristal na
// coincidência. Barras acima do limite em cor cheia, abaixo em cor apagada.

export const SPECTRUM_THRESHOLD_KEV = 500;
export const PHOTOPEAK_KEV = 511;
// Borda Compton de um fóton de 511 keV: E·2α/(1+2α), α = E/mₑc² = 1 → 2E/3
export const COMPTON_EDGE_KEV = 340.7;

// Eixo mostrado até 700 keV: acima disso só há eventos raros (dois fótons
// no mesmo cristal), que entram na tabela como "acima de 700 keV".
const SHOW_MAX_KEV = 700;

export function prepareSpectrum(spectrum, threshold = SPECTRUM_THRESHOLD_KEV) {
  if (!spectrum?.counts?.length) return null;
  const binKeV = Number(spectrum.bin_keV) || 10;
  const shownBins = Math.min(spectrum.counts.length, Math.ceil(SHOW_MAX_KEV / binKeV));
  const counts = spectrum.counts.slice(0, shownBins);
  const hidden =
    spectrum.counts.slice(shownBins).reduce((sum, value) => sum + value, 0) + (spectrum.overflow ?? 0);
  const total = spectrum.counts.reduce((sum, value) => sum + value, 0) + (spectrum.overflow ?? 0);
  const above = spectrum.counts.reduce(
    (sum, value, index) => (index * binKeV >= threshold ? sum + value : sum),
    0,
  ) + (spectrum.overflow ?? 0);
  return { binKeV, counts, range: shownBins * binKeV, hidden, total, above, threshold };
}

export function spectrumLayout(width, height) {
  const left = 52;
  const right = 14;
  const top = 22;
  const bottom = 44;
  return {
    left,
    top,
    width: Math.max(10, width - left - right),
    height: Math.max(10, height - top - bottom),
  };
}

export function spectrumBinAtX(x, width, spectrum) {
  const plot = spectrumLayout(width, 0);
  const energy = ((x - plot.left) / plot.width) * spectrum.range;
  if (energy < 0 || energy >= spectrum.range) return -1;
  return Math.min(spectrum.counts.length - 1, Math.floor(energy / spectrum.binKeV));
}

export function drawSpectrum(ctx, { width, height, spectrum, colors, highlightBin = -1, logScale = true }) {
  const plot = spectrumLayout(width, height);
  const { counts, binKeV, range, threshold } = spectrum;

  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const maxCount = Math.max(1, ...counts);
  let yOf;
  const ticks = [];
  if (logScale) {
    // Log: de 0,5 (pra uma faixa com 1 cristal aparecer) até a próxima
    // potência de 10 — deixa visível a faixa Compton, bem menor que o pico.
    const yMin = 0.5;
    const yMax = 10 ** Math.ceil(Math.log10(maxCount * 1.6));
    const logMin = Math.log10(yMin);
    const logSpan = Math.log10(yMax) - logMin;
    yOf = (value) =>
      plot.top + plot.height - ((Math.log10(Math.max(value, yMin)) - logMin) / logSpan) * plot.height;
    for (let value = 1; value <= yMax; value *= 10) ticks.push(value);
  } else {
    const step = niceStep(maxCount / 5);
    const yMax = Math.ceil((maxCount * 1.08) / step) * step;
    yOf = (value) => plot.top + plot.height - (value / yMax) * plot.height;
    for (let value = 0; value <= yMax + step / 2; value += step) ticks.push(value);
  }
  const xOf = (energy) => plot.left + (energy / range) * plot.width;

  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;
  for (const value of ticks) {
    const y = Math.round(yOf(value)) + 0.5;
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'right';
    ctx.fillText(value.toLocaleString('pt-BR'), plot.left - 8, y);
  }

  if (highlightBin >= 0) {
    ctx.fillStyle = colors.highlight;
    ctx.fillRect(xOf(highlightBin * binKeV), plot.top, xOf(binKeV) - plot.left, plot.height);
  }

  const gap = binKeV * (plot.width / range) > 6 ? 1.5 : 0.5;
  counts.forEach((count, index) => {
    if (!count) return;
    const accepted = index * binKeV >= threshold;
    ctx.fillStyle = accepted ? colors.bar : colors.barMuted;
    const x0 = xOf(index * binKeV) + gap / 2;
    const x1 = xOf((index + 1) * binKeV) - gap / 2;
    const y = yOf(count);
    ctx.fillRect(x0, y, Math.max(1, x1 - x0), plot.top + plot.height - y);
  });

  // Marcas verticais: limite (tracejado) e borda Compton (pontilhado)
  const marker = (energy, dash, label, align) => {
    const x = Math.round(xOf(energy)) + 0.5;
    ctx.strokeStyle = colors.axis;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.top + plot.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.text;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, align === 'right' ? x - 5 : x + 5, plot.top - 10);
  };
  if (width >= 420) {
    marker(COMPTON_EDGE_KEV, [2, 3], 'borda Compton ≈ 341 keV', 'right');
    marker(threshold, [4, 4], `limite ${threshold} keV`, 'left');
  } else {
    marker(threshold, [4, 4], `${threshold} keV`, 'left');
  }

  // Eixo X
  ctx.strokeStyle = colors.axis;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top + plot.height + 0.5);
  ctx.lineTo(plot.left + plot.width, plot.top + plot.height + 0.5);
  ctx.stroke();
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let energy = 0; energy <= range; energy += 100) {
    ctx.fillText(String(energy), xOf(energy), plot.top + plot.height + 7);
  }
  ctx.fillText('Energia depositada no cristal (keV)', plot.left + plot.width / 2, plot.top + plot.height + 25);

  ctx.save();
  ctx.translate(13, plot.top + plot.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(logScale ? 'Cristais atingidos (escala log)' : 'Cristais atingidos', 0, 0);
  ctx.restore();

  ctx.restore();
}

const FONT_FAMILY = 'Fraunces, Georgia, serif';

function niceStep(raw) {
  const safe = Math.max(raw, 1);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const fraction = safe / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}
