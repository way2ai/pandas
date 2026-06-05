"use client";

import { FormEvent, useEffect, useState } from "react";

import type { KnowledgeBuildTask, KnowledgeDocument } from "../../../../lib/knowledge-bases";

type TenantKnowledgeBaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function TenantKnowledgeBaseDetailPage({ params }: TenantKnowledgeBaseDetailPageProps) {
  const [knowledgeBaseID, setKnowledgeBaseID] = useState("");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [builds, setBuilds] = useState<KnowledgeBuildTask[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [sourceType, setSourceType] = useState("file");
  const [sourceURI, setSourceURI] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false);
  const [isSubmittingBuild, setIsSubmittingBuild] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      const resolvedParams = await params;
      if (cancelled) {
        return;
      }
      setKnowledgeBaseID(resolvedParams.id);

      try {
        const [documentsResponse, buildsResponse] = await Promise.all([
          fetch(`/api/tenant/knowledge-bases/${resolvedParams.id}/documents`, { cache: "no-store" }),
          fetch(`/api/tenant/knowledge-bases/${resolvedParams.id}/builds`, { cache: "no-store" }),
        ]);
        const documentsPayload = (await documentsResponse.json()) as {
          data?: KnowledgeDocument[];
          error?: { message?: string };
        };
        const buildsPayload = (await buildsResponse.json()) as {
          data?: KnowledgeBuildTask[];
          error?: { message?: string };
        };

        if (cancelled) {
          return;
        }

        if (!documentsResponse.ok) {
          setErrorMessage(documentsPayload.error?.message ?? "Unable to load tenant knowledge-base documents.");
          return;
        }
        if (!buildsResponse.ok) {
          setErrorMessage(buildsPayload.error?.message ?? "Unable to load tenant knowledge-base builds.");
          return;
        }

        setDocuments(documentsPayload.data ?? []);
        setBuilds(buildsPayload.data ?? []);
        setErrorMessage("");
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load tenant knowledge-base details.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [params]);

  async function handleDocumentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = documentName.trim();
    const trimmedURI = sourceURI.trim();
    if (!trimmedName || !sourceType) {
      setErrorMessage("Document name and source type are required.");
      return;
    }
    if (sourceType === "url" && !trimmedURI) {
      setErrorMessage("Source URI is required for url documents.");
      return;
    }

    setIsSubmittingDocument(true);
    try {
      const response = await fetch(`/api/tenant/knowledge-bases/${knowledgeBaseID}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, source_type: sourceType, source_uri: trimmedURI }),
      });
      const payload = (await response.json()) as {
        data?: KnowledgeDocument;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error?.message ?? "Unable to create tenant document.");
        return;
      }

      setDocuments((current) => [...current, payload.data as KnowledgeDocument]);
      setDocumentName("");
      setSourceURI("");
      setErrorMessage("");
    } catch {
      setErrorMessage("Unable to create tenant document.");
    } finally {
      setIsSubmittingDocument(false);
    }
  }

  async function handleQueueBuild() {
    setIsSubmittingBuild(true);
    try {
      const response = await fetch(`/api/tenant/knowledge-bases/${knowledgeBaseID}/builds`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: KnowledgeBuildTask;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error?.message ?? "Unable to queue tenant build.");
        return;
      }

      setBuilds((current) => [...current, payload.data as KnowledgeBuildTask]);
      setErrorMessage("");
    } catch {
      setErrorMessage("Unable to queue tenant build.");
    } finally {
      setIsSubmittingBuild(false);
    }
  }

  return (
    <main>
      <h1>Tenant Knowledge Base Detail</h1>
      <p>
        <a href="/tenant/knowledge-bases">Back to Tenant Knowledge Bases</a>
      </p>
      <p>Knowledge Base ID: {knowledgeBaseID || "Loading..."}</p>
      {isLoading ? <p>Loading tenant knowledge-base details...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <section>
        <h2>Documents</h2>
        <form onSubmit={(event) => void handleDocumentSubmit(event)}>
          <label>
            Document Name
            <input
              value={documentName}
              onChange={(event) => {
                setDocumentName(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>
          <label>
            Source Type
            <select
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value);
                setErrorMessage("");
              }}
            >
              <option value="file">file</option>
              <option value="url">url</option>
            </select>
          </label>
          <label>
            Source URI
            <input
              value={sourceURI}
              onChange={(event) => {
                setSourceURI(event.target.value);
                setErrorMessage("");
              }}
            />
          </label>
          <button type="submit" disabled={isSubmittingDocument || !documentName.trim()}>
            {isSubmittingDocument ? "Adding..." : "Add Tenant Document"}
          </button>
        </form>
        {documents.length === 0 && !isLoading ? <p>No documents found.</p> : null}
        {documents.length > 0 ? (
          <ul>
            {documents.map((document) => (
              <li key={document.id}>
                {document.name} - {document.source_type} - {document.status}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section>
        <h2>Builds</h2>
        <button type="button" onClick={() => void handleQueueBuild()} disabled={isSubmittingBuild || documents.length === 0}>
          {isSubmittingBuild ? "Queueing..." : "Queue Tenant Build"}
        </button>
        {builds.length === 0 && !isLoading ? <p>No builds found.</p> : null}
        {builds.length > 0 ? (
          <ul>
            {builds.map((build) => (
              <li key={build.id}>
                {build.id} - {build.status} - {build.document_count} docs
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
