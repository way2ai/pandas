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
    <main className="page">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Tenant Operations</span>
          <h1 className="hero__title">Tenant Home</h1>
          <p className="hero__description">Manage members, invitations, and tenant-level access here.</p>
          <div className="status-row">
            <p>Area: {area || "Unavailable"}</p>
            {isLoading ? <span className="status-pill">Loading tenant home...</span> : <span className="status-pill">Tenant controls online</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>Access</strong>
            <p>突出成员与知识库授权，符合租户管理员的第一优先级。</p>
          </article>
          <article className="metric">
            <strong>Audit</strong>
            <p>为邀请、禁用、审批等高风险动作预留审计反馈区。</p>
          </article>
          <article className="metric">
            <strong>Flow</strong>
            <p>让治理动作更像运营看板，而不是原始资源列表。</p>
          </article>
        </div>
      </section>

      <section className="quicklinks-grid">
        <a aria-label="Members" className="link-card" href="/tenant/members">
          <div className="link-card__title">
            <span>Members</span>
            <span>01</span>
          </div>
          <p>查看成员状态、角色分布、邀请流程与访问边界。</p>
        </a>
        <a aria-label="Knowledge Bases" className="link-card" href="/tenant/knowledge-bases">
          <div className="link-card__title">
            <span>Knowledge Bases</span>
            <span>02</span>
          </div>
          <p>管理租户级知识资产、授权范围和构建质量。</p>
        </a>
        <a aria-label="Back to App" className="link-card" href="/app">
          <div className="link-card__title">
            <span>Back to App</span>
            <span>03</span>
          </div>
          <p>回到个人工作区，验证治理动作对实际使用面的影响。</p>
        </a>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <h3>成员治理面</h3>
          <ul>
            <li>邀请待接受状态。</li>
            <li>禁用与恢复动作。</li>
            <li>角色变更审计记录。</li>
          </ul>
        </article>
        <article className="feature-card">
          <h3>知识库权限面</h3>
          <ul>
            <li>owner/admin/editor/viewer 一目了然。</li>
            <li>构建失败与权限冲突优先暴露。</li>
            <li>适合继续接审批流与风险提示。</li>
          </ul>
        </article>
        <article className="feature-card">
          <h3>租户运营状态</h3>
          <ul>
            <li>近期邀请数与激活率。</li>
            <li>活跃知识库数量。</li>
            <li>待处理高风险动作。</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
