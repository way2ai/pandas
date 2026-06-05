"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [area, setArea] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadArea() {
      try {
        const response = await fetch("/api/admin/home", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { data?: { area?: string }; error?: { message?: string } };

        if (!cancelled) {
          if (!response.ok) {
            setErrorMessage(payload.error?.message ?? "Unable to load admin home.");
            setArea("");
            return;
          }

          setArea(payload.data?.area ?? "");
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load admin home.");
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
      <h1>Admin Home</h1>
      {isLoading ? <p>Loading admin home...</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <p>Area: {area || "Unavailable"}</p>
      <ul>
        <li>
          <a href="/admin/users">Users</a>
        </li>
        <li>
          <a href="/admin/tenants">Tenants</a>
        </li>
        <li>
          <a href="/admin/knowledge-bases">Knowledge Bases</a>
        </li>
        <li>
          <a href="/admin/builds">Build Tasks</a>
        </li>
        <li>
          <a href="/app">Back to App</a>
        </li>
      </ul>
    </main>
  );
}
