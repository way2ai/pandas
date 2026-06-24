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
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Tenant Knowledge Detail</span>
          <h1 className="hero__title">Tenant Knowledge Base Detail</h1>
          <p className="hero__description">租户详情页需要同时承接文档来源、构建队列和多人协作带来的治理视角。</p>
          <div className="section-actions">
            <a className="eyebrow-link" href="/tenant/knowledge-bases">
              Back to Tenant Knowledge Bases
            </a>
            {isLoading ? <span className="status-pill">Loading tenant knowledge-base details...</span> : <span className="status-pill">Tenant build lane active</span>}
          </div>
          <p>Knowledge Base ID: {knowledgeBaseID || "Loading..."}</p>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>{documents.length}</strong>
            <p>document(s) ready for tenant-wide retrieval or pending build.</p>
          </article>
          <article className="metric">
            <strong>{builds.length}</strong>
            <p>build event(s) available for operational review.</p>
          </article>
          <article className="metric">
            <strong>{documents.some((document) => document.source_type === "url") ? "URL" : "FILE"}</strong>
            <p>该页天然适合同时承接 URL 抓取与文件上传两类来源。</p>
          </article>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Source intake</span>
            <h2 className="section__title">Documents</h2>
          </div>
          <form className="form-grid form-grid--inline" onSubmit={(event) => void handleDocumentSubmit(event)}>
            <label>
              Document Name
              <input
                value={documentName}
                onChange={(event) => {
                  setDocumentName(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Support FAQ"
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
                placeholder="https://example.com/handbook"
              />
            </label>
            <div className="inline-actions">
              <button className="button button--primary" type="submit" disabled={isSubmittingDocument || !documentName.trim()}>
                {isSubmittingDocument ? "Adding..." : "Add Tenant Document"}
              </button>
            </div>
          </form>
          {documents.length === 0 && !isLoading ? <p>No documents found.</p> : null}
          {documents.length > 0 ? (
            <div className="list-grid">
              {documents.map((document) => (
                <article className="list-card" key={document.id}>
                  <strong>{document.name} - {document.source_type} - {document.status}</strong>
                  <div className="badge-row">
                    <span className="badge">source: {document.source_type}</span>
                    <span className="badge">status: {document.status}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <aside className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Build lane</span>
            <h2 className="section__title">Builds</h2>
          </div>
          <p>租户管理员要能快速判断能否重建、是否积压、以及这次构建影响多少文档。</p>
          <div className="inline-actions">
            <button className="button button--primary" type="button" onClick={() => void handleQueueBuild()} disabled={isSubmittingBuild || documents.length === 0}>
              {isSubmittingBuild ? "Queueing..." : "Queue Tenant Build"}
            </button>
          </div>
          {builds.length === 0 && !isLoading ? <p>No builds found.</p> : null}
          {builds.length > 0 ? (
            <div className="list-grid">
              {builds.map((build) => (
                <article className="list-card" key={build.id}>
                  <strong>{build.id} - {build.status} - {build.document_count} docs</strong>
                  <div className="badge-row">
                    <span className="badge">status: {build.status}</span>
                    <span className="badge">docs: {build.document_count}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
