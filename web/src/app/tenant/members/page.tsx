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
  const canInvite = Boolean(inviteEmail.trim());

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
    <main>
      <h1>Members</h1>
      <nav aria-label="Tenant membership navigation">
        <Link href="/tenant">Back to Tenant</Link>
        {" | "}
        <Link href="/app">Back to App</Link>
      </nav>
      {isLoading ? <p>Loading tenant members...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <p>Invite a new tenant member and review current access.</p>
      <form onSubmit={handleInvite}>
        <label>
          Invite email
          <input
            name="invite_email"
            type="email"
            value={inviteEmail}
            onChange={(event) => handleInviteEmailChange(event.target.value)}
          />
        </label>
        <label>
          Role
          <select name="role" value={inviteRole} onChange={(event) => handleInviteRoleChange(event.target.value)}>
            <option value="tenant_member">tenant_member</option>
            <option value="tenant_admin">tenant_admin</option>
          </select>
        </label>
        <button type="submit" disabled={isInviting || !canInvite}>
          {isInviting ? "Sending invite..." : "Send invite"}
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && !members.length ? (
            <tr>
              <td colSpan={3}>No tenant members found.</td>
            </tr>
          ) : null}
          {members.map((member) => (
            <tr key={member.email}>
              <td>{member.email}</td>
              <td>{member.role}</td>
              <td>{member.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
