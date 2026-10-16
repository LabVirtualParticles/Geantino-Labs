// Gráficos de espalhamento (Rutherford e outras simulações de
// espalhamento): estatísticas, histograma, curva teórica e desenho em
// <canvas>. Sem lib de gráfico — o mesmo `drawScatteringChart` desenha
// tanto o gráfico interativo da página da simulação (cores do tema) quanto
// o PNG salvo no relatório do painel (paleta escura fixa).
//
// Os ângulos vêm de computeScatteringAngles (angularHistogram.js), em graus.

// ---------------------------------------------------------------------- //
// Estatísticas (tabela "Resumo")
// ---------------------------------------------------------------------- //

export function computeScatteringStats(angles) {
  const sorted = [...angles].sort((a, b) => a - b);
  const count = sorted.length;
  if (count === 0) {
    return { count: 0, mean: null, median: null, max: null, above10: 0, above90: 0 };
  }
  const sum = sorted.reduce((acc, angle) => acc + angle, 0);
  const middle = Math.floor(count / 2);
  return {
    count,
    mean: sum / count,
    median: count % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    max: sorted[count - 1],
    above10: sorted.filter((angle) => angle > 10).length,
    above90: sorted.filter((angle) => angle > 90).length,
  };
}

// ---------------------------------------------------------------------- //
// Histograma
// ---------------------------------------------------------------------- //

const BIN_SIZES = [1, 2, 5, 10];
const MAX_BINS = 45;

// O eixo vai de 0° até um pouco depois do maior desvio (mínimo 30°, máximo
// 180°), e a largura das faixas é a menor de 1/2/5/10° que cabe em até 45
// barras. Com o Rutherford típico (maior desvio ~60°) isso dá faixas de 2°.
export function buildScatteringHistogram(angles) {
  const maxAngle = angles.length ? Math.max(...angles) : 0;
  const range = Math.min(180, Math.max(30, Math.ceil((maxAngle + 0.001) / 10) * 10));
  const binSize = BIN_SIZES.find((size) => range / size <= MAX_BINS) ?? 10;
  const binCount = Math.ceil(range / binSize);
  const counts = new Array(binCount).fill(0);

  for (const angle of angles) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(angle / binSize)));
    counts[index] += 1;
  }

  return { binSize, binCount, range, counts, total: angles.length };
}

// ---------------------------------------------------------------------- //
// Curva teórica de Rutherford
// ---------------------------------------------------------------------- //

// Seção de choque de Rutherford: dσ/dΩ ∝ 1 / sen⁴(θ/2). Pra comparar com
// um histograma em θ é preciso multiplicar pelo ângulo sólido de cada
// faixa (dΩ = 2π sen θ dθ). Com u = sen²(θ/2), sen θ dθ = 2 du, então a
// integral numa faixa [θ1, θ2] fica exata e simples:
//   ∫ sen θ / sen⁴(θ/2) dθ = 2 (1/u1 − 1/u2)
function rutherfordBinWeight(theta1Deg, theta2Deg) {
  const u = (deg) => Math.sin((deg * Math.PI) / 360) ** 2;
  const u1 = u(Math.max(theta1Deg, 1e-6));
  const u2 = u(theta2Deg);
  return 2 * (1 / u1 - 1 / u2);
}

export const THEORY_FIT_FROM_DEG = 10;
export const THEORY_MIN_TAIL = 5;

// Escala a curva pra ter o mesmo número de partículas que a simulação nas
// faixas a partir de THEORY_FIT_FROM_DEG — é onde vale o espalhamento
// único que a fórmula descreve. Abaixo disso a simulação foge da curva de
// propósito (espalhamento múltiplo + blindagem pelos elétrons do átomo),
// e isso é parte do que o gráfico mostra.
export function buildRutherfordTheory(histogram, fitFrom = THEORY_FIT_FROM_DEG) {
  const { binSize, counts } = histogram;
  const weights = counts.map((_, index) =>
    rutherfordBinWeight(index * binSize, (index + 1) * binSize),
  );

  const firstTailBin = Math.ceil(fitFrom / binSize);
  let tailCount = 0;
  let tailWeight = 0;
  for (let index = firstTailBin; index < counts.length; index += 1) {
    tailCount += counts[index];
    tailWeight += weights[index];
  }

  const ok = tailCount >= THEORY_MIN_TAIL && tailWeight > 0;
  const scale = ok ? tailCount / tailWeight : 0;
  return {
    ok,
    fitFrom: firstTailBin * binSize,
    tailCount,
    expected: weights.map((weight) => weight * scale),
  };
}

// ---------------------------------------------------------------------- //
// Desenho
// ---------------------------------------------------------------------- //

