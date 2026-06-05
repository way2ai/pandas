import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AdminTenantsPage from "./page";

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

test("renders tenant table from fetched data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [{ id: "tenant-acme", name: "Acme Corp", status: "suspended" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  render(<AdminTenantsPage />);

  expect(screen.getByRole("heading", { name: "Tenants" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Admin" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View Users" })).toBeInTheDocument();

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/tenants", expect.objectContaining({ cache: "no-store" }));
  });
  expect(await screen.findByText("tenant-acme")).toBeInTheDocument();
  expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  expect(screen.getByText("suspended")).toBeInTheDocument();
});

test("shows loading and error states when tenants cannot be loaded", async () => {
  const pending = deferredResponse();
  vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

  render(<AdminTenantsPage />);

  expect(screen.getByText("Loading tenants...")).toBeInTheDocument();

  pending.resolve(
    new Response(
      JSON.stringify({
        error: {
          message: "tenants_unavailable",
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

  expect(await screen.findByRole("alert")).toHaveTextContent("tenants_unavailable");
});

test("shows an empty state when there are no tenants", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  render(<AdminTenantsPage />);

  expect(await screen.findByText("No tenants found.")).toBeInTheDocument();
});
