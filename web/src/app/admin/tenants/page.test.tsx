import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import AdminTenantsPage from "./page";

test("renders tenant table", () => {
  render(<AdminTenantsPage />);

  expect(screen.getByRole("heading", { name: "Tenants" })).toBeInTheDocument();
  expect(screen.getByText("tenant-demo")).toBeInTheDocument();
  expect(screen.getByText("Demo Tenant")).toBeInTheDocument();
  expect(screen.getByText("active")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Admin" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View Users" })).toBeInTheDocument();
});
