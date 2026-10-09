import { supabase } from './supabaseClient';

const NOT_CONFIGURED_MESSAGE =
  'Supabase ainda não está configurado neste ambiente — veja claude/supabase-auth-setup.md.';

// Busca a linha de `profiles` do usuário (username + avatar_url). A linha
// já existe desde o cadastro (trigger handle_new_user, ver
// supabase-auth-setup.md) — isso só lê o que já está lá.
export async function getProfile(userId) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Sobe a foto pro bucket "avatars" (ver claude/dashboard-usuario-setup.md
// pra criar o bucket + políticas) em `<userId>/avatar.<ext>` — sempre o
// mesmo caminho por usuário (upsert), então trocar a foto substitui a
// anterior em vez de acumular arquivos. Atualiza `profiles.avatar_url` em
// seguida com um parâmetro `?v=` pra forçar o navegador a buscar a versão
// nova em vez de uma cópia antiga em cache.
export async function uploadAvatar(userId, file) {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return avatarUrl;
}
