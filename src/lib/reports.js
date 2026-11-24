import { supabase } from './supabaseClient';
import { summarizeTelescope } from '../features/simulation-demo/telescope';

const NOT_CONFIGURED_MESSAGE =
  'Supabase ainda não está configurado neste ambiente — veja claude/supabase-auth-setup.md.';

// Histórico + relatórios de simulação (tabela `simulation_runs`, ver
// claude/dashboard-usuario-setup.md pro SQL). RLS garante que cada usuário
// só vê/edita as próprias linhas — aqui sempre filtramos por `user_id`
// mesmo assim, pra deixar explícito e pra funcionar igual se RLS mudar.

export async function listReports(userId) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  const { data, error } = await supabase
    .from('simulation_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveReport({
  userId,
  simulationId,
  label,
  params,
  seed,
  durationSeconds,
  trajectoryCount,
  screenshotDataUrl,
  chartDataUrl,
  results = null,
}) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  const row = {
    user_id: userId,
    simulation_id: simulationId,
    label,
    params,
    seed,
    duration_seconds: durationSeconds,
    trajectory_count: trajectoryCount,
    screenshot_data_url: screenshotDataUrl,
    chart_data_url: chartDataUrl,
    report_generated_at: new Date().toISOString(),
  };
  // `results` (resultados numéricos, ex. coincidências e dose do PET) só
  // vai quando existe — o Rutherford não tem.
  if (results) row.results = results;

  let { data, error } = await supabase.from('simulation_runs').insert(row).select().single();

  // Banco ainda sem a coluna `results` (SQL de claude/dashboard-usuario-setup.md
  // não rodado): salva o resto em vez de perder o relatório inteiro.
  if (error && row.results && /results/i.test(`${error.message} ${error.details ?? ''}`)) {
    console.warn('simulation_runs sem a coluna "results" — relatório salvo sem os resultados.', error);
    delete row.results;
    ({ data, error } = await supabase.from('simulation_runs').insert(row).select().single());
  }
  if (error) throw error;
  return data;
}

// Versão enxuta dos resultados pra guardar no relatório: tira a lista de
// linhas de resposta (pode ter milhares — a imagem reconstruída já vai
// como PNG) e guarda só quantas eram. O espectro (110 números) fica.
export function compactResults(results) {
  if (!results || typeof results !== 'object') return null;
  const { lines_of_response: lines, ...rest } = results;
  if (Array.isArray(lines)) return { ...rest, lines_of_response_count: lines.length };
  // Decaimento (rdecay01): sem os decaimentos detalhados e os espectros
  // (centenas de KB) — a cadeia (transitions) e as contagens bastam pro
  // resumo do relatório.
  // Telescópio: guarda o resumo por partícula no lugar da lista de eventos.
  if (rest.tkr_layers !== undefined && Array.isArray(rest.events)) {
    const small = { ...rest, summary: summarizeTelescope(rest) };
    delete small.events;
    return small;
  }
  if (Array.isArray(rest.transitions)) {
    const small = { ...rest };
    delete small.decays;
    delete small.spectra;
    return { ...small, decays_count: Array.isArray(rest.decays) ? rest.decays.length : undefined };
  }
  return rest;
}

export async function deleteReport(id) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  const { error } = await supabase.from('simulation_runs').delete().eq('id', id);
  if (error) throw error;
}
