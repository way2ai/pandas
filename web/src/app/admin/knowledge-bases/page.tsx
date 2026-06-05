"use client";

import { useEffect, useState } from "react";

import type { KnowledgeBase } from "../../../lib/knowledge-bases";

export default function AdminKnowledgeBasesPage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadKnowledgeBases() {
      try {
        const response = await fetch("/api/admin/knowledge-bases", { cache: "no-store" });
        const payload = (await response.json()) as {
          data?: KnowledgeBase[];
          error?: { message?: string };
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(payload.error?.message ?? "Unable to load admin knowledge bases.");
          setKnowledgeBases([]);
          return;
        }

        setKnowledgeBases(payload.data ?? []);
        setErrorMessage("");
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load admin knowledge bases.");
          setKnowledgeBases([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadKnowledgeBases();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Knowledge Bases</h1>
      <p>Review personal and tenant knowledge-base metadata from the admin surface.</p>
      <p>
        <a href="/admin">Back to Admin</a>
      </p>
      {isLoading ? <p>Loading admin knowledge bases...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {knowledgeBases.length === 0 && !isLoading ? <p>No knowledge bases found.</p> : null}
      {knowledgeBases.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {knowledgeBases.map((knowledgeBase) => (
              <tr key={knowledgeBase.id}>
                <td>{knowledgeBase.name}</td>
                <td>{knowledgeBase.scope}</td>
                <td>{knowledgeBase.status}</td>
                <td>{knowledgeBase.owner_email ?? knowledgeBase.tenant_id ?? "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
