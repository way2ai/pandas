import { afterEach, expect, test, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

test("proxies admin home requests to the API", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          area: "admin",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  const response = await GET(new Request("http://localhost:3000/api/admin/home", { method: "GET" }));
  const payload = await response.json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/admin/home",
    expect.objectContaining({
      method: "GET",
    }),
  );
  expect(payload.data.area).toBe("admin");
});
