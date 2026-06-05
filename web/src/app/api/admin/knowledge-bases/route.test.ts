import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin knowledge-base requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "kb-tenant-1", name: "Tenant Handbook" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const request = new Request("http://localhost:3000/api/admin/knowledge-bases", {
    method: "GET",
    headers: { cookie: "platform_session=session-123" },
  });

  const response = await GET(request);
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/knowledge-bases",
    expect.objectContaining({
      method: "GET",
      headers: { "Content-Type": "application/json", cookie: "platform_session=session-123" },
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data[0].name).toBe("Tenant Handbook");
});
