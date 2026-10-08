export const SESSION_EXPIRED = "Your session has expired. Please log in again.";
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}
export function queryString(values = {}) {
  return Object.entries(values)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        encodeURIComponent(key) + "=" + encodeURIComponent(String(value)),
    )
    .join("&");
}
export function validateApiUrl(value, production = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(
      "Set EXPO_PUBLIC_API_URL to your backend URL, ending in /api.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.replace(/\/$/, "").endsWith("/api")
  )
    throw new ApiError(
      "API URL must be an HTTP(S) address ending in /api, without credentials or query parameters.",
    );
  if (production && url.protocol !== "https:")
    throw new ApiError("Release builds require an HTTPS API URL.");
  return url.toString().replace(/\/$/, "");
}
/** @param {{baseUrl: string, getToken?: () => string | null, onUnauthorized?: (token: string | null) => void | Promise<void>, fetchImpl?: typeof fetch, timeout?: number}} config */
export function createApi({
  baseUrl,
  getToken = () => null,
  onUnauthorized = () => {},
  fetchImpl = fetch,
  timeout = 15000,
}) {
  return async function request(path, options = {}) {
    const token = options.public ? null : getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetchImpl(baseUrl + path, {
        method: options.method || "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
      });
      if (response.status === 401 && !options.public) {
        await onUnauthorized(token);
        throw new ApiError(SESSION_EXPIRED, 401);
      }
      let body;
      try {
        body = await response.json();
      } catch {
        throw new ApiError(
          "The server returned an unreadable response. Please try again.",
          response.status,
        );
      }
      if (!response.ok) {
        const fallback = {
          400: "Please check the information you entered.",
          403: "You do not have access to this action.",
          404: "This item is no longer available.",
          409: "This item changed. Refresh and try again.",
        };
        throw new ApiError(
          response.status >= 500
            ? "The server could not complete your request. Please try again."
            : body.message || fallback[response.status] || "Request failed.",
          response.status,
          body.errors || null,
        );
      }
      return body;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        controller.signal.aborted
          ? "The request timed out. Check your connection and try again."
          : "Unable to connect. Check your internet connection and try again.",
      );
    } finally {
      clearTimeout(timer);
    }
  };
}
