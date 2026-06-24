"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import type { TenantMember } from "../../../lib/tenant-members";

export default function TenantMembersPage() {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("tenant_member");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const canInvite = Boolean(inviteEmail.trim());
  const visibleMembers = members.filter((member) => {
    const matchesSearch = !searchTerm.trim() || member.email.toLowerCase().includes(searchTerm.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleInviteEmailChange(value: string) {
    setInviteEmail(value);
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleInviteRoleChange(value: string) {
    setInviteRole(value);
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const response = await fetch("/api/tenant/members", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { data?: TenantMember[]; error?: { message?: string } };

        if (!cancelled) {
          if (!response.ok) {
            setErrorMessage(payload.error?.message ?? "Unable to load tenant members.");
            setMembers([]);
            return;
          }

          setMembers(payload.data ?? []);
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load tenant members.");
          setMembers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInviteEmail = inviteEmail.trim();

    if (!nextInviteEmail) {
      setErrorMessage("Invite email is required.");
      return;
    }

    setIsInviting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/tenant/members/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: nextInviteEmail,
          role: inviteRole,
        }),
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: { email?: string; role?: string; status?: string };
        error?: { message?: string };
      };
      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? "Unable to send tenant invitation.");
        return;
      }

      setMembers((current) => [
        ...current,
        {
          email: payload.data?.email ?? nextInviteEmail,
          role: payload.data?.role ?? inviteRole,
          status: payload.data?.status ?? "invited",
        },
      ]);
      setInviteEmail("");
      setInviteRole("tenant_member");
    } catch {
      setErrorMessage("Unable to send tenant invitation.");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <main className="page page--compact">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Tenant Members</span>
          <h1 className="hero__title">Members</h1>
          <p className="hero__description">Invite a new tenant member and review current access.</p>
          <nav aria-label="Tenant membership navigation" className="inline-actions">
            <Link className="button button--secondary" href="/tenant">
              Back to Tenant
            </Link>
            <Link className="button button--secondary" href="/app">
              Back to App
            </Link>
          </nav>
          <div className="status-row">
            {isLoading ? <span className="status-pill">Loading tenant members...</span> : <span className="status-pill">{members.length} member record(s)</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>Invite</strong>
            <p>入口动作固定在第一屏，方便管理员快速拉人进来。</p>
          </article>
          <article className="metric">
            <strong>Role</strong>
            <p>角色字段保留简洁，不在 v0 做复杂矩阵，但状态必须可见。</p>
          </article>
          <article className="metric">
            <strong>Review</strong>
            <p>成员列表应服务于运营判断，而不是只作为原始数据表。</p>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Invite Flow</span>
            <h2 className="section__title">发出成员邀请</h2>
          </div>
          <form className="form-grid form-grid--inline" onSubmit={handleInvite}>
            <label>
              Invite email
              <input
                name="invite_email"
                type="email"
                value={inviteEmail}
                onChange={(event) => handleInviteEmailChange(event.target.value)}
                placeholder="new@example.com"
              />
            </label>
            <label>
              Role
              <select name="role" value={inviteRole} onChange={(event) => handleInviteRoleChange(event.target.value)}>
                <option value="tenant_member">tenant_member</option>
                <option value="tenant_admin">tenant_admin</option>
              </select>
            </label>
            <div className="inline-actions">
              <button className="button button--primary" type="submit" disabled={isInviting || !canInvite}>
                {isInviting ? "Sending invite..." : "Send invite"}
              </button>
            </div>
          </form>
          <div className="info-strip">
            <span className="muted">v0 scope</span>
            <strong>invite · activate · role review</strong>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Operational cues</span>
          <ul>
            <li>优先看到 invited、active、disabled 这类成员状态。</li>
            <li>成员页既要能发邀请，也要让管理员快速发现异常。</li>
            <li>后续可直接接审计日志、重发邀请和禁用动作。</li>
          </ul>
        </aside>
      </section>

      <section className="panel stack table-shell">
        <div className="section__header stack" style={{ padding: "22px 22px 0" }}>
          <span className="section__eyebrow">Access Review</span>
          <h2 className="section__title">当前成员与角色</h2>
        </div>
        <div className="stack" style={{ padding: "0 22px" }}>
          <div className="filter-bar">
            <label>
              Search members
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="alpha@example.com" />
            </label>
          </div>
          <div className="chip-row">
            {[
              ["all", "All"],
              ["active", "Active"],
              ["invited", "Invited"],
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
              </tr>
            </thead>
            <tbody>
              {!isLoading && !visibleMembers.length ? (
                <tr>
                  <td className="empty-row" colSpan={3}>
                    No tenant members found.
                  </td>
                </tr>
              ) : null}
              {visibleMembers.map((member) => (
                <tr key={member.email}>
                  <td>{member.email}</td>
                  <td>{member.role}</td>
                  <td>
                    <span className={member.status === "active" ? "status-tag status-tag--accent" : member.status === "invited" ? "status-tag status-tag--warning" : "status-tag status-tag--danger"}>
                      {member.status}
                    </span>
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
