"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { destinationForSystemRole } from "../../lib/session";

type LoginResponse = {
  data?: {
    email?: string;
    system_role?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export default function LoginPage() {
  const { push } = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = Boolean(identifier.trim() && password.trim());

  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as LoginResponse;
        if (!cancelled) {
          push(destinationForSystemRole(payload.data?.system_role));
        }
      } catch {
        return;
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [push]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextIdentifier = identifier.trim();
    const nextPassword = password.trim();

    if (!nextIdentifier || !nextPassword) {
      setErrorMessage("Email or username and password are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: nextIdentifier,
          password: nextPassword,
        }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? "Login failed");
        return;
      }

      push(destinationForSystemRole(payload.data?.system_role));
    } catch {
      setErrorMessage("Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email or username
          <input
            name="identifier"
            value={identifier}
            onChange={(event) => handleIdentifierChange(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => handlePasswordChange(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
