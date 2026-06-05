import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies cancel requests through the shared admin build action proxy", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "build-kb-tenant-queued", status: "cancelled" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/admin/builds/build-kb-tenant-queued/cancel", { method: "POST" }),
    { params: Promise.resolve({ id: "build-kb-tenant-queued" }) },
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.data.status).toBe("cancelled");
});
