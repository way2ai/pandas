import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import LoginPage from "./page";

test("renders login form", () => {
  render(<LoginPage />);

  expect(screen.getByLabelText("Email or username")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
});
