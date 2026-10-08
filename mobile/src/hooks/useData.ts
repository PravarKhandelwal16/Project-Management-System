import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { queryString } from "../services/apiCore";
import type { Row } from "../types";
export function useDebounced(value: string, delay = 350) {
  const [result, setResult] = useState(value);
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setResult(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]),
  );
  return result;
}
export function useData<T = any>(path: string | null) {
  const { api } = useAuth();
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    if (!path) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api<T>(path);
      if (current === revision.current) setData(result.data);
    } catch (e: any) {
      if (current === revision.current) setError(e.message);
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [api, path]);
  useFocusEffect(
    useCallback(() => {
      setData(null);
      void refresh();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => {
        subscription.remove();
        revision.current++;
      };
    }, [refresh]),
  );
  return { data, loading, error, refresh };
}
export function usePaged(
  path: string | null,
  filters: Row = {},
  mode: "page" | "offset" = "page",
) {
  const { api } = useAuth();
  const key = queryString(filters);
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [hasMore, setHasMore] = useState(false);
  const cursor = useRef(1),
    revision = useRef(0),
    busy = useRef(false);
  const load = useCallback(
    async (reset: boolean) => {
      if (!path) {
        setLoading(false);
        setRows([]);
        return;
      }
      if (!reset && busy.current) return;
      const current = reset ? ++revision.current : revision.current,
        page = reset ? 1 : cursor.current;
      busy.current = true;
      setLoading(true);
      setError("");
      const paging = queryString(
        mode === "offset"
          ? { limit: 20, offset: (page - 1) * 20 }
          : { limit: 20, page },
      );
      try {
        const result = await api<Row[]>(
          path + "?" + [key, paging].filter(Boolean).join("&"),
        );
        if (current !== revision.current) return;
        setRows((previous) =>
          reset
            ? result.data
            : [
                ...previous,
                ...result.data.filter(
                  (item) => !previous.some((old) => old.id === item.id),
                ),
              ],
        );
        setHasMore(
          result.pagination
            ? result.pagination.has_more
            : result.total !== undefined
              ? page * 20 < result.total
              : result.data.length === 20,
        );
        cursor.current = page + 1;
      } catch (e: any) {
        if (current === revision.current) setError(e.message);
      } finally {
        if (current === revision.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [api, path, key, mode],
  );
  const refresh = useCallback(() => load(true), [load]),
    more = useCallback(() => load(false), [load]);
  useFocusEffect(
    useCallback(() => {
      setRows([]);
      void refresh();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => {
        subscription.remove();
        revision.current++;
        busy.current = false;
      };
    }, [refresh]),
  );
  return { rows, loading, error, hasMore, refresh, more };
}
