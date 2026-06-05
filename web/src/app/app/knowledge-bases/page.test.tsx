import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AppKnowledgeBasesPage from "./page";
import * as sessionShell from "../../session-shell";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders app knowledge bases and allows personal users to create one", async () => {
  vi.spyOn(sessionShell, "useSession").mockReturnValue({
    email: "user@example.com",
    system_role: "personal_user",
  });

  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "kb-personal-1", name: "Personal Notes", scope: "personal", status: "ready", access_role: "owner" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { id: "kb-personal-2", name: "Personal Drafts", scope: "personal", status: "pending_build", access_role: "owner" },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

  render(<AppKnowledgeBasesPage />);

  expect(await screen.findByText("Personal Notes")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Knowledge Base Name"), { target: { value: "Personal Drafts" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Personal Knowledge Base" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/app/knowledge-bases",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Personal Drafts" }),
      }),
    );
  });
  expect(await screen.findByText("Personal Drafts")).toBeInTheDocument();
});

test("hides personal knowledge-base creation for tenant members", async () => {
  vi.spyOn(sessionShell, "useSession").mockReturnValue({
    email: "member@example.com",
    system_role: "tenant_member",
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [{ id: "kb-tenant-1", name: "Tenant Handbook", scope: "tenant", status: "ready", access_role: "viewer" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  render(<AppKnowledgeBasesPage />);

  expect(await screen.findByText("Tenant Handbook")).toBeInTheDocument();
  expect(screen.getByText("Personal knowledge-base creation is only available in personal workspaces.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create Personal Knowledge Base" })).not.toBeInTheDocument();
});
