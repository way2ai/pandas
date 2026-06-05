import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import TenantMembersPage from "./page";

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

test("renders tenant members form and table from fetched data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          { email: "alpha@example.com", role: "tenant_member", status: "active" },
          { email: "beta@example.com", role: "tenant_admin", status: "invited" },
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

  render(<TenantMembersPage />);

  expect(screen.getByLabelText("Invite email")).toBeInTheDocument();
  expect(screen.getByLabelText("Role")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send invite" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "Back to Tenant" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to App" })).toBeInTheDocument();

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tenant/members", expect.objectContaining({ cache: "no-store" }));
  });
  expect(await screen.findByText("alpha@example.com")).toBeInTheDocument();
  expect(screen.getByText("beta@example.com")).toBeInTheDocument();
  expect(screen.getByText("invited")).toBeInTheDocument();
});

test("shows loading state before members are loaded", async () => {
  const pending = deferredResponse();
  vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

  render(<TenantMembersPage />);

  expect(screen.getByText("Loading tenant members...")).toBeInTheDocument();

  pending.resolve(
    new Response(
      JSON.stringify({
        data: [{ email: "alpha@example.com", role: "tenant_member", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  expect(await screen.findByText("alpha@example.com")).toBeInTheDocument();
});

test("shows an empty state when there are no tenant members", async () => {
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

  render(<TenantMembersPage />);

  expect(await screen.findByText("No tenant members found.")).toBeInTheDocument();
});

test("does not submit an invitation when the email is blank", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: [{ email: "alpha@example.com", role: "tenant_member", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  render(<TenantMembersPage />);

  await screen.findByText("alpha@example.com");
  fireEvent.change(screen.getByLabelText("Invite email"), {
    target: { value: "   " },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Send invite" }).closest("form") as HTMLFormElement);

  expect(await screen.findByRole("alert")).toHaveTextContent("Invite email is required.");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("clears local invite validation errors when the user edits the form", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: [{ email: "alpha@example.com", role: "tenant_member", status: "active" }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  render(<TenantMembersPage />);

  await screen.findByText("alpha@example.com");
  fireEvent.submit(screen.getByRole("button", { name: "Send invite" }).closest("form") as HTMLFormElement);
  expect(await screen.findByRole("alert")).toHaveTextContent("Invite email is required.");

  fireEvent.change(screen.getByLabelText("Invite email"), {
    target: { value: "new@example.com" },
  });

  await waitFor(() => {
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("submits an invitation and appends the invited member to the list", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ email: "alpha@example.com", role: "tenant_member", status: "active" }],
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
          data: { status: "invited" },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

  render(<TenantMembersPage />);

  await screen.findByText("alpha@example.com");
  fireEvent.change(screen.getByLabelText("Invite email"), {
    target: { value: "  new@example.com  " },
  });
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "tenant_admin" },
  });
  expect(screen.getByRole("button", { name: "Send invite" })).toBeEnabled();
  fireEvent.submit(screen.getByRole("button", { name: "Send invite" }).closest("form") as HTMLFormElement);

  expect(screen.getByRole("button", { name: "Sending invite..." })).toBeDisabled();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tenant/members/invitations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          role: "tenant_admin",
        }),
      }),
    );
  });
  expect(await screen.findByText("new@example.com")).toBeInTheDocument();
  expect(screen.getAllByText("tenant_admin").length).toBeGreaterThan(0);
  expect(screen.getAllByText("invited").length).toBeGreaterThan(0);
});

test("shows an error message when the invitation fails", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ email: "alpha@example.com", role: "tenant_member", status: "active" }],
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
          error: { message: "invite_failed" },
        }),
        {
          status: 422,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

  render(<TenantMembersPage />);

  await screen.findByText("alpha@example.com");
  fireEvent.change(screen.getByLabelText("Invite email"), {
    target: { value: "new@example.com" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Send invite" }).closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tenant/members/invitations",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("invite_failed");
  expect(screen.queryByText("new@example.com")).not.toBeInTheDocument();
});
