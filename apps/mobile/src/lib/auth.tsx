import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  TokenPair,
  UserDto,
} from '@landconnect/shared';

import { api } from './api';
import {
  clearSession,
  getSession,
  loadSession,
  setSession,
  subscribeSession,
} from './session';
import { connectSocket, disconnectSocket } from './socket';

interface AuthContextValue {
  user: UserDto | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [session, setSessionState] = useState<TokenPair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeSession(setSessionState);
    let cancelled = false;

    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (!stored) {
        setLoading(false);
        return;
      }
      setSessionState(stored);
      try {
        const me = await api.auth.me(); // auto-refreshes if the access token expired
        if (!cancelled) setUser(me);
      } catch {
        await clearSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // One socket for the whole app: connect once authenticated, drop on logout.
  useEffect(() => {
    if (session?.accessToken) connectSocket();
    else disconnectSocket();
  }, [session?.accessToken]);

  const applySession = useCallback(async (response: AuthResponse) => {
    await setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });
    setUser(response.user);
  }, []);

  const signIn = useCallback(
    async (input: LoginInput) => {
      await applySession(await api.auth.login(input));
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      await applySession(await api.auth.register(input));
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    const active = getSession();
    if (active) {
      try {
        await api.auth.logout(active.refreshToken);
      } catch {
        // best effort — clear locally regardless
      }
    }
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken: session?.accessToken ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
