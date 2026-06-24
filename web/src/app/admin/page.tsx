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
    <main className="page">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Platform Admin</span>
          <h1 className="hero__title">Admin Home</h1>
          <p className="hero__description">平台后台聚焦租户、用户、构建任务和全局健康，而不是把底层基础设施细节直接堆出来。</p>
          <div className="status-row">
            <p>Area: {area || "Unavailable"}</p>
            {isLoading ? <span className="status-pill">Loading admin home...</span> : <span className="status-pill">Operations ready</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>Users</strong>
            <p>面向全局账号生命周期和角色风险的管理入口。</p>
          </article>
          <article className="metric">
            <strong>Tenants</strong>
            <p>突出异常租户、资源使用与构建积压，而不是静态列表。</p>
          </article>
          <article className="metric">
            <strong>Builds</strong>
            <p>适合接入知识库构建、失败重试和跨租户审计链路。</p>
          </article>
        </div>
      </section>

      <section className="quicklinks-grid">
        <a aria-label="Users" className="link-card" href="/admin/users">
          <div className="link-card__title">
            <span>Users</span>
            <span>01</span>
          </div>
          <p>管理账号状态、角色分布与禁用风险。</p>
        </a>
        <a aria-label="Tenants" className="link-card" href="/admin/tenants">
          <div className="link-card__title">
            <span>Tenants</span>
            <span>02</span>
          </div>
          <p>跟踪租户健康度、资源规模和关键异常。</p>
        </a>
        <a aria-label="Knowledge Bases" className="link-card" href="/admin/knowledge-bases">
          <div className="link-card__title">
            <span>Knowledge Bases</span>
            <span>03</span>
          </div>
          <p>跨租户查看知识库质量、构建进度和权限风险。</p>
        </a>
      </section>

      <section className="split-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Operations Queue</span>
            <h2 className="section__title">后台优先看风险与积压</h2>
          </div>
          <div className="feature-grid">
            <a aria-label="Build Tasks" className="link-card" href="/admin/builds">
              <div className="link-card__title">
                <span>Build Tasks</span>
                <span>04</span>
              </div>
              <p>查看构建失败、耗时偏高与待重试任务。</p>
            </a>
            <a aria-label="Back to App" className="link-card" href="/app">
              <div className="link-card__title">
                <span>Back to App</span>
                <span>05</span>
              </div>
              <p>回到一线使用面，验证后台策略对最终用户体验的影响。</p>
            </a>
            <article className="status-card">
              <span className="status-card__label">Suggested panels</span>
              <strong>Health</strong>
              <p>下一步建议补充服务健康、审计事件和高风险任务告警卡片。</p>
            </article>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Admin Model</span>
          <ul>
            <li>首页看全局态势，不直接淹没在详情页里。</li>
            <li>风险优先于信息完整，突出待处理事项。</li>
            <li>为健康检查、审计、Temporal 链接留出明确位置。</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
