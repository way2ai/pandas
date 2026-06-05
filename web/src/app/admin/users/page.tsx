"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AdminUser } from "../../../lib/admin";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserEmail, setPendingUserEmail] = useState("");

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
    <main>
      <h1>Users</h1>
      <nav aria-label="User administration navigation">
        <Link href="/admin">Back to Admin</Link>
        {" | "}
        <Link href="/admin/tenants">View Tenants</Link>
      </nav>
      {isLoading ? <p>Loading users...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
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
          {!isLoading && !users.length ? (
            <tr>
              <td colSpan={4}>No users found.</td>
            </tr>
          ) : null}
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.system_role}</td>
              <td>{user.status}</td>
              <td>
                <button
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
    </main>
  );
}
