import { afterEach, expect, test, vi } from "vitest";

import { GET, POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies app knowledge-base build list requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: "build-kb-personal-1", status: "queued" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await GET(
    new Request("http://localhost:3000/api/app/knowledge-bases/kb-personal-1/builds", {
      headers: { cookie: "platform_session=session-123" },
    }),
    { params: Promise.resolve({ id: "kb-personal-1" }) },
  );

  const payload = await response.json();
  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/app/knowledge-bases/kb-personal-1/builds",
    expect.objectContaining({ method: "GET" }),
  );
  expect(payload.data[0].status).toBe("queued");
});

test("proxies app knowledge-base build create requests", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { id: "build-kb-personal-2", status: "queued" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const response = await POST(
    new Request("http://localhost:3000/api/app/knowledge-bases/kb-personal-1/builds", {
      method: "POST",
      headers: { cookie: "platform_session=session-123" },
    }),
    { params: Promise.resolve({ id: "kb-personal-1" }) },
  );

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/app/knowledge-bases/kb-personal-1/builds",
    expect.objectContaining({ method: "POST" }),
  );
  expect(response.status).toBe(201);
});
