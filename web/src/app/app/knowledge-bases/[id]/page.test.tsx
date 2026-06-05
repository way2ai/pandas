import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AppKnowledgeBaseDetailPage from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders app knowledge-base documents and queues a build", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "doc-personal-1", name: "notes.md", source_type: "file", status: "ready" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "build-kb-personal-1", status: "ready", document_count: 1 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "doc-personal-2", name: "draft.md", source_type: "file", status: "pending_build" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "build-kb-personal-2", status: "queued", document_count: 2 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

  render(<AppKnowledgeBaseDetailPage params={Promise.resolve({ id: "kb-personal-1" })} />);

  expect(await screen.findByText(/notes.md - file - ready/i)).toBeInTheDocument();
  expect(screen.getByText(/build-kb-personal-1 - ready - 1 docs/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Document Name"), { target: { value: "draft.md" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Document" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/app/knowledge-bases/kb-personal-1/documents",
      expect.objectContaining({ method: "POST" }),
    );
  });
  expect(await screen.findByText(/draft.md - file - pending_build/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Queue Build" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/app/knowledge-bases/kb-personal-1/builds",
      expect.objectContaining({ method: "POST" }),
    );
  });
  expect(await screen.findByText(/build-kb-personal-2 - queued - 2 docs/i)).toBeInTheDocument();
});
