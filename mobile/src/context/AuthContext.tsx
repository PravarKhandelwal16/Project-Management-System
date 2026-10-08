import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  createApi,
  validateApiUrl,
  SESSION_EXPIRED,
} from "../services/apiCore";
import { peekPushToken, clearPushToken } from "../services/push";
import { tokenStore } from "../services/tokenStore";
import type { Envelope, User } from "../types";
export type Api = <T = any>(
  path: string,
  options?: { method?: string; body?: unknown; public?: boolean },
) => Promise<Envelope<T>>;
type Auth = {
  user: User | null;
  api: Api;
  initializing: boolean;
  startupError: string;
  notice: string;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (body: {
    full_name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [initializing, setInitializing] = useState(true),
    [startupError, setStartupError] = useState(""),
    [notice, setNotice] = useState("");
  const token = useRef<string | null>(null),
    generation = useRef(0);
  const api = useMemo(
    () =>
      createApi({
        baseUrl: validateApiUrl(
          process.env.EXPO_PUBLIC_API_URL || "",
          !__DEV__,
        ),
        getToken: () => token.current,
        onUnauthorized: async (rejected: string | null) => {
          if (!rejected || rejected !== token.current) return;
          generation.current++;
          token.current = null;
          setUser(null);
          setNotice(SESSION_EXPIRED);
          await tokenStore.clear();
        },
      }) as Api,
    [],
  );
  const restore = useCallback(async () => {
    setInitializing(true);
    setStartupError("");
    const revision = ++generation.current;
    try {
      token.current = await tokenStore.get();
      if (token.current) {
        const result = await api<User>("/auth/me");
        if (generation.current === revision) setUser((result as any).user);
      }
    } catch (error: any) {
      if (error.status !== 401)
        setStartupError(error.message || "Unable to restore your session.");
    } finally {
      setInitializing(false);
    }
  }, [api]);
  useEffect(() => {
    void restore();
  }, [restore]);
  const refreshUser = useCallback(async () => {
    if (!token.current) return;
    const revision = generation.current;
    const result = await api<User>("/auth/me");
    if (revision === generation.current) setUser((result as any).user);
  }, [api]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && token.current)
        void refreshUser().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshUser]);
  const login = async (email: string, password: string) => {
    const result = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      public: true,
      body: { email, password },
    });
    // Login's token is top level in the existing API, rather than under data.
    const received = (result as any).token;
    if (!received)
      throw new Error("The server did not return a session token.");
    const revision = ++generation.current;
    token.current = received;
    try {
      const me = await api<User>("/auth/me");
      if (revision !== generation.current) return;
      await tokenStore.set(received);
      setNotice("");
      setUser((me as any).user);
    } catch (error) {
      token.current = null;
      await tokenStore.clear();
      throw error;
    }
  };
  const register = async (body: {
    full_name: string;
    email: string;
    password: string;
  }) => {
    await api("/auth/register", { method: "POST", body, public: true });
    await login(body.email, body.password);
  };
  const logout = async () => {
    // Clear local access immediately, including when the backend is unreachable.
    const pushToken = peekPushToken();
    const removal = pushToken
      ? api("/notifications/push-devices", {
          method: "DELETE",
          body: { token: pushToken },
        }).catch(() => {})
      : Promise.resolve();
    void clearPushToken().catch(() => {});
    const acknowledgement = api("/auth/logout", { method: "POST" }).catch(
      () => {},
    );
    generation.current++;
    token.current = null;
    setUser(null);
    setNotice("");
    await tokenStore.clear();
    await Promise.all([acknowledgement, removal]);
  };
  return (
    <Context.Provider
      value={{
        user,
        api,
        initializing,
        startupError,
        notice,
        retry: restore,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider is required.");
  return value;
}
