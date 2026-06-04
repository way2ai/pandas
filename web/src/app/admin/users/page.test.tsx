import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import AdminUsersPage from "./page";

test("renders user actions and admin navigation links", () => {
  render(<AdminUsersPage />);

  expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Admin" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View Tenants" })).toBeInTheDocument();
});
