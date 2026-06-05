import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies login requests to the API and forwards the session cookie", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-123",
        data: {
          email: "admin@example.com",
          system_role: "platform_admin",
          expires_at: "2026-06-06T00:00:00Z",
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

  const response = await POST(request);
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/auth/login",
    expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: "admin@example.com",
        password: "password123",
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("platform_session=session-123");
  expect(payload.data.system_role).toBe("platform_admin");
});
