import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AdminKnowledgeBasesPage from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders admin knowledge-base metadata from fetched data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          { id: "kb-personal-1", name: "Personal Notes", scope: "personal", status: "ready", owner_email: "user@example.com" },
          { id: "kb-tenant-1", name: "Tenant Handbook", scope: "tenant", status: "ready", tenant_id: "tenant-demo" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  render(<AdminKnowledgeBasesPage />);

  expect(await screen.findByText("Personal Notes")).toBeInTheDocument();
  expect(screen.getByText("Tenant Handbook")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Admin" })).toBeInTheDocument();
});
