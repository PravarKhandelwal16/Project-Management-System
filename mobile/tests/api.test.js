import {
  createApi,
  ApiError,
  queryString,
  validateApiUrl,
  SESSION_EXPIRED,
} from "../src/services/apiCore";
const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});
test("query encoding, API URL validation and release HTTPS enforcement", () => {
  expect(
    queryString({ search: "release & review", page: 2, missing: null }),
  ).toBe("page=2&search=release%20%26%20review");
  expect(validateApiUrl("https://example.test/api/")).toBe(
    "https://example.test/api",
  );
  for (const url of [
    "https://example.test",
    "ftp://example.test/api",
    "https://secret@example.test/api",
    "https://example.test/api?token=secret",
  ])
    expect(() => validateApiUrl(url)).toThrow();
  expect(() => validateApiUrl("http://example.test/api", true)).toThrow(
    "HTTPS",
  );
});
test("uses the existing API and Bearer auth, without logging or retrying mutations", async () => {
  const fetchImpl = jest.fn(async () =>
    response(201, { success: true, data: { id: 7 } }),
  );
  const api = createApi({
    baseUrl: "https://example.test/api",
    getToken: () => "secure-token",
    fetchImpl,
  });
  expect(
    (await api("/tasks", { method: "POST", body: { name: "Review" } })).data.id,
  ).toBe(7);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][1]).toMatchObject({
    method: "POST",
    headers: { Authorization: "Bearer secure-token" },
    body: '{"name":"Review"}',
  });
});
test("401 expires private sessions even when the response is not JSON", async () => {
  const onUnauthorized = jest.fn();
  const api = createApi({
    baseUrl: "https://example.test/api",
    getToken: () => "old",
    onUnauthorized,
    fetchImpl: async () => ({
      status: 401,
      ok: false,
      json: async () => {
        throw new Error("HTML");
      },
    }),
  });
  await expect(api("/auth/me")).rejects.toMatchObject({
    status: 401,
    message: SESSION_EXPIRED,
  });
  expect(onUnauthorized).toHaveBeenCalledWith("old");
});
test("public login 401 does not clear an existing session", async () => {
  const onUnauthorized = jest.fn();
  const api = createApi({
    baseUrl: "https://example.test/api",
    onUnauthorized,
    fetchImpl: async () =>
      response(401, { message: "Invalid email or password" }),
  });
  await expect(api("/auth/login", { public: true })).rejects.toThrow(
    "Invalid email or password",
  );
  expect(onUnauthorized).not.toHaveBeenCalled();
});
test.each([400, 403, 404, 409, 500])(
  "safe and useful handling for HTTP %s",
  async (status) => {
    const api = createApi({
      baseUrl: "https://example.test/api",
      fetchImpl: async () =>
        response(status, { message: "Internal SQL password /path" }),
    });
    await expect(api("/tasks")).rejects.toMatchObject({
      status,
      message:
        status >= 500
          ? "The server could not complete your request. Please try again."
          : "Internal SQL password /path",
    });
  },
);
test("network failures and timeouts offer retry without changing session", async () => {
  const onUnauthorized = jest.fn();
  const api = createApi({
    baseUrl: "http://local/api",
    onUnauthorized,
    fetchImpl: async () => {
      throw new TypeError("network");
    },
  });
  await expect(api("/projects")).rejects.toThrow("Unable to connect");
  expect(onUnauthorized).not.toHaveBeenCalled();
  const timeoutApi = createApi({
    baseUrl: "http://local/api",
    timeout: 5,
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      ),
  });
  await expect(timeoutApi("/tasks")).rejects.toThrow("timed out");
});
