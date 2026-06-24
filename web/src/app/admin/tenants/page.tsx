"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AdminTenant } from "../../../lib/admin";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const visibleTenants = tenants.filter((tenant) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || tenant.id.toLowerCase().includes(query) || tenant.name.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTenants() {
      try {
        const response = await fetch("/api/admin/tenants", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { data?: AdminTenant[]; error?: { message?: string } };

        if (!cancelled) {
          if (!response.ok) {
            setErrorMessage(payload.error?.message ?? "Unable to load tenants.");
            setTenants([]);
            return;
          }

          setTenants(payload.data ?? []);
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load tenants.");
          setTenants([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTenants();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Tenant Administration</span>
          <h1 className="hero__title">Tenants</h1>
          <p className="hero__description">租户页是平台层的业务视图，不是简单 ID 列表。它应该首先告诉你哪些租户需要运营介入。</p>
          <nav aria-label="Tenant administration navigation" className="inline-actions">
            <Link className="button button--secondary" href="/admin">
              Back to Admin
            </Link>
            <Link className="button button--secondary" href="/admin/users">
              View Users
            </Link>
          </nav>
          <div className="status-row">
            {isLoading ? <span className="status-pill">Loading tenants...</span> : <span className="status-pill">{tenants.length} tenant record(s)</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>{tenants.filter((tenant) => tenant.status === "active").length}</strong>
            <p>active tenant(s) currently in healthy service.</p>
          </article>
          <article className="metric">
            <strong>{tenants.filter((tenant) => tenant.status !== "active").length}</strong>
            <p>tenant(s) with suspended or non-standard status needing attention.</p>
          </article>
          <article className="metric">
            <strong>v0</strong>
            <p>这一页适合继续接配额、知识库数量和失败构建概览。</p>
          </article>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">What to surface</span>
            <h2 className="section__title">租户级运营面应优先展示什么</h2>
          </div>
          <div className="list-grid">
            <article className="list-card">
              <strong>租户状态</strong>
              <p className="muted">active、suspended 之类的状态需要直接映射到运营优先级。</p>
            </article>
            <article className="list-card">
              <strong>租户规模</strong>
              <p className="muted">后续建议增加成员数、知识库数和最近活跃时间。</p>
            </article>
            <article className="list-card">
              <strong>关键风险</strong>
              <p className="muted">下一步可以接失败构建数、禁用成员占比和待审批动作。</p>
            </article>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Admin flow</span>
          <p>租户页和用户页应互相可跳转，因为平台排障通常要在租户视角和账号视角之间来回切换。</p>
        </aside>
      </section>

      <section className="panel stack table-shell">
        <div className="section__header stack" style={{ padding: "22px 22px 0" }}>
          <span className="section__eyebrow">Tenant Registry</span>
          <h2 className="section__title">租户总览</h2>
        </div>
        <div className="stack" style={{ padding: "0 22px" }}>
          <div className="filter-bar">
            <label>
              Search tenants
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="tenant-acme" />
            </label>
          </div>
          <div className="chip-row">
            {[
              ["all", "All"],
              ["active", "Active"],
              ["suspended", "Suspended"],
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
        <div className="data-table__wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && !visibleTenants.length ? (
                <tr>
                  <td className="empty-row" colSpan={3}>
                    No tenants found.
                  </td>
                </tr>
              ) : null}
              {visibleTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>{tenant.id}</td>
                  <td>{tenant.name}</td>
                  <td>
                    <span className={tenant.status === "active" ? "status-tag status-tag--accent" : "status-tag status-tag--warning"}>{tenant.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
