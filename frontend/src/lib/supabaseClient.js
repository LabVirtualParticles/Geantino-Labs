import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Publishable key (formato sb_publishable_...) — substitui a antiga
// "anon key" no novo sistema de chaves do Supabase. Ela é feita pra ser
// pública (fica exposta no bundle do navegador de qualquer app Supabase),
// então usar o prefixo padrão VITE_ é seguro; quem protege os dados de
// verdade é o RLS ativado nas tabelas, não o sigilo dessa chave.
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isSupabaseConfigured) {
  // Não trava o app — só avisa no console. Sem essas duas variáveis
  // (VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no `.env`/env vars
  // da Vercel), login e cadastro ficam desativados, mas o resto do site
  // continua funcionando normalmente. IMPORTANTE: `createClient` joga um
  // erro síncrono se receber url/key vazios, então só chamamos ele quando
  // as duas variáveis existem de verdade.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não configuradas — ' +
      'veja claude/supabase-auth-setup.md. Login e cadastro não vão funcionar até isso ser preenchido.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
