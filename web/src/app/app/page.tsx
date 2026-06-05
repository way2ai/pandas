"use client";

import { useEffect, useState } from "react";

import { useSession } from "../session-shell";
import { canAccessPath } from "../../lib/session";

export default function AppPage() {
  const session = useSession();
  const [area, setArea] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadArea() {
      try {
        const response = await fetch("/api/app/home", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { data?: { area?: string }; error?: { message?: string } };

        if (!cancelled) {
          if (!response.ok) {
            setErrorMessage(payload.error?.message ?? "Unable to load app home.");
            setArea("");
            return;
          }

          setArea(payload.data?.area ?? "");
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load app home.");
          setArea("");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadArea();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>App Home</h1>
      {isLoading ? <p>Loading app home...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <p>Area: {area || "Unavailable"}</p>
      <ul>
        <li>
          <a href="/app/knowledge-bases">App Knowledge Bases</a>
        </li>
        {canAccessPath("/tenant", session?.system_role) ? (
          <>
            <li>
              <a href="/tenant">Tenant Area</a>
            </li>
            <li>
              <a href="/tenant/members">Tenant Members</a>
            </li>
            <li>
              <a href="/tenant/knowledge-bases">Tenant Knowledge Bases</a>
            </li>
          </>
        ) : null}
        {canAccessPath("/admin", session?.system_role) ? (
          <>
            <li>
              <a href="/admin">Admin Area</a>
            </li>
            <li>
              <a href="/admin/users">Admin Users</a>
            </li>
            <li>
              <a href="/admin/tenants">Admin Tenants</a>
            </li>
            <li>
              <a href="/admin/knowledge-bases">Admin Knowledge Bases</a>
            </li>
          </>
        ) : null}
      </ul>
    </main>
  );
}
