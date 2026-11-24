// Atividade de referência por isótopo, pra regra de 3 "N decaimentos da
// simulação = quanto tempo de um exame real". 1 MBq = 10⁶ decaimentos/s,
// então: tempo = N ÷ (atividade em MBq × 10⁶).
//
// Valores (adulto), conferidos em 23/nov/2026 — ver também o "Contexto e
// fundamentos" (pet-b3a.explanations.json), que cita as mesmas fontes:
//  - F18 (FDG): 370 MBq = piso da faixa 370–740 MBq do guia da SNM
//    (Delbeke et al., J Nucl Med 47(5):885, 2006). A diretriz da EANM 2.0
//    (Boellaard et al., 2015) calcula pelo peso do paciente.
//  - C11 (colina): 370 MBq = piso da faixa 370–740 MBq da bula da FDA
//    (Choline C 11 Injection, 2012).
//  - N13 (amônia) e O15 (água): 400 MBq por injeção (exame do coração,
//    repouso/estresse) — tabela da EANM, Eur J Nucl Med Mol Imaging
//    50:792–812, 2022, doi:10.1007/s00259-022-05991-7.
//
// A meia-vida não entra: em microssegundos nenhum dos quatro perde
// atividade de forma perceptível.

export const PET_REFERENCE_ACTIVITY = {
  F18: { activityMBq: 370, tracer: 'FDG (¹⁸F)' },
  C11: { activityMBq: 370, tracer: 'colina (¹¹C)' },
  N13: { activityMBq: 400, tracer: 'amônia (¹³N)' },
  O15: { activityMBq: 400, tracer: 'água (¹⁵O)' },
};

const TIME_UNITS = [
  { factor: 1, unit: 's' },
  { factor: 1e-3, unit: 'ms' },
  { factor: 1e-6, unit: 'µs' },
  { factor: 1e-9, unit: 'ns' },
];

function formatSeconds(seconds) {
  const best = TIME_UNITS.find(({ factor }) => seconds >= factor) ?? TIME_UNITS.at(-1);
  const value = seconds / best.factor;
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: value < 10 ? 2 : 1 })} ${best.unit}`;
}

/**
 * @returns {{ text: string, seconds: number, activityMBq: number, tracer: string } | null}
 */
export function examEquivalence(decays, isotope) {
  const reference = PET_REFERENCE_ACTIVITY[isotope];
  const count = Number(decays);
  if (!reference || !(count > 0)) return null;
  const seconds = count / (reference.activityMBq * 1e6);
  return {
    ...reference,
    seconds,
    text: `${formatSeconds(seconds)} de um exame com ${reference.activityMBq} MBq de ${reference.tracer}`,
  };
}
