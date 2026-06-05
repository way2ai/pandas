import { afterEach, expect, test, vi } from "vitest";

import { updateUserStatus } from "./status-proxy";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin user status updates to the matching API path", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        trace_id: "trace-status",
        data: { identifier: "ops@example.com", status: "disabled" },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const response = await updateUserStatus(
    new Request("http://localhost:3000/api/admin/users/ops@example.com/disable", {
      method: "POST",
    }),
    "ops@example.com",
    "disabled",
  );
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/users/ops%40example.com/disable",
    expect.objectContaining({
      method: "POST",
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data.status).toBe("disabled");
});
