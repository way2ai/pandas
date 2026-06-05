import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AppPage from "./page";
import * as sessionShell from "../session-shell";

afterEach(() => {
  vi.restoreAllMocks();
});

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

test("renders app area and only the links allowed for platform admins", async () => {
  vi.spyOn(sessionShell, "useSession").mockReturnValue({
    email: "admin@example.com",
    system_role: "platform_admin",
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          area: "app",
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

  render(<AppPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/app/home", expect.objectContaining({ cache: "no-store" }));
  });
  expect(await screen.findByText("Area: app")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "App Knowledge Bases" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tenant Area" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tenant Members" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Area" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Users" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Tenants" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Knowledge Bases" })).toBeInTheDocument();
});

test("shows loading and error states when app home cannot be loaded", async () => {
  vi.spyOn(sessionShell, "useSession").mockReturnValue({
    email: "member@example.com",
    system_role: "personal_user",
  });
  const pending = deferredResponse();
  vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

  render(<AppPage />);

  expect(screen.getByText("Loading app home...")).toBeInTheDocument();

  pending.resolve(
    new Response(
      JSON.stringify({
        error: {
          message: "app_home_unavailable",
        },
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("app_home_unavailable");
  expect(screen.getByText("Area: Unavailable")).toBeInTheDocument();
});

test("shows only tenant links for tenant admins and hides admin links", async () => {
  vi.spyOn(sessionShell, "useSession").mockReturnValue({
    email: "tenant-admin@example.com",
    system_role: "tenant_admin",
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          area: "app",
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

  render(<AppPage />);

  expect(await screen.findByText("Area: app")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "App Knowledge Bases" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenant Area" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenant Members" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenant Knowledge Bases" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin Area" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin Users" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin Tenants" })).not.toBeInTheDocument();
});

test("hides privileged links for personal users", async () => {
  vi.spyOn(sessionShell, "useSession").mockReturnValue({
    email: "person@example.com",
    system_role: "personal_user",
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          area: "app",
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

  render(<AppPage />);

  expect(await screen.findByText("Area: app")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "App Knowledge Bases" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tenant Area" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tenant Members" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin Area" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin Users" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Admin Tenants" })).not.toBeInTheDocument();
});
