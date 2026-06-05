import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import TenantPage from "./page";

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

test("renders tenant navigation links and fetched tenant area", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          area: "tenant",
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

  render(<TenantPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tenant/home", expect.objectContaining({ cache: "no-store" }));
  });
  expect(screen.getByRole("heading", { name: "Tenant Home" })).toBeInTheDocument();
  expect(await screen.findByText("Area: tenant")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Knowledge Bases" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Members" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to App" })).toBeInTheDocument();
});

test("shows loading and error states when tenant home cannot be loaded", async () => {
  const pending = deferredResponse();
  vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

  render(<TenantPage />);

  expect(screen.getByText("Loading tenant home...")).toBeInTheDocument();

  pending.resolve(
    new Response(
      JSON.stringify({
        error: {
          message: "tenant_home_unavailable",
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

  expect(await screen.findByRole("alert")).toHaveTextContent("tenant_home_unavailable");
  expect(screen.getByText("Area: Unavailable")).toBeInTheDocument();
});
