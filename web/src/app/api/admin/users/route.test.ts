import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin users requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-users",
        data: [{ email: "ops@example.com", username: "ops", system_role: "platform_admin", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const request = new Request("http://localhost:3000/api/admin/users", {
    method: "GET",
    headers: {
      cookie: "platform_session=session-123",
    },
  });

  const response = await GET(request);
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/users",
    expect.objectContaining({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: "platform_session=session-123",
      },
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data[0].email).toBe("ops@example.com");
});
