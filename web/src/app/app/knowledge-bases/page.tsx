"use client";

import { FormEvent, useEffect, useState } from "react";

import { useSession } from "../../session-shell";
import type { KnowledgeBase } from "../../../lib/knowledge-bases";

export default function AppKnowledgeBasesPage() {
  const session = useSession();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeBaseName, setKnowledgeBaseName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadKnowledgeBases() {
      try {
        const response = await fetch("/api/app/knowledge-bases", { cache: "no-store" });
        const payload = (await response.json()) as {
          data?: KnowledgeBase[];
          error?: { message?: string };
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(payload.error?.message ?? "Unable to load app knowledge bases.");
          setKnowledgeBases([]);
          return;
        }

        setKnowledgeBases(payload.data ?? []);
        setErrorMessage("");
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load app knowledge bases.");
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
      const response = await fetch("/api/app/knowledge-bases", {
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
        setErrorMessage(payload.error?.message ?? "Unable to create knowledge base.");
        return;
      }

      setKnowledgeBases((current) => [...current, payload.data as KnowledgeBase]);
      setKnowledgeBaseName("");
      setErrorMessage("");
    } catch {
      setErrorMessage("Unable to create knowledge base.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canCreatePersonalKnowledgeBase = session?.system_role === "personal_user";

  return (
    <main>
      <h1>App Knowledge Bases</h1>
      <p>Use knowledge bases available in your personal workspace or tenant access scope.</p>
      <p>
        <a href="/app">Back to App</a>
      </p>
      {isLoading ? <p>Loading app knowledge bases...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {canCreatePersonalKnowledgeBase ? (
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
            {isSubmitting ? "Creating..." : "Create Personal Knowledge Base"}
          </button>
        </form>
      ) : (
        <p>Personal knowledge-base creation is only available in personal workspaces.</p>
      )}
      {knowledgeBases.length === 0 && !isLoading ? <p>No app knowledge bases found.</p> : null}
      {knowledgeBases.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Access</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {knowledgeBases.map((knowledgeBase) => (
              <tr key={knowledgeBase.id}>
                <td>{knowledgeBase.name}</td>
                <td>{knowledgeBase.scope}</td>
                <td>{knowledgeBase.status}</td>
                <td>{knowledgeBase.access_role}</td>
                <td>
                  <a href={`/app/knowledge-bases/${knowledgeBase.id}`}>Open</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
