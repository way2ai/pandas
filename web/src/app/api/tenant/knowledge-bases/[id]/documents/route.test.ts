import { afterEach, expect, test, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies tenant knowledge-base document list requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "doc-tenant-1", name: "https://example.com/handbook" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await GET(
    new Request("http://localhost:3000/api/tenant/knowledge-bases/kb-tenant-1/documents", {
      headers: { cookie: "platform_session=session-123" },
    }),
    { params: Promise.resolve({ id: "kb-tenant-1" }) },
  );

  const payload = await response.json();
  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/knowledge-bases/kb-tenant-1/documents",
    expect.objectContaining({ method: "GET" }),
  );
  expect(payload.data[0].id).toBe("doc-tenant-1");
});

test("proxies tenant knowledge-base document create requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "doc-tenant-2", name: "Support FAQ" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/tenant/knowledge-bases/kb-tenant-1/documents", {
      method: "POST",
      headers: { cookie: "platform_session=session-123", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Support FAQ", source_type: "file" }),
    }),
    { params: Promise.resolve({ id: "kb-tenant-1" }) },
  );

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/tenant/knowledge-bases/kb-tenant-1/documents",
    expect.objectContaining({ method: "POST" }),
  );
  expect(response.status).toBe(201);
});
