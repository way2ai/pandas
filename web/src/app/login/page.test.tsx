import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import LoginPage from "./page";

const push = vi.fn();
const jsonHeaders = {
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function requestUrl(input: string | URL | Request) {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  push.mockReset();
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (requestUrl(input) === "/api/auth/me") {
      return jsonResponse(
        {
          error: {
            code: "unauthenticated",
            message: "missing session",
          },
        },
        401,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "unexpected_request",
          message: "unexpected_request",
        },
      },
      500,
    );
  });
});

test("renders login form", () => {
  render(<LoginPage />);

  expect(screen.getByLabelText("Email or username")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
});

test("does not submit when identifier or password is blank", async () => {
  render(<LoginPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: "   " },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form") as HTMLFormElement);

  expect(await screen.findByRole("alert")).toHaveTextContent("Email or username and password are required.");
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

test("clears local validation errors when the user edits the form", async () => {
  render(<LoginPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form") as HTMLFormElement);
  expect(await screen.findByRole("alert")).toHaveTextContent("Email or username and password are required.");

  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: "admin@example.com" },
  });

  await waitFor(() => {
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

test("submits credentials and redirects platform admins to the admin area", async () => {
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    const url = requestUrl(input);
    if (url === "/api/auth/me") {
      return jsonResponse(
        {
          error: {
            code: "unauthenticated",
            message: "missing session",
          },
        },
        401,
      );
    }

    if (url === "/api/auth/login") {
      return jsonResponse(
        {
          trace_id: "trace-123",
          data: {
            email: "admin@example.com",
            system_role: "platform_admin",
          },
        },
        200,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "unexpected_request",
          message: "unexpected_request",
        },
      },
      500,
    );
  });

  render(<LoginPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: "  admin@example.com  " },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "  password123  " },
  });
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form") as HTMLFormElement);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifier: "admin@example.com",
          password: "password123",
        }),
      }),
    );
  });
  await waitFor(() => {
    expect(push).toHaveBeenCalledWith("/admin");
  });
});

test("redirects immediately when a valid session already exists", async () => {
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    if (requestUrl(input) === "/api/auth/me") {
      return jsonResponse(
        {
          data: {
            email: "member@example.com",
            system_role: "tenant_member",
          },
        },
        200,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "unexpected_request",
          message: "unexpected_request",
        },
      },
      500,
    );
  });

  render(<LoginPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });
  expect(push).toHaveBeenCalledWith("/app");
});

test("shows the API error message when login fails", async () => {
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    const url = requestUrl(input);
    if (url === "/api/auth/me") {
      return jsonResponse(
        {
          error: {
            code: "unauthenticated",
            message: "missing session",
          },
        },
        401,
      );
    }

    if (url === "/api/auth/login") {
      return jsonResponse(
        {
          error: {
            code: "invalid_credentials",
            message: "invalid_credentials",
          },
        },
        401,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "unexpected_request",
          message: "unexpected_request",
        },
      },
      500,
    );
  });

  render(<LoginPage />);

  await waitFor(() => {
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong-password" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form") as HTMLFormElement);

  expect(await screen.findByRole("alert")).toHaveTextContent("invalid_credentials");
});
