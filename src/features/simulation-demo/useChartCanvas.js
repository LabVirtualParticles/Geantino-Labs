import { useEffect, useRef, useState } from 'react';
import { chartColorsFromTheme } from './scatteringChart';

// Canvas de gráfico que acompanha o tamanho do contêiner, o
// devicePixelRatio e a troca de tema (lê as cores dos tokens do CSS a cada
// redesenho). `draw(ctx, { width, height, colors })` desenha em px CSS.
// Mesmo comportamento do ScatteringChart (SimulationResults.jsx), separado
// pra servir aos gráficos do PET.
export function useChartCanvas(draw) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((key) => key + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(ctx, { width: size.width, height: size.height, colors: chartColorsFromTheme(canvas) });
  }, [draw, size, themeKey]);

  return { wrapRef, canvasRef, size };
}
