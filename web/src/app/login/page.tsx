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
    <main className="page">
      <section className="login-layout">
        <div className="spotlight-card stack">
          <span className="hero__eyebrow">Platform Access</span>
          <h1>登录你的知识工作台</h1>
          <p>
            这不是一个通用登录页，而是整个平台的角色分发入口。登录后会根据系统角色自动进入个人区、租户区或平台后台。
          </p>
          <div className="status-grid">
            <article className="status-card">
              <span className="status-card__label">个人用户</span>
              <strong>/app</strong>
              <p>查看知识库、运行任务、进入对话与工作流使用面。</p>
            </article>
            <article className="status-card">
              <span className="status-card__label">租户管理员</span>
              <strong>/tenant</strong>
              <p>集中处理成员、授权、审批和租户级知识资产。</p>
            </article>
            <article className="status-card">
              <span className="status-card__label">平台管理员</span>
              <strong>/admin</strong>
              <p>管理全局租户、用户、构建任务与平台健康态势。</p>
            </article>
          </div>
        </div>

        <section className="login-card">
          <div className="stack">
            <span className="hero__eyebrow">Login</span>
            <h1>Login</h1>
            <p>使用邮箱或用户名登录，系统会按权限自动跳转到正确的业务区。</p>
          </div>
          <form onSubmit={handleSubmit}>
            <label>
              Email or username
              <input
                name="identifier"
                value={identifier}
                onChange={(event) => handleIdentifierChange(event.target.value)}
                autoComplete="username"
                placeholder="admin@example.com"
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
                placeholder="Enter your password"
              />
            </label>
            {errorMessage ? (
              <p className="alert" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <div className="login-card__actions">
              <button className="button button--primary" type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
              <a className="button button--secondary" href="/">
                查看产品首页
              </a>
            </div>
          </form>
          <div className="login-card__meta">
            <span>Session: HttpOnly cookie</span>
            <span>Role routing: automatic</span>
          </div>
        </section>
      </section>
    </main>
  );
}
