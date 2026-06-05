import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import TenantKnowledgeBaseDetailPage from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders tenant knowledge-base documents and queues a tenant build", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "doc-tenant-1", name: "https://example.com/handbook", source_type: "url", status: "ready" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "build-kb-tenant-1", status: "ready", document_count: 1 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "doc-tenant-2", name: "Support FAQ", source_type: "file", status: "pending_build" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "build-kb-tenant-2", status: "queued", document_count: 2 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

  render(<TenantKnowledgeBaseDetailPage params={Promise.resolve({ id: "kb-tenant-1" })} />);

  expect(await screen.findByText(/https:\/\/example.com\/handbook - url - ready/i)).toBeInTheDocument();
  expect(screen.getByText(/build-kb-tenant-1 - ready - 1 docs/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Document Name"), { target: { value: "Support FAQ" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Tenant Document" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/tenant/knowledge-bases/kb-tenant-1/documents",
      expect.objectContaining({ method: "POST" }),
    );
  });
  expect(await screen.findByText(/Support FAQ - file - pending_build/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Queue Tenant Build" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/tenant/knowledge-bases/kb-tenant-1/builds",
      expect.objectContaining({ method: "POST" }),
    );
  });
  expect(await screen.findByText(/build-kb-tenant-2 - queued - 2 docs/i)).toBeInTheDocument();
});
