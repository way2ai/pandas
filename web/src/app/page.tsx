export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero__content stack">
          <span className="hero__eyebrow">SaaS Landing</span>
          <h1 className="hero__title">把知识库、智能体与租户治理放进同一个工作台。</h1>
          <p className="hero__description">
            面向你的 v0 架构，这套页面直接对应个人工作区、租户管理区和平台后台，既能用于产品演示，也能继续承接真实 API 与业务流程。
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="/login">
              进入控制台
            </a>
            <a className="button button--secondary" href="/app">
              查看用户工作区
            </a>
          </div>
        </div>
        <div className="hero__stats">
          <article className="metric">
            <strong>3</strong>
            <p>核心入口同时覆盖个人使用、租户治理、平台运维。</p>
          </article>
          <article className="metric">
            <strong>1</strong>
            <p>单一 Next.js 前端承接知识库、工作流、执行态与权限感知。</p>
          </article>
          <article className="metric">
            <strong>v0</strong>
            <p>界面围绕 MVP 可交付边界设计，不依赖未来阶段才有的能力。</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section__header stack">
          <span className="section__eyebrow">Information Architecture</span>
          <h2 className="section__title">按角色组织页面，而不是按技术模块堆入口。</h2>
          <p className="section__description">
            这样更符合 SaaS 的真实使用路径：先进入工作台，再看到和自己权限匹配的动作、状态和风险提醒。
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="kicker">/app</div>
            <h3>个人与成员工作区</h3>
            <p>聚焦知识库使用、对话入口、任务状态和跨角色跳转。</p>
            <ul>
              <li>展示个人工作面与授权资源。</li>
              <li>保留通往租户区和后台的权限感知入口。</li>
              <li>适合继续挂接 RAG 对话与运行历史。</li>
            </ul>
          </article>
          <article className="feature-card">
            <div className="kicker">/tenant</div>
            <h3>租户治理中心</h3>
            <p>成员、知识库权限与审批动作集中到一个管理面。</p>
            <ul>
              <li>适合继续扩展邀请、成员状态、知识库授权矩阵。</li>
              <li>可承接审计提示与高风险动作确认。</li>
              <li>突出“运营而非开发”的页面气质。</li>
            </ul>
          </article>
          <article className="feature-card">
            <div className="kicker">/admin</div>
            <h3>平台运营后台</h3>
            <p>面向租户、用户、构建任务与全局健康的最小后台骨架。</p>
            <ul>
              <li>预留任务积压、风险租户、健康检查等概览位。</li>
              <li>适配平台管理员的低频高价值操作。</li>
              <li>避免把开发运维细节直接暴露给普通角色。</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section__header stack">
          <span className="section__eyebrow">Roadmap Ready</span>
          <h2 className="section__title">这套页面为什么能直接落地</h2>
        </div>
        <div className="roadmap-grid">
          <article className="roadmap-card compact">
            <h3>先接现有 API</h3>
            <p>保留了现有 fetch、路由和权限模型，页面可立即运行，不需要先重构后端协议。</p>
          </article>
          <article className="roadmap-card compact">
            <h3>再补真实数据</h3>
            <p>卡片和状态区已经按实际业务块切开，后续只需把静态文案替换成接口返回值。</p>
          </article>
          <article className="roadmap-card compact">
            <h3>最后扩功能流</h3>
            <p>知识库构建、运行队列、审计流和审批动作都已经有明确页面落点，不会返工导航结构。</p>
          </article>
        </div>
      </section>
    </main>
  );
}
