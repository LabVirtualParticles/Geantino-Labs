import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const NOT_CONFIGURED_MESSAGE =
  'Login ainda não está configurado neste ambiente (faltam as chaves do Supabase). Veja claude/supabase-auth-setup.md.';

/**
 * Estado de autenticação (Supabase Auth) disponível pro app inteiro.
 * `loading` fica true só na primeira checagem, ao carregar a página —
 * depois disso `user` reflete o estado atual em tempo real (login,
 * logout, expiração de sessão), via `onAuthStateChange`.
 *
 * Se as env vars do Supabase não estiverem configuradas (`supabase` é
 * `null`), o provider não quebra o app: `user` fica sempre `null` e as
 * funções de login/cadastro rejeitam com uma mensagem explicando o que
 * falta, em vez de lançar o erro cru do supabase-js.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // `username` vai junto nos metadados do usuário no cadastro — o
  // trigger `handle_new_user` (ver claude/supabase-auth-setup.md) copia
  // isso pra tabela `profiles`, que é protegida por RLS.
  async function signUp({ username, email, password }) {
    if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    return data;
  }

  async function signIn({ email, password }) {
    if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>');
  }
  return context;
}
