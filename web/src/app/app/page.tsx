"use client";

import { useEffect, useState } from "react";

import { useSession } from "../session-shell";
import { canAccessPath } from "../../lib/session";

const recentConversations = [
  { id: "conv-1", title: "供应商准入问答", knowledgeBase: "Support Playbooks", latency: "1.8s" },
  { id: "conv-2", title: "新成员入职流程", knowledgeBase: "Tenant Handbook", latency: "2.3s" },
  { id: "conv-3", title: "法务条款检索", knowledgeBase: "Personal Notes", latency: "1.4s" },
];

const activeRuns = [
  { id: "run-1", name: "客户支持分类流", status: "processing", owner: "workflow" },
  { id: "run-2", name: "知识库重建审批", status: "waiting_approval", owner: "tenant" },
  { id: "run-3", name: "合同摘要生成", status: "queued", owner: "app" },
];

const resourceHighlights = [
  { id: "asset-1", name: "Tenant Handbook", status: "ready", note: "最近 24h 命中最高" },
  { id: "asset-2", name: "Support Playbooks", status: "pending_build", note: "有 3 个文档待构建" },
  { id: "asset-3", name: "Personal Notes", status: "failed", note: "需要检查最近一次嵌入失败" },
];

function statusTagClass(status: string) {
  if (status === "ready" || status === "processing") {
    return "status-tag status-tag--accent";
  }
  if (status === "pending_build" || status === "queued" || status === "waiting_approval") {
    return "status-tag status-tag--warning";
  }
  if (status === "failed") {
    return "status-tag status-tag--danger";
  }
  return "status-tag";
}

