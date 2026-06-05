"use client";

import { FormEvent, useEffect, useState } from "react";

import type { KnowledgeBase } from "../../../lib/knowledge-bases";

export default function TenantKnowledgeBasesPage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeBaseName, setKnowledgeBaseName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadKnowledgeBases() {
      try {
        const response = await fetch("/api/tenant/knowledge-bases", { cache: "no-store" });
        const payload = (await response.json()) as {
          data?: KnowledgeBase[];
          error?: { message?: string };
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(payload.error?.message ?? "Unable to load tenant knowledge bases.");
          setKnowledgeBases([]);
          return;
        }

        setKnowledgeBases(payload.data ?? []);
        setErrorMessage("");
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load tenant knowledge bases.");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = knowledgeBaseName.trim();
    if (!trimmedName) {
      setErrorMessage("Knowledge base name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tenant/knowledge-bases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });
      const payload = (await response.json()) as {
        data?: KnowledgeBase;
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error?.message ?? "Unable to create tenant knowledge base.");
        return;
      }

      setKnowledgeBases((current) => [...current, payload.data as KnowledgeBase]);
      setKnowledgeBaseName("");
      setErrorMessage("");
    } catch {
      setErrorMessage("Unable to create tenant knowledge base.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Tenant Knowledge Bases</h1>
      <p>Manage tenant-level knowledge bases and prepare them for later build and retrieval flows.</p>
      <p>
        <a href="/tenant">Back to Tenant</a>
      </p>
      {isLoading ? <p>Loading tenant knowledge bases...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Knowledge Base Name
          <input
            name="knowledgeBaseName"
            value={knowledgeBaseName}
            onChange={(event) => {
              setKnowledgeBaseName(event.target.value);
              setErrorMessage("");
            }}
          />
        </label>
        <button type="submit" disabled={isSubmitting || !knowledgeBaseName.trim()}>
          {isSubmitting ? "Creating..." : "Create Tenant Knowledge Base"}
        </button>
      </form>
      {knowledgeBases.length === 0 && !isLoading ? <p>No tenant knowledge bases found.</p> : null}
      {knowledgeBases.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Access</th>
              <th>Tenant</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {knowledgeBases.map((knowledgeBase) => (
              <tr key={knowledgeBase.id}>
                <td>{knowledgeBase.name}</td>
                <td>{knowledgeBase.status}</td>
                <td>{knowledgeBase.access_role}</td>
                <td>{knowledgeBase.tenant_id ?? "personal"}</td>
                <td>
                  <a href={`/tenant/knowledge-bases/${knowledgeBase.id}`}>Open</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
