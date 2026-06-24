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
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Tenant Knowledge</span>
          <h1 className="hero__title">Tenant Knowledge Bases</h1>
          <p className="hero__description">Manage tenant-level knowledge bases and prepare them for later build and retrieval flows.</p>
          <div className="section-actions">
            <a className="eyebrow-link" href="/tenant">
              Back to Tenant
            </a>
            {isLoading ? <span className="status-pill">Loading tenant knowledge bases...</span> : <span className="status-pill">{knowledgeBases.length} tenant knowledge base(s)</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>Shared</strong>
            <p>租户级知识库天然服务多人协作，所以状态与权限应在第一屏可见。</p>
          </article>
          <article className="metric">
            <strong>Ready</strong>
            <p>列表页为后续批量构建、授权和质量巡检保留统一入口。</p>
          </article>
          <article className="metric">
            <strong>Owned</strong>
            <p>保留 tenant 标识，方便后续平台层做跨租户观测与审计。</p>
          </article>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Create</span>
            <h2 className="section__title">新增租户知识库</h2>
          </div>
          <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
            <label>
              Knowledge Base Name
              <input
                name="knowledgeBaseName"
                value={knowledgeBaseName}
                onChange={(event) => {
                  setKnowledgeBaseName(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Support Playbooks"
              />
            </label>
            <div className="inline-actions">
              <button className="button button--primary" type="submit" disabled={isSubmitting || !knowledgeBaseName.trim()}>
                {isSubmitting ? "Creating..." : "Create Tenant Knowledge Base"}
              </button>
            </div>
          </form>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Tenant flow</span>
          <ul>
            <li>先建库，再接文档，然后排队构建。</li>
            <li>把 access role 放进主表，方便管理员快速判责。</li>
            <li>后续可以直接接成员授权和审计回溯。</li>
          </ul>
        </aside>
      </section>

      <section className="panel stack data-table">
        <div className="stack">
          <span className="section__eyebrow">Inventory</span>
          <h2 className="section__title">租户资产列表</h2>
        </div>
        {knowledgeBases.length === 0 && !isLoading ? <p>No tenant knowledge bases found.</p> : null}
        {knowledgeBases.length > 0 ? (
          <div className="data-table__wrap">
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
          </div>
        ) : null}
      </section>
    </main>
  );
}
