"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { KnowledgeBuildTask } from "../../../lib/knowledge-bases";

export default function AdminBuildsPage() {
  const [builds, setBuilds] = useState<KnowledgeBuildTask[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingBuildID, setPendingBuildID] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const visibleBuilds = builds.filter((build) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query || build.id.toLowerCase().includes(query) || build.knowledge_base_id.toLowerCase().includes(query) || build.scope.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || build.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <button className="button button--secondary" type="button" onClick={() => void handleBuildAction(build, "retry")} disabled={isPending}>
          {isPending ? "Updating..." : "Retry"}
        </button>
      );
    }
    if (build.status === "queued" || build.status === "processing") {
      return (
        <button className="button button--secondary" type="button" onClick={() => void handleBuildAction(build, "cancel")} disabled={isPending}>
          {isPending ? "Updating..." : "Cancel"}
        </button>
      );
    }
    return <span>Completed</span>;
  }

  return (
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Build Operations</span>
          <h1 className="hero__title">Build Tasks</h1>
          <p className="hero__description">构建页是平台排障面：失败任务要能立即重试，排队中的任务要能取消，完成态应该自动沉到底部语义里。</p>
          <nav aria-label="Build administration navigation" className="inline-actions">
            <Link className="button button--secondary" href="/admin">
              Back to Admin
            </Link>
            <Link className="button button--secondary" href="/admin/knowledge-bases">
              Knowledge Bases
            </Link>
          </nav>
          <div className="status-row">
            {isLoading ? <span className="status-pill">Loading build tasks...</span> : <span className="status-pill">{builds.length} build task(s)</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>{builds.filter((build) => build.status === "failed").length}</strong>
            <p>failed build(s) currently eligible for retry.</p>
          </article>
          <article className="metric">
            <strong>{builds.filter((build) => build.status === "queued" || build.status === "processing").length}</strong>
            <p>queued or processing build(s) that may need cancellation.</p>
          </article>
          <article className="metric">
            <strong>{builds.filter((build) => build.status === "ready").length}</strong>
            <p>completed build(s) with no further operator action required.</p>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Action Policy</span>
            <h2 className="section__title">构建状态如何映射成操作</h2>
          </div>
          <div className="list-grid">
            <article className="list-card">
              <strong>failed / cancelled</strong>
              <p className="muted">显示 Retry，优先帮助运营恢复构建链路。</p>
            </article>
            <article className="list-card">
              <strong>queued / processing</strong>
              <p className="muted">显示 Cancel，便于快速止损或释放资源。</p>
            </article>
            <article className="list-card">
              <strong>ready</strong>
              <p className="muted">显示 Completed，表示任务已退出运营干预范围。</p>
            </article>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Next panels</span>
          <ul>
            <li>平均构建耗时和失败率趋势。</li>
            <li>按 scope 聚合的任务积压。</li>
            <li>最近一次错误码与知识库来源关联。</li>
          </ul>
        </aside>
      </section>

      <section className="panel stack table-shell">
        <div className="section__header stack" style={{ padding: "22px 22px 0" }}>
          <span className="section__eyebrow">Queue</span>
          <h2 className="section__title">构建任务队列</h2>
        </div>
        <div className="stack" style={{ padding: "0 22px" }}>
          <div className="filter-bar">
            <label>
              Search builds
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="build-kb-tenant-1" />
            </label>
          </div>
          <div className="chip-row">
            {[
              ["all", "All"],
              ["queued", "Queued"],
              ["processing", "Processing"],
              ["failed", "Failed"],
              ["ready", "Ready"],
              ["cancelled", "Cancelled"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={statusFilter === value ? "chip-button chip-button--active" : "chip-button"}
                type="button"
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {visibleBuilds.length === 0 && !isLoading ? <p style={{ padding: "0 22px 22px" }}>No build tasks found.</p> : null}
        {visibleBuilds.length > 0 ? (
          <div className="data-table__wrap">
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
                {visibleBuilds.map((build) => (
                  <tr key={build.id}>
                    <td>{build.id}</td>
                    <td>{build.knowledge_base_id}</td>
                    <td>{build.scope}</td>
                    <td>
                      <span className={build.status === "ready" ? "status-tag status-tag--accent" : build.status === "failed" ? "status-tag status-tag--danger" : "status-tag status-tag--warning"}>
                        {build.status}
                      </span>
                    </td>
                    <td>{build.trigger}</td>
                    <td>{build.document_count}</td>
                    <td>{build.last_error ?? "-"}</td>
                    <td>{renderAction(build)}</td>
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
