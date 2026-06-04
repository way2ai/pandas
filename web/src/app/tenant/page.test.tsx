import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import TenantPage from "./page";

test("renders tenant navigation links", () => {
  render(<TenantPage />);

  expect(screen.getByRole("heading", { name: "Tenant Home" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Members" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to App" })).toBeInTheDocument();
});