export const REPORT_CHART_COLORS = {
  background: '#000000',
  bar: '#ffffff',
  barMuted: 'rgba(255, 255, 255, 0.45)',
  theory: '#ffffff',
  axis: 'rgba(255, 255, 255, 0.35)',
  grid: 'rgba(255, 255, 255, 0.1)',
  text: 'rgba(255, 255, 255, 0.62)',
  highlight: 'rgba(255, 255, 255, 0.12)',
};

// Lê as cores do tema atual (tokens.css) — chamado de novo a cada troca
// de tema claro/escuro.
export function chartColorsFromTheme(element = document.documentElement) {
  const style = getComputedStyle(element);
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  const beam = read('--color-beam', '#ffffff');
  return {
    background: read('--color-void', '#000000'),
    bar: beam,
    barMuted: read('--color-trace', '#9a9a9a'),
    theory: beam,
    axis: read('--color-line', 'rgba(255,255,255,0.14)'),
    grid: read('--color-line-soft', 'rgba(255,255,255,0.08)'),
    text: read('--color-on-void-soft', 'rgba(255,255,255,0.62)'),
    highlight: read('--color-line-soft', 'rgba(255,255,255,0.08)'),
  };
}

const FONT_FAMILY = 'Fraunces, Georgia, serif';

export function chartLayout(width, height) {
  const left = 52;
  const right = 14;
  const top = 18;
  const bottom = 44;
  return {
    left,
    top,
    width: Math.max(10, width - left - right),
    height: Math.max(10, height - top - bottom),
  };
}

// Qual faixa do histograma está sob a coordenada x (em px CSS) — usado
// pro texto de "passe o mouse" embaixo do gráfico.
export function binAtX(x, width, histogram) {
  const plot = chartLayout(width, 0);
  const theta = ((x - plot.left) / plot.width) * histogram.range;
  if (theta < 0 || theta >= histogram.range) return -1;
  return Math.min(histogram.binCount - 1, Math.floor(theta / histogram.binSize));
}

/**
 * Desenha o gráfico no contexto 2D (coordenadas em px CSS — quem chama
 * cuida do devicePixelRatio).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {'log'|'theory'} options.mode  'log' = só a distribuição;
 *   'theory' = distribuição + curva de Rutherford
 */
