import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin tenants requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-tenants",
        data: [{ id: "tenant-acme", name: "Acme", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const response = await GET(new Request("http://localhost:3000/api/admin/tenants", { method: "GET" }));
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/tenants",
    expect.objectContaining({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data[0].id).toBe("tenant-acme");
});
