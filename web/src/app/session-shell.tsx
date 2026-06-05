"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { canAccessPath, destinationForSystemRole, isProtectedPath } from "../lib/session";

type SessionData = {
  email?: string;
  system_role?: string;
};

type SessionShellProps = {
  children: ReactNode;
};

const SessionContext = createContext<SessionData | null>(null);

export function useSession() {
  return useContext(SessionContext);
}

export function SessionShell({ children }: SessionShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) {
            setSession(null);
            if (isProtectedPath(pathname)) {
              router.push("/login");
            }
          }
          return;
        }

        const payload = (await response.json()) as { data?: SessionData };
        if (!cancelled) {
          const nextSession = payload.data ?? null;
          setSession(nextSession);
          if (!canAccessPath(pathname, nextSession?.system_role)) {
            router.push(destinationForSystemRole(nextSession?.system_role));
          }
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          if (isProtectedPath(pathname)) {
            router.push("/login");
          }
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      return;
    }

    setSession(null);
    router.push("/login");
  }

  return (
    <SessionContext.Provider value={session}>
      <header>
        <nav>
          {session?.email ? (
            <>
              {canAccessPath("/app", session.system_role) ? <a href="/app">App</a> : null}
              {canAccessPath("/tenant", session.system_role) ? <a href="/tenant">Tenant</a> : null}
              {canAccessPath("/admin", session.system_role) ? <a href="/admin">Admin</a> : null}
            </>
          ) : (
            <a href="/login">Login</a>
          )}
        </nav>
        <div>
          {session?.email ? (
            <>
              <span>{session.email}</span>
              <span>{session.system_role}</span>
              <button type="button" onClick={() => void handleLogout()}>
                Sign out
              </button>
            </>
          ) : (
            <span>Signed out</span>
          )}
        </div>
      </header>
      {children}
    </SessionContext.Provider>
  );
}
