import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import TenantKnowledgeBasesPage from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders tenant knowledge bases and creates a new tenant knowledge base", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "kb-tenant-1", name: "Tenant Handbook", status: "ready", access_role: "admin", tenant_id: "tenant-demo" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { id: "kb-tenant-2", name: "Support Playbooks", status: "pending_build", access_role: "admin", tenant_id: "tenant-demo" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

  render(<TenantKnowledgeBasesPage />);

  expect(await screen.findByText("Tenant Handbook")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Knowledge Base Name"), { target: { value: "Support Playbooks" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Tenant Knowledge Base" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tenant/knowledge-bases",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Support Playbooks" }),
      }),
    );
  });
  expect(await screen.findByText("Support Playbooks")).toBeInTheDocument();
});
