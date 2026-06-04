import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import TenantMembersPage from "./page";

test("renders tenant members form and table", () => {
  render(<TenantMembersPage />);

  expect(screen.getByLabelText("Invite email")).toBeInTheDocument();
  expect(screen.getByLabelText("Role")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send invite" })).toBeInTheDocument();
  expect(screen.getByText("member@example.com")).toBeInTheDocument();
  expect(screen.getByText("owner@example.com")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Tenant" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to App" })).toBeInTheDocument();
});