export default function AppPage() {
  const session = useSession();
  const [area, setArea] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const canAccessTenant = canAccessPath("/tenant", session?.system_role);
  const canAccessAdmin = canAccessPath("/admin", session?.system_role);

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
    <main className="page">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">Workspace</span>
          <h1 className="hero__title">App Home</h1>
          <p className="hero__description">
            这里是个人用户和租户成员的工作面。当前结构已经为知识库、RAG 对话、工作流运行和跨角色跳转预留了稳定位置。
          </p>
          <div className="status-row">
            <p>Area: {area || "Unavailable"}</p>
            {isLoading ? <span className="status-pill">Loading app home...</span> : <span className="status-pill">Workspace ready</span>}
          </div>
          {errorMessage ? (
            <p className="alert" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>KB</strong>
            <p>把知识库入口放在第一屏，符合用户最常见的检索和问答路径。</p>
          </article>
          <article className="metric">
            <strong>Run</strong>
            <p>适合继续接运行中的工作流、ReAct 执行实例和待处理事项。</p>
          </article>
          <article className="metric">
            <strong>Role</strong>
            <p>仅暴露当前角色可以访问的管理区，降低界面噪音与误操作风险。</p>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Primary Actions</span>
            <h2 className="section__title">从使用场景出发组织入口</h2>
            <p className="section__description">先用，再治理。个人工作区不应该长得像后台系统。</p>
          </div>
          <div className="quicklinks-grid">
            <a className="link-card" href="/app/knowledge-bases">
              <div className="link-card__title">
                <span>App Knowledge Bases</span>
                <span>01</span>
              </div>
              <p>浏览已授权知识库、接入文档、查看构建与检索状态。</p>
            </a>
            {canAccessTenant ? (
              <a className="link-card" href="/tenant">
                <div className="link-card__title">
                  <span>Tenant Area</span>
                  <span>02</span>
                </div>
                <p>切到租户治理视图，处理成员、授权和组织协作问题。</p>
              </a>
            ) : null}
            {canAccessAdmin ? (
              <a className="link-card" href="/admin">
                <div className="link-card__title">
                  <span>Admin Area</span>
                  <span>03</span>
                </div>
                <p>进入平台层运营面板，查看租户、用户和构建任务。</p>
              </a>
            ) : null}
          </div>
          <div className="mini-metrics">
            <article className="mini-metric">
              <strong>Recent focus</strong>
              <p className="muted">知识库、会话与运行状态需要在首页快速恢复上下文。</p>
            </article>
            <article className="mini-metric">
              <strong>Pending work</strong>
              <p className="muted">后续可接待处理构建、失败任务和审批提醒。</p>
            </article>
            <article className="mini-metric">
              <strong>Role aware</strong>
              <p className="muted">按角色显示管理入口，而不是把所有系统导航直接公开。</p>
            </article>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Next Integrations</span>
          <h2>继续落数据时，优先补这几个块</h2>
          <ul>
            <li>最近一次检索与问答历史。</li>
            <li>工作流运行中的成功率、耗时和重试态。</li>
            <li>知识库构建队列与失败回溯入口。</li>
          </ul>
          <div className="info-strip">
            <span className="muted">Suggested surface</span>
            <strong>recent chats · active runs · saved prompts</strong>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section__header stack">
          <span className="section__eyebrow">Role Shortcuts</span>
          <h2 className="section__title">权限可见，页面不拥挤</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <h3>基础使用入口</h3>
            <ul>
              <li>
                <a href="/app/knowledge-bases">App Knowledge Bases</a>
              </li>
            </ul>
          </article>
          {canAccessTenant ? (
            <article className="feature-card">
              <h3>租户管理入口</h3>
              <ul>
                <li>
                  <a href="/tenant">Tenant Area</a>
                </li>
                <li>
                  <a href="/tenant/members">Tenant Members</a>
                </li>
                <li>
                  <a href="/tenant/knowledge-bases">Tenant Knowledge Bases</a>
                </li>
              </ul>
            </article>
          ) : null}
          {canAccessAdmin ? (
            <article className="feature-card">
              <h3>平台管理入口</h3>
              <ul>
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
              </ul>
            </article>
          ) : null}
        </div>
      </section>

      <section className="split-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Suggested Dashboard Blocks</span>
            <h2 className="section__title">首页下一步应该承接的真实数据</h2>
          </div>
          <div className="list-grid">
            <article className="list-card">
              <strong>最近会话</strong>
              <p className="muted">显示最近 5 次提问、引用的知识库和最后一次模型响应时间。</p>
            </article>
            <article className="list-card">
              <strong>运行中的任务</strong>
              <p className="muted">展示工作流、ReAct 执行和人工审批的当前状态。</p>
            </article>
            <article className="list-card">
              <strong>可用知识资产</strong>
              <p className="muted">优先展示 ready、pending_build、failed 三种最关键状态。</p>
            </article>
          </div>
        </article>

        <aside className="spotlight-card stack">
          <span className="section__eyebrow">Design rule</span>
          <p>用户首页应该帮助他们继续工作，而不是重新理解系统结构。这也是为什么知识库入口、角色跳转和近期工作会被固定在第一屏。</p>
        </aside>
      </section>

      <section className="dashboard-grid">
        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Recent Conversations</span>
            <h2 className="section__title">最近会话</h2>
          </div>
          <div className="timeline-list">
            {recentConversations.map((conversation) => (
              <article className="timeline-item" key={conversation.id}>
                <h3>{conversation.title}</h3>
                <div className="badge-row">
                  <span className="badge">KB: {conversation.knowledgeBase}</span>
                  <span className="badge">latency: {conversation.latency}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel stack">
          <div className="section__header stack">
            <span className="section__eyebrow">Active Runs</span>
            <h2 className="section__title">运行中的任务</h2>
          </div>
          <div className="tight-list">
            {activeRuns.map((run) => (
              <div className="info-strip" key={run.id}>
                <div className="stack" style={{ gap: "4px" }}>
                  <strong>{run.name}</strong>
                  <span className="muted">owner: {run.owner}</span>
                </div>
                <span className={statusTagClass(run.status)}>{run.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel stack">
        <div className="section__header stack">
          <span className="section__eyebrow">Resource Highlights</span>
          <h2 className="section__title">知识资产重点提醒</h2>
        </div>
        <div className="feature-grid">
          {resourceHighlights.map((asset) => (
            <article className="feature-card" key={asset.id}>
              <div className="badge-row">
                <span className={statusTagClass(asset.status)}>{asset.status}</span>
              </div>
              <h3>{asset.name}</h3>
              <p>{asset.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
