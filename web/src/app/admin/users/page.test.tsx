import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AdminUsersPage from "./page";

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

test("renders user actions and admin navigation links from fetched data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          { email: "ops@example.com", username: "ops", system_role: "platform_admin", status: "active" },
          { email: "analyst@example.com", username: "analyst", system_role: "personal_user", status: "disabled" },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  render(<AdminUsersPage />);

  expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Admin" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View Tenants" })).toBeInTheDocument();

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({ cache: "no-store" }));
  });
  expect(await screen.findByText("ops@example.com")).toBeInTheDocument();
  expect(screen.getByText("analyst@example.com")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
});

test("shows loading state before users are loaded", async () => {
  const pending = deferredResponse();
  vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

  render(<AdminUsersPage />);

  expect(screen.getByText("Loading users...")).toBeInTheDocument();

  pending.resolve(
    new Response(
      JSON.stringify({
        data: [{ email: "ops@example.com", username: "ops", system_role: "platform_admin", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  expect(await screen.findByText("ops@example.com")).toBeInTheDocument();
});

test("shows an empty state when there are no users", async () => {
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

  render(<AdminUsersPage />);

  expect(await screen.findByText("No users found.")).toBeInTheDocument();
});

test("updates user status after clicking the action button", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ email: "ops@example.com", username: "ops", system_role: "platform_admin", status: "active" }],
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
          data: { identifier: "ops@example.com", status: "disabled" },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

  render(<AdminUsersPage />);

  const emailCell = await screen.findByText("ops@example.com");
  const row = emailCell.closest("tr");
  if (!row) {
    throw new Error("expected user row");
  }

  fireEvent.click(within(row).getByRole("button", { name: "Disable" }));

  expect(within(row).getByRole("button", { name: "Updating..." })).toBeDisabled();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/users/ops%40example.com/disable",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
  expect(within(row).getByText("disabled")).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "Enable" })).toBeInTheDocument();
});

test("shows an error message when the status update fails", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ email: "ops@example.com", username: "ops", system_role: "platform_admin", status: "active" }],
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
          error: { message: "status_update_failed" },
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

  render(<AdminUsersPage />);

  const emailCell = await screen.findByText("ops@example.com");
  const row = emailCell.closest("tr");
  if (!row) {
    throw new Error("expected user row");
  }

  fireEvent.click(within(row).getByRole("button", { name: "Disable" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/users/ops%40example.com/disable",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("status_update_failed");
  expect(within(row).getByText("active")).toBeInTheDocument();
});
