import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies logout requests and forwards the upstream cookie clearing header", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-logout",
        data: {
          status: "logged_out",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "platform_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
        },
      },
    ),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        cookie: "platform_session=session-123",
      },
    }),
  );
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/auth/logout",
    expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "platform_session=session-123",
      },
    }),
  );
  expect(response.headers.get("set-cookie")).toContain("platform_session=");
  expect(payload.data.status).toBe("logged_out");
});
