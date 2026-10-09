// Histograma de ângulo de espalhamento, usado só pelo relatório do painel
// (ver Dashboard.jsx / SimulationExample.jsx, botão "Gerar relatório").
// Não depende de nenhuma lib de gráfico — desenha num <canvas> comum e
// devolve um PNG em base64, pra poder ser salvo junto com o resto do
// relatório (texto + print do detector) numa linha só no banco.

// Ângulo (graus, 0-180) entre a direção de saída de cada trajetória
// (ponto inicial -> ponto final) e a direção de incidência do feixe.
// `trajectories` é o formato já adaptado pro viewer: [{ id, points: [[x,y,z], ...] }]
export function computeScatteringAngles(trajectories, incidentDir = [-1, 0, 0]) {
  const [ix, iy, iz] = normalize(incidentDir);

  return trajectories
    .map((trajectory) => {
      const points = trajectory.points;
      if (!points || points.length < 2) return null;
      const [sx, sy, sz] = points[0];
      const [ex, ey, ez] = points[points.length - 1];
      const dir = normalize([ex - sx, ey - sy, ez - sz]);
      if (!dir) return null;
      const dot = dir[0] * ix + dir[1] * iy + dir[2] * iz;
      const clamped = Math.min(1, Math.max(-1, dot));
      return (Math.acos(clamped) * 180) / Math.PI;
    })
    .filter((angle) => angle !== null && Number.isFinite(angle));
}

function normalize([x, y, z]) {
  const length = Math.sqrt(x * x + y * y + z * z);
  if (!length) return null;
  return [x / length, y / length, z / length];
}

// Agrupa os ângulos em faixas de `binSize` graus (default: 18 faixas de 10°).
export function buildHistogram(angles, binSize = 10) {
  const binCount = Math.ceil(180 / binSize);
  const counts = new Array(binCount).fill(0);

  for (const angle of angles) {
    const index = Math.min(binCount - 1, Math.floor(angle / binSize));
    counts[index] += 1;
  }

  return {
    binSize,
    counts,
    labels: counts.map((_, index) => `${index * binSize}°`),
    total: angles.length,
  };
}

// Desenha o histograma num canvas offscreen e devolve um data URL PNG.
// Paleta estritamente preto/branco/cinza, igual ao resto do site.
export function renderHistogramToDataURL(histogram, { width = 480, height = 260 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const paddingLeft = 36;
  const paddingBottom = 28;
  const paddingTop = 16;
  const paddingRight = 12;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const maxCount = Math.max(1, ...histogram.counts);
  const barCount = histogram.counts.length;
  const barGap = 2;
  const barWidth = plotWidth / barCount - barGap;

  // eixo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + plotHeight);
  ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight);
  ctx.stroke();

  // barras
  ctx.fillStyle = '#ffffff';
  histogram.counts.forEach((count, index) => {
    const barHeight = (count / maxCount) * plotHeight;
    const x = paddingLeft + index * (barWidth + barGap);
    const y = paddingTop + plotHeight - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);
  });

  // rótulos (só alguns, pra não poluir)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  histogram.labels.forEach((label, index) => {
    if (index % 3 !== 0) return;
    const x = paddingLeft + index * (barWidth + barGap) + barWidth / 2;
    ctx.fillText(label, x, height - 10);
  });

  ctx.save();
  ctx.translate(12, paddingTop + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('eventos', 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
