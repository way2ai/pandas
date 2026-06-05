import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AdminPage from "./page";

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

test("renders admin navigation links and fetched admin area", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
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

  render(<AdminPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/home", expect.objectContaining({ cache: "no-store" }));
  });
  expect(await screen.findByText("Area: admin")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenants" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Knowledge Bases" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Build Tasks" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to App" })).toBeInTheDocument();
});

test("shows loading and error states when admin home cannot be loaded", async () => {
  const pending = deferredResponse();
  vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

  render(<AdminPage />);

  expect(screen.getByText("Loading admin home...")).toBeInTheDocument();

  pending.resolve(
    new Response(
      JSON.stringify({
        error: {
          message: "admin_home_unavailable",
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

  expect(await screen.findByRole("alert")).toHaveTextContent("admin_home_unavailable");
  expect(screen.getByText("Area: Unavailable")).toBeInTheDocument();
});
