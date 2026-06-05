"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { KnowledgeBuildTask } from "../../../lib/knowledge-bases";

export default function AdminBuildsPage() {
  const [builds, setBuilds] = useState<KnowledgeBuildTask[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingBuildID, setPendingBuildID] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBuilds() {
      try {
        const response = await fetch("/api/admin/builds", { cache: "no-store" });
        const payload = (await response.json()) as {
          data?: KnowledgeBuildTask[];
          error?: { message?: string };
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(payload.error?.message ?? "Unable to load admin builds.");
          setBuilds([]);
          return;
        }

        setBuilds(payload.data ?? []);
        setErrorMessage("");
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load admin builds.");
          setBuilds([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBuilds();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuildAction(build: KnowledgeBuildTask, action: "retry" | "cancel") {
    setPendingBuildID(build.id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/builds/${encodeURIComponent(build.id)}/${action}`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: KnowledgeBuildTask;
        error?: { message?: string };
      };

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? `Unable to ${action} build.`);
        return;
      }

      if (!payload.data) {
        setErrorMessage(`Unable to ${action} build.`);
        return;
      }

      setBuilds((current) =>
        current.map((candidate) => (candidate.id === payload.data?.id ? payload.data : candidate)),
      );
    } catch {
      setErrorMessage(`Unable to ${action} build.`);
    } finally {
      setPendingBuildID("");
    }
  }

  function renderAction(build: KnowledgeBuildTask) {
    const isPending = pendingBuildID === build.id;
    if (build.status === "failed" || build.status === "cancelled") {
      return (
        <button type="button" onClick={() => void handleBuildAction(build, "retry")} disabled={isPending}>
          {isPending ? "Updating..." : "Retry"}
        </button>
      );
    }
    if (build.status === "queued" || build.status === "processing") {
      return (
        <button type="button" onClick={() => void handleBuildAction(build, "cancel")} disabled={isPending}>
          {isPending ? "Updating..." : "Cancel"}
        </button>
      );
    }
    return <span>Completed</span>;
  }

  return (
    <main>
      <h1>Build Tasks</h1>
      <nav aria-label="Build administration navigation">
        <Link href="/admin">Back to Admin</Link>
        {" | "}
        <Link href="/admin/knowledge-bases">Knowledge Bases</Link>
      </nav>
      {isLoading ? <p>Loading build tasks...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {builds.length === 0 && !isLoading ? <p>No build tasks found.</p> : null}
      {builds.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Knowledge Base</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Trigger</th>
              <th>Documents</th>
              <th>Last Error</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {builds.map((build) => (
              <tr key={build.id}>
                <td>{build.id}</td>
                <td>{build.knowledge_base_id}</td>
                <td>{build.scope}</td>
                <td>{build.status}</td>
                <td>{build.trigger}</td>
                <td>{build.document_count}</td>
                <td>{build.last_error ?? "-"}</td>
                <td>{renderAction(build)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
