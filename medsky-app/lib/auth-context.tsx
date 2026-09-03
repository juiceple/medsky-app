import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

type SignUpResult = { error: string | null; needsEmailConfirmation?: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Lets the in-app browser tab used for the Google OAuth flow close itself
// and hand control back to the app once the redirect lands (web only; a no-op on native).
WebBrowser.maybeCompleteAuthSession();

/**
 * Supabase's OAuth flow redirects to `redirectTo` with the session tokens in
 * the URL fragment (implicit flow). Parse them out and hand them to the
 * client so it can persist the session the same way password sign-in does.
 */
async function createSessionFromUrl(url: string) {
  const paramsString = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
  if (!paramsString) return null;

  const params = new URLSearchParams(paramsString);
  const errorDescription = params.get('error_description') ?? params.get('error_code');
  if (errorDescription) throw new Error(errorDescription);

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
}

/**
 * Resolves a user's role the same way medsky_homepage does:
 * public.user_roles (active row) first, falling back to the legacy
 * profiles.role column. See src/lib/auth/require-admin.ts in medsky_homepage.
 */
async function resolveRole(userId: string): Promise<AppRole | null> {
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (roleRow?.role) return roleRow.role;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileRow?.role === 'admin') return 'admin';

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserData(userId: string) {
    const [{ data: profileRow }, resolvedRole] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      resolveRole(userId),
    ]);

    setProfile(profileRow ?? null);
    setRole(resolvedRole);
  }

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      // On web, Google OAuth redirects back to this page with the session
      // tokens in the URL fragment (implicit flow) instead of being handed to
      // createSessionFromUrl via the in-app browser session, which only
      // happens on native. Consume it here so web logins don't get stranded
      // on a URL like https://www.medsky.co.kr/#access_token=... .
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        try {
          await createSessionFromUrl(window.location.href);
        } catch {
          // Not an auth redirect (or a stale/invalid one) — ignore and fall through.
        } finally {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        loadUserData(initialSession.user.id).finally(() => isMounted && setLoading(false));
      } else {
        setLoading(false);
      }
    }

    restoreSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        loadUserData(nextSession.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      loading,
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUpWithPassword(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        return { error: null, needsEmailConfirmation: !data.session };
      },
      async signInWithGoogle() {
        try {
          const redirectTo = Linking.createURL('/');
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
          });
          if (error) return { error: error.message };
          if (!data?.url) return { error: '구글 로그인을 시작하지 못했습니다.' };

          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type !== 'success') {
            // User closed the browser tab before finishing — not an error to surface.
            return { error: null };
          }

          const newSession = await createSessionFromUrl(result.url);
          return { error: newSession ? null : '구글 로그인에 실패했습니다.' };
        } catch (err) {
          return { error: err instanceof Error ? err.message : '구글 로그인에 실패했습니다.' };
        }
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async refreshProfile() {
        if (session?.user) {
          await loadUserData(session.user.id);
        }
      },
    }),
    [session, profile, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
