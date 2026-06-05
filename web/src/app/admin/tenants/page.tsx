"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AdminTenant } from "../../../lib/admin";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    <main>
      <h1>Tenants</h1>
      <nav aria-label="Tenant administration navigation">
        <Link href="/admin">Back to Admin</Link>
        {" | "}
        <Link href="/admin/users">View Users</Link>
      </nav>
      {isLoading ? <p>Loading tenants...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && !tenants.length ? (
            <tr>
              <td colSpan={3}>No tenants found.</td>
            </tr>
          ) : null}
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td>{tenant.id}</td>
              <td>{tenant.name}</td>
              <td>{tenant.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
