import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import {
  devicePushToken,
  rememberPushToken,
  restorePushToken,
  peekPushToken,
  clearPushToken,
  pushAvailable,
  notifications,
  pushTask,
} from "../services/push";
const Context = createContext({
  busy: false,
  error: "",
  enable: async () => {},
  disable: async () => {},
  target: null as { taskId: number; userId: number } | null,
  consumed: () => {},
});
export function PushProvider({ children }: { children: React.ReactNode }) {
  const { user, api } = useAuth(),
    { refresh } = useNotifications();
  const userId = user?.id,
    current = useRef(userId);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [target, setTarget] = useState<{ taskId: number; userId: number } | null>(
      null,
    );
  current.current = userId;
  const registration = useRef<{ userId: number; work: Promise<void> } | null>(
    null,
  );
  const register = useCallback(
    async (prompt: boolean) => {
      if (!userId) return;
      const pending = registration.current;
      if (pending) {
        try {
          await pending.work;
        } catch (error) {
          if (!prompt) throw error;
        }
        if (!prompt && pending.userId === userId) return;
      }
      if (current.current !== userId)
        throw new Error("Your account changed. Please try again.");
      const work = (async () => {
        const token = await devicePushToken(prompt);
        if (current.current !== userId) return;
        if (token) {
          await api("/notifications/push-devices", {
            method: "POST",
            body: { token, platform: Platform.OS },
          });
          if (current.current === userId) await rememberPushToken(token);
        } else {
          const old = peekPushToken();
          if (old)
            await api("/notifications/push-devices", {
              method: "DELETE",
              body: { token: old },
            });
          await clearPushToken();
        }
      })();
      registration.current = { userId, work };
      try {
        await work;
      } finally {
        if (registration.current?.work === work) registration.current = null;
      }
    },
    [api, userId],
  );
  const enable = async () => {
    setBusy(true);
    setError("");
    try {
      await register(true);
      if (current.current !== userId)
        throw new Error("Your account changed. Please try again.");
      await api("/notifications/preferences", {
        method: "PUT",
        body: { push_due_tomorrow: true },
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/notifications/preferences", {
        method: "PUT",
        body: { push_due_tomorrow: false },
      });
      if (current.current !== userId)
        throw new Error("Your account changed. Please try again.");
      const token = peekPushToken();
      if (token)
        await api("/notifications/push-devices", {
          method: "DELETE",
          body: { token },
        });
      if (current.current === userId) await clearPushToken();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setTarget(null);
    setError("");
    if (!userId || !pushAvailable()) return;
    let active = true;
    const sync = () => {
      void restorePushToken()
        .then(() => {
          if (active) return register(false);
        })
        .catch(() => {});
    };
    sync();
    const n = notifications();
    n.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const receive = (response: any) => {
      const taskId = pushTask(
        response.notification.request.content.data,
        userId,
      );
      if (active && taskId) {
        setTarget({ taskId, userId });
        void refresh().catch(() => {});
      }
      n.clearLastNotificationResponse();
    };
    const last = n.getLastNotificationResponse();
    if (last) receive(last);
    const tapped = n.addNotificationResponseReceivedListener(receive);
    const arrived = n.addNotificationReceivedListener(() => {
      void refresh().catch(() => {});
    });
    const changed = n.addPushTokenListener(() => {
      void register(false).catch(() => {});
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      active = false;
      tapped.remove();
      arrived.remove();
      changed.remove();
      foreground.remove();
    };
  }, [userId, register, refresh]);
  return (
    <Context.Provider
      value={{
        busy,
        error,
        enable,
        disable,
        target,
        consumed: () => setTarget(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePush = () => useContext(Context);
