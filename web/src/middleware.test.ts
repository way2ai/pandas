import { NextRequest } from "next/server";
import { expect, test } from "vitest";

import { middleware } from "./middleware";
import { SESSION_COOKIE_NAME } from "./lib/session";

test("redirects unauthenticated protected requests to login", () => {
  const request = new NextRequest("http://localhost/app");

  const response = middleware(request);

  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost/login");
});

test("allows protected requests with a session cookie", () => {
  const request = new NextRequest("http://localhost/admin", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=session-123`,
    },
  });

  const response = middleware(request);

  expect(response.headers.get("x-middleware-next")).toBe("1");
});
