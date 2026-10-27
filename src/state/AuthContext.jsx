import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { hasSessionHint, onAccessTokenChange, setSessionHint } from '../lib/session';

const AuthContext = createContext(null);

/** Tries the refresh cookie only when this browser has signed in before. */
export const restoreFromCookie = async () => {
  if (!hasSessionHint()) return null;
  try {
    return await authApi.restoreSession();
  } catch {
    setSessionHint(false);
    return null;
  }
};

/**
 * status: 'checking' while the refresh cookie is tried on load, then 'signedOut' or
 * 'signedIn'. The access token stays inside lib/session; components only see the admin.
 * There is no default or demo user: without a session nothing but the sign-in page renders.
 */
export function AuthProvider({ children, restore = restoreFromCookie }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState('checking');
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    let active = true;
    restore().then((restored) => {
      if (!active) return;
      setAdmin(restored);
      setStatus(restored ? 'signedIn' : 'signedOut');
    });
    return () => {
      active = false;
    };
  }, [restore]);

  // A refresh that fails mid-session (expired, revoked, reused) signs the operator out.
  useEffect(
    () =>
      onAccessTokenChange((token) => {
        if (token) return;
        setAdmin(null);
        setStatus((current) => {
          if (current === 'signedIn') setSessionEnded(true);
          return current === 'checking' ? current : 'signedOut';
        });
      }),
    []
  );

  const signIn = useCallback(async (credentials) => {
    const signedIn = await authApi.signIn(credentials);
    setAdmin(signedIn);
    setStatus('signedIn');
    setSessionEnded(false);
    return signedIn;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch {
      // Local state is cleared by authApi.signOut even when the network call fails.
    } finally {
      setAdmin(null);
      setStatus('signedOut');
      setSessionEnded(false);
    }
  }, []);

  const value = useMemo(
    () => ({ admin, status, sessionEnded, signIn, signOut }),
    [admin, status, sessionEnded, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};
