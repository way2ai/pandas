import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import AdminBuildsPage from "./page";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders admin build tasks from fetched data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          {
            id: "build-kb-tenant-1",
            knowledge_base_id: "kb-tenant-1",
            scope: "tenant",
            status: "ready",
            trigger: "seed",
            document_count: 1,
          },
          {
            id: "build-kb-personal-failed",
            knowledge_base_id: "kb-personal-1",
            scope: "personal",
            status: "failed",
            trigger: "manual",
            document_count: 2,
            last_error: "embedding_timeout",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  render(<AdminBuildsPage />);

  expect(await screen.findByText("build-kb-tenant-1")).toBeInTheDocument();
  expect(screen.getByText("build-kb-personal-failed")).toBeInTheDocument();
  expect(screen.getByText("embedding_timeout")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Admin" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Knowledge Bases" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  expect(screen.getByText("Completed")).toBeInTheDocument();
});

test("retries a failed build and updates its row", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "build-kb-personal-failed",
              knowledge_base_id: "kb-personal-1",
              scope: "personal",
              status: "failed",
              trigger: "manual",
              document_count: 1,
              last_error: "embedding_timeout",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "build-kb-personal-failed",
            knowledge_base_id: "kb-personal-1",
            scope: "personal",
            status: "queued",
            trigger: "retry",
            document_count: 1,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

  render(<AdminBuildsPage />);

  const retryButton = await screen.findByRole("button", { name: "Retry" });
  fireEvent.click(retryButton);

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/builds/build-kb-personal-failed/retry",
      expect.objectContaining({ method: "POST" }),
    );
  });
  expect(await screen.findByText("queued")).toBeInTheDocument();
  expect(screen.getByText("retry")).toBeInTheDocument();
});

test("cancels a queued build and updates its row", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "build-kb-tenant-queued",
              knowledge_base_id: "kb-tenant-1",
              scope: "tenant",
              status: "queued",
              trigger: "manual",
              document_count: 1,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "build-kb-tenant-queued",
            knowledge_base_id: "kb-tenant-1",
            scope: "tenant",
            status: "cancelled",
            trigger: "manual",
            document_count: 1,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

  render(<AdminBuildsPage />);

  const cancelButton = await screen.findByRole("button", { name: "Cancel" });
  fireEvent.click(cancelButton);

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/builds/build-kb-tenant-queued/cancel",
      expect.objectContaining({ method: "POST" }),
    );
  });
  expect(await screen.findByText("cancelled")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("shows action error when build retry fails", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "build-kb-personal-failed",
              knowledge_base_id: "kb-personal-1",
              scope: "personal",
              status: "failed",
              trigger: "manual",
              document_count: 1,
              last_error: "embedding_timeout",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "build_not_retryable" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

  render(<AdminBuildsPage />);

  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("build_not_retryable");
});
