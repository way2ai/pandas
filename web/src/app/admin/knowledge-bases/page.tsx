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
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Admin Inventory</span>
          <h1 className="hero__title">Knowledge Bases</h1>
          <p className="hero__description">Review personal and tenant knowledge-base metadata from the admin surface.</p>
          <div className="section-actions">
            <a className="eyebrow-link" href="/admin">
              Back to Admin
            </a>
            {isLoading ? <span className="status-pill">Loading admin knowledge bases...</span> : <span className="status-pill">{knowledgeBases.length} visible</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>Cross-scope</strong>
            <p>管理员视角需要同时看 personal 与 tenant 两种资源。</p>
          </article>
          <article className="metric">
            <strong>Health</strong>
            <p>后续适合直接叠加失败构建率、待处理量和 owner 分布。</p>
          </article>
          <article className="metric">
            <strong>Audit</strong>
            <p>Owner 字段保留为最基础的责任归属点，方便继续接审计链接。</p>
          </article>
        </div>
      </section>

      <section className="panel stack data-table">
        {knowledgeBases.length === 0 && !isLoading ? <p>No knowledge bases found.</p> : null}
        {knowledgeBases.length > 0 ? (
          <div className="data-table__wrap">
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
          </div>
        ) : null}
      </section>
    </main>
  );
}
