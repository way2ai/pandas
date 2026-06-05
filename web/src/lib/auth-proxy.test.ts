import { afterEach, expect, test, vi } from "vitest";

import { proxyAuthRequest } from "./auth-proxy";

afterEach(() => {
  vi.restoreAllMocks();
});

test("forwards request cookies to the upstream API and returns set-cookie headers", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          email: "admin@example.com",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "platform_session=session-123; Path=/; HttpOnly; SameSite=Lax",
        },
      },
    ),
  );

  const request = new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers: {
      cookie: "platform_session=session-123",
    },
  });

  const response = await proxyAuthRequest(request, "/api/v1/auth/me");
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/auth/me",
    expect.objectContaining({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: "platform_session=session-123",
      },
      cache: "no-store",
    }),
  );
  expect(response.headers.get("set-cookie")).toContain("platform_session=session-123");
  expect(payload.data.email).toBe("admin@example.com");
});

test("returns a 502 envelope when the upstream request fails", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

  const request = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: "admin@example.com",
      password: "password123",
    }),
  });

  const response = await proxyAuthRequest(request, "/api/v1/auth/login");
  const payload = await response.json();

  expect(response.status).toBe(502);
  expect(payload.error.code).toBe("upstream_unavailable");
  expect(payload.error.message).toBe("authentication service unavailable");
});
