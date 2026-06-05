import { afterEach, expect, test, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies tenant knowledge-base build list requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "build-kb-tenant-1", status: "ready" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await GET(
    new Request("http://localhost:3000/api/tenant/knowledge-bases/kb-tenant-1/builds", {
      headers: { cookie: "platform_session=session-123" },
    }),
    { params: Promise.resolve({ id: "kb-tenant-1" }) },
  );

  const payload = await response.json();
  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/knowledge-bases/kb-tenant-1/builds",
    expect.objectContaining({ method: "GET" }),
  );
  expect(payload.data[0].status).toBe("ready");
});

test("proxies tenant knowledge-base build create requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "build-kb-tenant-2", status: "queued" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/tenant/knowledge-bases/kb-tenant-1/builds", {
      method: "POST",
      headers: { cookie: "platform_session=session-123" },
    }),
    { params: Promise.resolve({ id: "kb-tenant-1" }) },
  );

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/knowledge-bases/kb-tenant-1/builds",
    expect.objectContaining({ method: "POST" }),
  );
  expect(response.status).toBe(201);
});
