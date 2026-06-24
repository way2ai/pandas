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
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Knowledge Workspace</span>
          <h1 className="hero__title">App Knowledge Bases</h1>
          <p className="hero__description">Use knowledge bases available in your personal workspace or tenant access scope.</p>
          <div className="section-actions">
            <a className="eyebrow-link" href="/app">
              Back to App
            </a>
            {isLoading ? <span className="status-pill">Loading app knowledge bases...</span> : <span className="status-pill">{knowledgeBases.length} knowledge base(s)</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>Search</strong>
            <p>把知识入口放前面，匹配个人用户最常见的检索与问答路径。</p>
          </article>
          <article className="metric">
            <strong>Build</strong>
            <p>列表页直接暴露状态，让待构建和失败项比资源名更显眼。</p>
          </article>
          <article className="metric">
            <strong>Access</strong>
            <p>把 scope 与 access role 直接放在主表里，避免用户误判权限边界。</p>
          </article>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Create</span>
            <h2 className="section__title">用最短动作新增知识库</h2>
          </div>
          {canCreatePersonalKnowledgeBase ? (
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
                  placeholder="Personal Notes"
                />
              </label>
              <div className="inline-actions">
                <button className="button button--primary" type="submit" disabled={isSubmitting || !knowledgeBaseName.trim()}>
                  {isSubmitting ? "Creating..." : "Create Personal Knowledge Base"}
                </button>
              </div>
            </form>
          ) : (
            <p>Personal knowledge-base creation is only available in personal workspaces.</p>
          )}
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">What belongs here</span>
          <ul>
            <li>常用知识库与最近检索历史。</li>
            <li>构建失败和待更新提醒。</li>
            <li>个人库与租户库的边界说明。</li>
          </ul>
        </aside>
      </section>

      <section className="panel stack data-table">
        <div className="section-actions">
          <div className="stack">
            <span className="section__eyebrow">Inventory</span>
            <h2 className="section__title">当前可用知识库</h2>
            <p className="table-note">表格保留完整字段，方便后续直接接分页、筛选和状态统计。</p>
          </div>
        </div>
        {knowledgeBases.length === 0 && !isLoading ? <p>No app knowledge bases found.</p> : null}
        {knowledgeBases.length > 0 ? (
          <div className="data-table__wrap">
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
          </div>
        ) : null}
      </section>
    </main>
  );
}
