import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies auth me requests to the API and forwards cookies", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-me",
        data: {
          email: "admin@example.com",
          system_role: "platform_admin",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const response = await GET(
    new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers: {
        cookie: "platform_session=session-123",
      },
    }),
  );
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/auth/me",
    expect.objectContaining({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: "platform_session=session-123",
      },
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data.email).toBe("admin@example.com");
});
