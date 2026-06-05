import { afterEach, expect, test, vi } from "vitest";

import { updateBuildStatus } from "./action-proxy";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin build retry requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "build-kb-personal-failed", status: "queued" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const request = new Request("http://localhost:3000/api/admin/builds/build-kb-personal-failed/retry", {
    method: "POST",
    headers: { cookie: "platform_session=session-123" },
  });

  const response = await updateBuildStatus(request, "build-kb-personal-failed", "retry");
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/builds/build-kb-personal-failed/retry",
    expect.objectContaining({ method: "POST" }),
  );
  expect(response.status).toBe(200);
  expect(payload.data.status).toBe("queued");
});
