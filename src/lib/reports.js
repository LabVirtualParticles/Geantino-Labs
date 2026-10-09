import { supabase } from './supabaseClient';

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
}) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  const { data, error } = await supabase
    .from('simulation_runs')
    .insert({
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
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReport(id) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  const { error } = await supabase.from('simulation_runs').delete().eq('id', id);
  if (error) throw error;
}
