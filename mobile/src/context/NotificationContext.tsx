import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
const Context = createContext({ count: 0, refresh: async () => {} });
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { api, user } = useAuth();
  const userId = user?.id;
  const [count, setCount] = useState(0);
  const currentUser = useRef(userId);
  useEffect(() => {
    currentUser.current = userId;
  }, [userId]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const response = await api<{ count: number }>(
      "/notifications/unread-count",
    );
    if (currentUser.current === userId) setCount(Number(response.data.count));
  }, [api, userId]);
  useEffect(() => {
    setCount(0);
    if (!userId) return;
    void refresh().catch(() => {});
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refresh().catch(() => {});
    }, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh().catch(() => {});
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh, userId]);
  return (
    <Context.Provider value={{ count, refresh }}>{children}</Context.Provider>
  );
}
export const useNotifications = () => useContext(Context);
