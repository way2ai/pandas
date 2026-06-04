import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import AppPage from "./page";

test("renders app navigation links", () => {
  render(<AppPage />);

  expect(screen.getByRole("link", { name: "Tenant Area" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenant Members" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Area" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Users" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Admin Tenants" })).toBeInTheDocument();
});
