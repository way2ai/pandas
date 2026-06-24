"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AdminUser } from "../../../lib/admin";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserEmail, setPendingUserEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const visibleUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm.trim() ||
      user.email.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      user.system_role.toLowerCase().includes(searchTerm.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { data?: AdminUser[]; error?: { message?: string } };

        if (!cancelled) {
          if (!response.ok) {
            setErrorMessage(payload.error?.message ?? "Unable to load users.");
            setUsers([]);
            return;
          }

          setUsers(payload.data ?? []);
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load users.");
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStatusChange(user: AdminUser) {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    const endpoint = `/api/admin/users/${encodeURIComponent(user.email)}/${nextStatus === "active" ? "enable" : "disable"}`;
    setPendingUserEmail(user.email);
    setErrorMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as { data?: { email?: string; status?: string }; error?: { message?: string } };
      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? "Unable to update user status.");
        return;
      }

      setUsers((current) =>
        current.map((candidate) =>
          candidate.email === (payload.data?.email ?? user.email)
            ? {
                ...candidate,
                status: payload.data?.status ?? nextStatus,
              }
            : candidate,
        ),
      );
    } catch {
      setErrorMessage("Unable to update user status.");
    } finally {
      setPendingUserEmail("");
    }
  }

  return (
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">User Administration</span>
          <h1 className="hero__title">Users</h1>
          <p className="hero__description">平台用户页首先服务于状态治理：谁是管理员、谁被禁用、谁需要恢复访问，一眼就要看清楚。</p>
          <nav aria-label="User administration navigation" className="inline-actions">
            <Link className="button button--secondary" href="/admin">
              Back to Admin
            </Link>
            <Link className="button button--secondary" href="/admin/tenants">
              View Tenants
            </Link>
          </nav>
          <div className="status-row">
            {isLoading ? <span className="status-pill">Loading users...</span> : <span className="status-pill">{users.length} user record(s)</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>{users.filter((user) => user.status === "active").length}</strong>
            <p>active account(s) currently available for platform access.</p>
          </article>
          <article className="metric">
            <strong>{users.filter((user) => user.status !== "active").length}</strong>
            <p>inactive or disabled account(s) needing admin review.</p>
          </article>
          <article className="metric">
            <strong>{users.filter((user) => user.system_role === "platform_admin").length}</strong>
            <p>platform admin account(s) with elevated privileges.</p>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Operations</span>
            <h2 className="section__title">平台账号治理规则</h2>
          </div>
          <div className="list-grid">
            <article className="list-card">
              <strong>优先暴露禁用动作</strong>
              <p className="muted">用户页应该支持快速限制异常账号，而不是把操作隐藏到详情页。</p>
            </article>
            <article className="list-card">
              <strong>角色与状态分开看</strong>
              <p className="muted">管理员角色不等于活跃状态，二者必须并排可见。</p>
            </article>
            <article className="list-card">
              <strong>低摩擦恢复访问</strong>
              <p className="muted">被禁用用户应允许一键恢复，避免支持流程过长。</p>
            </article>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Action model</span>
          <ul>
            <li>active 用户显示 Disable。</li>
            <li>disabled 用户显示 Enable。</li>
            <li>操作进行中保留 Updating... 反馈，防止重复提交。</li>
          </ul>
        </aside>
      </section>

      <section className="panel stack table-shell">
        <div className="section__header stack" style={{ padding: "22px 22px 0" }}>
          <span className="section__eyebrow">User Directory</span>
          <h2 className="section__title">账号状态总览</h2>
        </div>
        <div className="stack" style={{ padding: "0 22px" }}>
          <div className="filter-bar">
            <label>
              Search users
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ops@example.com" />
            </label>
          </div>
          <div className="chip-row">
            {[
              ["all", "All"],
              ["active", "Active"],
              ["disabled", "Disabled"],
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
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && !visibleUsers.length ? (
                <tr>
                  <td className="empty-row" colSpan={4}>
                    No users found.
                  </td>
                </tr>
              ) : null}
              {visibleUsers.map((user) => (
                <tr key={user.email}>
                  <td>{user.email}</td>
                  <td>{user.system_role}</td>
                  <td>
                    <span className={user.status === "active" ? "status-tag status-tag--accent" : "status-tag status-tag--danger"}>{user.status}</span>
                  </td>
                  <td>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => void handleStatusChange(user)}
                      disabled={pendingUserEmail === user.email}
                    >
                      {pendingUserEmail === user.email ? "Updating..." : user.status === "active" ? "Disable" : "Enable"}
                    </button>
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
