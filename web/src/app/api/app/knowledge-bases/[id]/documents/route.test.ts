import { afterEach, expect, test, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies app knowledge-base document list requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "doc-personal-1", name: "notes.md" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await GET(
    new Request("http://localhost:3000/api/app/knowledge-bases/kb-personal-1/documents", {
      headers: { cookie: "platform_session=session-123" },
    }),
    { params: Promise.resolve({ id: "kb-personal-1" }) },
  );

  const payload = await response.json();
  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/app/knowledge-bases/kb-personal-1/documents",
    expect.objectContaining({ method: "GET" }),
  );
  expect(payload.data[0].name).toBe("notes.md");
});

test("proxies app knowledge-base document create requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "doc-personal-2", name: "draft.md" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/app/knowledge-bases/kb-personal-1/documents", {
      method: "POST",
      headers: { cookie: "platform_session=session-123", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "draft.md", source_type: "file" }),
    }),
    { params: Promise.resolve({ id: "kb-personal-1" }) },
  );

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/app/knowledge-bases/kb-personal-1/documents",
    expect.objectContaining({ method: "POST" }),
  );
  expect(response.status).toBe(201);
});
