import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies retry requests through the shared admin build action proxy", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "build-kb-personal-failed", status: "queued" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/admin/builds/build-kb-personal-failed/retry", { method: "POST" }),
    { params: Promise.resolve({ id: "build-kb-personal-failed" }) },
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.data.status).toBe("queued");
});
