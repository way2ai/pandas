import { afterEach, expect, test, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies tenant knowledge-base list requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "kb-tenant-1", name: "Tenant Handbook" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const request = new Request("http://localhost:3000/api/tenant/knowledge-bases", {
    method: "GET",
    headers: { cookie: "platform_session=session-123" },
  });

  const response = await GET(request);
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/knowledge-bases",
    expect.objectContaining({
      method: "GET",
      headers: { "Content-Type": "application/json", cookie: "platform_session=session-123" },
    }),
  );
  expect(response.status).toBe(200);
  expect(payload.data[0].name).toBe("Tenant Handbook");
});

test("proxies tenant knowledge-base create requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "kb-tenant-2", name: "Support Playbooks" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const request = new Request("http://localhost:3000/api/tenant/knowledge-bases", {
    method: "POST",
    headers: { cookie: "platform_session=session-123", "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Support Playbooks" }),
  });

  const response = await POST(request);
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/knowledge-bases",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Support Playbooks" }),
    }),
  );
  expect(response.status).toBe(201);
  expect(payload.data.name).toBe("Support Playbooks");
});
