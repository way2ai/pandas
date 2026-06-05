import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { SessionShell } from "./session-shell";

const push = vi.fn();
let pathname = "/app";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
  usePathname: () => pathname,
}));

afterEach(() => {
  pathname = "/app";
  push.mockReset();
  vi.restoreAllMocks();
});

test("loads and displays the current signed-in user", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: {
          email: "admin@example.com",
          system_role: "platform_admin",
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

  render(
    <SessionShell>
      <main>Shell Content</main>
    </SessionShell>,
  );

  expect(screen.getByText("Shell Content")).toBeInTheDocument();
  expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
  expect(screen.getByText("platform_admin")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "App" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tenant" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
});

test("logs the user out and redirects to login", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            email: "admin@example.com",
            system_role: "platform_admin",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            status: "logged_out",
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

  render(
    <SessionShell>
      <main>Shell Content</main>
    </SessionShell>,
  );

  await screen.findByText("admin@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
  expect(push).toHaveBeenCalledWith("/login");
});

test("redirects protected routes to login when the session lookup fails", async () => {
  pathname = "/tenant";

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        error: {
          code: "unauthenticated",
          message: "missing session",
        },
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  render(
    <SessionShell>
      <main>Shell Content</main>
    </SessionShell>,
  );

  await waitFor(() => {
    expect(push).toHaveBeenCalledWith("/login");
  });
});

test("redirects users to their allowed area when they open the wrong protected route", async () => {
  pathname = "/admin";

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: {
          email: "member@example.com",
          system_role: "tenant_member",
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

  render(
    <SessionShell>
      <main>Shell Content</main>
    </SessionShell>,
  );

  await waitFor(() => {
    expect(push).toHaveBeenCalledWith("/app");
  });
});

test("shows only the allowed navigation links for tenant admins", async () => {
  pathname = "/tenant";

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: {
          email: "tenant-admin@example.com",
          system_role: "tenant_admin",
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

  render(
    <SessionShell>
      <main>Shell Content</main>
    </SessionShell>,
  );

  expect(await screen.findByText("tenant-admin@example.com")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "App" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenant" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
});
