import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import AdminPage from "./page";

test("renders admin navigation links", () => {
  render(<AdminPage />);

  expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tenants" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to App" })).toBeInTheDocument();
});