export function drawScatteringChart(
  ctx,
  { width, height, mode, histogram, theory, colors, highlightBin = -1, logScale = true },
) {
  const plot = chartLayout(width, height);
  const { counts, binSize, range } = histogram;
  const showTheory = mode === 'theory' && theory?.ok;

  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const maxCount = Math.max(1, ...counts);
  let yRaw;
  let yOf;
  let ticks;

  if (logScale) {
    // Escala log no Y: de 0,5 (pra uma barra com 1 partícula aparecer)
    // até a próxima potência de 10 acima do maior valor. Com a curva
    // teórica o eixo desce até 0,05: na cauda a teoria prevê menos de 1
    // partícula por faixa, e cortar ali esconderia a parte interessante.
    const yMin = showTheory ? 0.05 : 0.5;
    const yMax = 10 ** Math.ceil(Math.log10(maxCount * 1.6));
    const logMin = Math.log10(yMin);
    const logSpan = Math.log10(yMax) - logMin;
    yRaw = (value) =>
      plot.top + plot.height - ((Math.log10(value) - logMin) / logSpan) * plot.height;
    yOf = (value) => yRaw(Math.max(value, yMin));
    ticks = [];
    for (let power = Math.ceil(logMin); 10 ** power <= yMax; power += 1) {
      ticks.push({ value: 10 ** power, label: formatPower(power) });
    }
  } else {
    // Escala linear: de 0 até um valor "redondo" logo acima do maior. A
    // curva teórica perto de 0° passa do topo e é recortada (esperado).
    const step = niceStep(maxCount / 5);
    const yMax = Math.ceil((maxCount * 1.05) / step) * step;
    yRaw = (value) => plot.top + plot.height - (value / yMax) * plot.height;
    yOf = (value) => yRaw(Math.max(0, value));
    ticks = [];
    for (let value = 0; value <= yMax + step / 2; value += step) {
      ticks.push({ value, label: value.toLocaleString('pt-BR') });
    }
  }

  const xOf = (theta) => plot.left + (theta / range) * plot.width;

  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';

  // Grade horizontal + rótulos do eixo Y
  ctx.lineWidth = 1;
  for (const tick of ticks) {
    const y = Math.round(yOf(tick.value)) + 0.5;
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'right';
    ctx.fillText(tick.label, plot.left - 8, y);
  }

  // Faixa sob o mouse
  if (highlightBin >= 0) {
    ctx.fillStyle = colors.highlight;
    ctx.fillRect(xOf(highlightBin * binSize), plot.top, xOf(binSize) - plot.left, plot.height);
  }

  // Barras
  const gap = binSize * (plot.width / range) > 6 ? 1.5 : 0.5;
  ctx.fillStyle = showTheory ? colors.barMuted : colors.bar;
  counts.forEach((count, index) => {
    if (!count) return;
    const x0 = xOf(index * binSize) + gap / 2;
    const x1 = xOf((index + 1) * binSize) - gap / 2;
    const y = yOf(count);
    ctx.fillRect(x0, y, Math.max(1, x1 - x0), plot.top + plot.height - y);
  });

  // Curva teórica (recortada na área do gráfico — perto de 0° ela vai ao
  // infinito, e isso é esperado)
  if (showTheory) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.left, plot.top, plot.width, plot.height);
    ctx.clip();

    // Linha tracejada marcando de onde o ajuste começa
    const fitX = Math.round(xOf(theory.fitFrom)) + 0.5;
    ctx.strokeStyle = colors.axis;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(fitX, plot.top);
    ctx.lineTo(fitX, plot.top + plot.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = colors.theory;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    theory.expected.forEach((expected, index) => {
      if (!(expected > 0)) return;
      const x = xOf((index + 0.5) * binSize);
      // Sem limitar embaixo: abaixo do eixo a linha só sai do quadro
      // (recortada), em vez de virar uma reta falsa colada no zero.
      const y = Math.min(plot.top + plot.height + 40, Math.max(plot.top - 40, yRaw(expected)));
      if (started) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        started = true;
      }
    });
    ctx.stroke();
    ctx.restore();

    // Em tela estreita o rótulo bateria na legenda — fica só a linha
    // tracejada (o texto embaixo do gráfico explica o ajuste).
    if (width >= 520) {
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'left';
      ctx.fillText(`ajuste ≥ ${theory.fitFrom}°`, Math.round(xOf(theory.fitFrom)) + 5, plot.top + 8);
    }
  }

  // Eixo X
  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top + plot.height + 0.5);
  ctx.lineTo(plot.left + plot.width, plot.top + plot.height + 0.5);
  ctx.stroke();

  const tickStep = range <= 60 ? 10 : 30;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let theta = 0; theta <= range; theta += tickStep) {
    ctx.fillText(`${theta}°`, xOf(theta), plot.top + plot.height + 7);
  }
  ctx.fillText('Ângulo de espalhamento θ', plot.left + plot.width / 2, plot.top + plot.height + 25);

  // Rótulo do eixo Y
  ctx.save();
  ctx.translate(13, plot.top + plot.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText(logScale ? 'Partículas (escala log)' : 'Partículas', 0, 0);
  ctx.restore();

  // Legenda (só no modo teoria)
  if (showTheory) {
    const legendX = plot.left + plot.width - 8;
    const lineY = plot.top + 10;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    const theoryLabel = 'Rutherford 1/sen⁴(θ/2)';
    ctx.fillText(theoryLabel, legendX, lineY);
    const theoryWidth = ctx.measureText(theoryLabel).width;
    ctx.strokeStyle = colors.theory;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX - theoryWidth - 26, lineY);
    ctx.lineTo(legendX - theoryWidth - 8, lineY);
    ctx.stroke();

    const simY = lineY + 18;
    ctx.fillText('Simulação', legendX, simY);
    const simWidth = ctx.measureText('Simulação').width;
    ctx.fillStyle = colors.barMuted;
    ctx.fillRect(legendX - simWidth - 22, simY - 5, 10, 10);
  }

  ctx.restore();
}

// Passo "redondo" (1, 2 ou 5 × 10ⁿ) mais próximo acima de `raw`, pras
// marcas do eixo linear.
function niceStep(raw) {
  const safe = Math.max(raw, 1);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const fraction = safe / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatPower(power) {
  if (power < 0) return (10 ** power).toLocaleString('pt-BR', { maximumFractionDigits: -power });
  if (power === 0) return '1';
  if (power <= 3) return String(10 ** power);
  return `10${superscript(power)}`;
}

function superscript(number) {
  const map = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(number)
    .split('')
    .map((digit) => map[digit] ?? digit)
    .join('');
}

// PNG pro relatório do painel: paleta escura fixa (o relatório é visto
// depois, em qualquer tema). Mostra a comparação com a teoria quando há
// partículas suficientes na cauda; senão só a distribuição.
export function renderScatteringChartToDataURL(histogram, theory, { width = 640, height = 340 } = {}) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawScatteringChart(ctx, {
    width,
    height,
    mode: theory?.ok ? 'theory' : 'log',
    histogram,
    theory,
    colors: REPORT_CHART_COLORS,
  });
  return canvas.toDataURL('image/png');
}
