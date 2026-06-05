import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies enable requests through the shared admin user status proxy", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { identifier: "ops@example.com", status: "active" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/admin/users/ops@example.com/enable", { method: "POST" }),
    { params: Promise.resolve({ identifier: "ops@example.com" }) },
  );
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.data.status).toBe("active");
});
