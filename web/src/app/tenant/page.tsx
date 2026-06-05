"use client";

import { useEffect, useState } from "react";

export default function TenantPage() {
  const [area, setArea] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadArea() {
      try {
        const response = await fetch("/api/tenant/home", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { data?: { area?: string }; error?: { message?: string } };

        if (!cancelled) {
          if (!response.ok) {
            setErrorMessage(payload.error?.message ?? "Unable to load tenant home.");
            setArea("");
            return;
          }

          setArea(payload.data?.area ?? "");
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load tenant home.");
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
      <h1>Tenant Home</h1>
      {isLoading ? <p>Loading tenant home...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <p>Area: {area || "Unavailable"}</p>
      <p>Manage members, invitations, and tenant-level access here.</p>
      <ul>
        <li>
          <a href="/tenant/members">Members</a>
        </li>
        <li>
          <a href="/tenant/knowledge-bases">Knowledge Bases</a>
        </li>
        <li>
          <a href="/app">Back to App</a>
        </li>
      </ul>
    </main>
  );
}
