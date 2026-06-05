import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin build-list requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "build-kb-tenant-1", status: "ready" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const request = new Request("http://localhost:3000/api/admin/builds", {
    method: "GET",
    headers: { cookie: "platform_session=session-123" },
  });

  const response = await GET(request);
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/builds",
    expect.objectContaining({ method: "GET" }),
  );
  expect(response.status).toBe(200);
  expect(payload.data[0].id).toBe("build-kb-tenant-1");
});
