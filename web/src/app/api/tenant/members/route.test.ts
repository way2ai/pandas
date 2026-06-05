import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies tenant members requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-members",
        data: [{ email: "alpha@example.com", role: "tenant_member", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const response = await GET(new Request("http://localhost:3000/api/tenant/members", { method: "GET" }));
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/members",
    expect.objectContaining({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data[0].email).toBe("alpha@example.com");
});
