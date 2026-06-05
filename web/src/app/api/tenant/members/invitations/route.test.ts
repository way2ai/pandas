import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies tenant invitation requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-invite",
        data: { status: "invited" },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const body = JSON.stringify({
    email: "new@example.com",
    role: "tenant_admin",
  });
  const response = await POST(
    new Request("http://localhost:3000/api/tenant/members/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    }),
  );
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/members/invitations",
    expect.objectContaining({
      method: "POST",
      body,
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data.status).toBe("invited");
});
