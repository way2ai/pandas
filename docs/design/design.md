# v0 目标业务架构与技术架构设计

> 本文定义从零建设新平台的 v0 架构边界。v0 目标是交付一个可用的智能体知识平台 MVP，而不是一次性建设完整企业级平台。首版聚焦账号、最小租户、知识库、RAG 对话、基于 ReAct 的受控智能体、React Flow 可视化工作流、Temporal 统一执行引擎和最小管理员后台。

## 1. v0 架构原则

- 最小闭环优先：先打通账号、租户、知识库接入、知识构建、检索、生成、智能体执行、工作流运行、审计和观测。
- 单应用前端：v0 使用一个 Next.js 应用，通过路由和权限区分普通用户区、租户管理区和平台管理员区。
- 模块化单体优先：v0 后端先使用 Go 模块化单体，不拆一组微服务；服务边界先体现在代码模块、接口和数据模型中。
- 统一执行引擎：ReAct 智能体和可视化工作流共用 Temporal 执行底座、任务实例、步骤状态、审计、Trace 和变量上下文。
- 受控工具优先：v0 只开放内置受控工具，不开放完整 MCP、第三方插件市场、任意脚本、本地命令或用户自定义 MCP Server。
- Elasticsearch 单检索后端：v0 使用 Elasticsearch 同时承载关键词检索和向量检索，不引入独立向量数据库。
- Docker Compose 必交付：v0 支持本地/单机 Compose 部署；Helm/Kubernetes 只提供可选基线，不作为 v0 验收门槛。
- 生产可迁移：PostgreSQL、Elasticsearch、MinIO、Redis、Temporal 都按可迁移到生产托管或集群形态的接口和数据边界设计。

## 2. 用户与入口边界

| 用户类型 | v0 入口 | 主要能力 | 不做内容 |
| --- | --- | --- | --- |
| 个人用户 | `/app` | 个人空间、个人知识库、RAG 对话、受控 ReAct 智能体、工作流运行 | 个人 API Key、公开 SDK、复杂配额报表 |
| 租户管理员 | `/tenant` | 租户成员、知识库权限、工作流/智能体配置、基础审计 | 部门、岗位、复杂角色矩阵、企业 SSO |
| 租户成员 | `/app` | 使用被授权知识库、RAG 对话、智能体和工作流 | 复杂 ABAC、文档级字段级权限 |
| 平台管理员 | `/admin` | 租户、用户、任务、审计、健康、Temporal/Grafana 链接 | 完整 K8s 运维台、PG HA 操作台、告警路由管理 |

v0 权限模型采用最小 RBAC + 知识库级资源权限：

- 平台管理员
- 租户管理员
- 租户成员
- 个人用户

知识库权限只做到 `owner/admin/editor/viewer`。文档和切片继承知识库权限，不做文档级、字段级、部门级、标签级 ABAC。

## 3. v0 业务架构

```mermaid
flowchart TB
    User[个人用户/租户成员]
    TenantAdmin[租户管理员]
    PlatformAdmin[平台管理员]

    subgraph Web[单个 Next.js Web 应用]
        App[/app 普通使用区]
        Tenant[/tenant 租户管理区]
        Admin[/admin 最小管理员后台]
        Canvas[React Flow 工作流画布]
    end

    subgraph Go[Go 模块化单体 API]
        Auth[账号与会话模块]
        TenantMod[租户与成员模块]
        Rbac[RBAC 与知识库权限模块]
        Knowledge[知识库元数据模块]
        WorkflowDef[工作流/智能体定义模块]
        RuntimeApi[执行与任务 API]
        Audit[审计模块]
        AdminApi[后台管理模块]
    end

    subgraph Runtime[统一执行引擎]
        Temporal[Temporal Server]
        PyWorker[Python AI Worker]
    end

    subgraph AI[AI 能力]
        ModelAdapter[模型适配层]
        Rag[RAG 检索与生成]
        ReAct[ReAct Step 执行]
        Tools[内置受控工具]
    end

    subgraph Data[数据与存储]
        Pg[(PostgreSQL)]
        Es[(Elasticsearch<br/>关键词 + 向量检索)]
        Minio[(S3 兼容对象存储<br/>MinIO/S3/OSS/COS)]
        Redis[(Redis)]
    end

    User --> App
    TenantAdmin --> Tenant
    PlatformAdmin --> Admin
    App --> Canvas
    Tenant --> Canvas
    Web --> Go

    Go --> Pg
    Go --> Redis
    Go --> Minio
    Go --> Es
    RuntimeApi --> Temporal
    Temporal --> PyWorker
    PyWorker --> ModelAdapter
    PyWorker --> Rag
    PyWorker --> ReAct
    PyWorker --> Tools
    Rag --> Es
    PyWorker --> Pg
    PyWorker --> Minio
```

## 4. v0 技术组件

| 组件 | v0 职责 | 备注 |
| --- | --- | --- |
| Next.js + React | 单 Web 应用、路由守卫、RAG 对话、智能体配置、React Flow 工作流画布、最小管理员后台 | 不拆 user-web/ops-web |
| React Flow | 工作流画布节点、连线、拖拽、缩放、选择 | 后端只认平台自定义 Workflow DSL，不依赖 React Flow JSON |
| Go API | 内部 Web API、账号、租户、RBAC、知识库元数据、工作流定义、Temporal client、审计、后台管理 | 模块化单体 |
| Python AI Worker | 文件解析、切片、Embedding、RAG、ReAct step、LLM 调用、内置工具执行 | 由 Temporal 调度 |
| Temporal | 统一执行引擎底座，承载持久化执行、重试、超时、暂停恢复、执行历史 | 不自研核心调度 |
| PostgreSQL | 用户、租户、权限、知识库元数据、工作流定义、发布版本、任务索引、审计 | v0 单主或托管实例 |
| Elasticsearch | 文本切片、embedding、关键词检索、向量检索、权限过滤下推、索引 alias 发布 | 不引入独立向量库 |
| MinIO/S3 | 原始文件、解析中间产物、导出结果 | Compose 默认 MinIO，生产可切换 S3/OSS/COS |
| Redis | 会话、短 TTL 状态、限流缓存 | 通过统一封装访问 |

## 5. 执行引擎设计

ReAct 智能体和可视化工作流是同一执行引擎的两种入口：

- ReAct 智能体：由对话入口驱动，运行时生成受控的 `Thought/Action/Observation` 步骤。
- 可视化工作流：由 React Flow 画布入口驱动，用户显式编排节点和边。
- 底层共用：Temporal workflow/activity、运行实例、步骤状态、变量上下文、工具调用、权限校验、审计、Trace 和运行日志。

v0 工作流版本模型：

- 草稿可编辑。
- 发布后生成不可变版本。
- 运行实例必须绑定发布版本。
- 修改草稿不影响已运行或历史运行。
- 支持停用版本，不做复杂灰度发布。

v0 工作流节点限制为：

| 节点 | 用途 |
| --- | --- |
| Start | 定义输入参数和启动上下文 |
| End | 定义输出结果 |
| LLM | 调用平台级主 LLM |
| RAG Retrieve | 从授权知识库检索上下文 |
| ReAct Agent | 执行受控 ReAct 推理和 Action |
| HTTP Request | 调用 allowlist 内 HTTP 接口，带 schema、超时、大小限制和审计 |
| Condition | 条件判断 |
| Human Approval | 人工确认或高风险动作批准 |

v0 不做循环、并行分支、子工作流、自定义代码、数据库查询、MCP 工具节点和定时触发器。

## 6. ReAct v0 边界

ReAct Agent 只能调用以下 Action：

- RAG Retrieve
- LLM
- HTTP Request
- Final Answer

约束：

- HTTP Request 必须经过域名 allowlist、参数 schema、响应大小限制和审计。
- 高风险 HTTP 请求必须进入 Human Approval。
- 必须配置 `max_steps`、单步超时、总超时、Token 预算和失败停止策略。
- 不允许执行任意代码、数据库查询、本地命令、写文件、操作系统资源或用户自定义 MCP Server。

## 7. 检索与索引架构

v0 使用 Elasticsearch 同时承载关键词检索和向量检索：

- 文档切片写入 Elasticsearch。
- 每个切片必须包含 `tenant_id`、`workspace_id`、`knowledge_base_id`、`document_id`、`version_id`、权限字段、文本和 embedding。
- 关键词召回和向量召回都在 Elasticsearch 内完成。
- 权限过滤必须作为 Elasticsearch query/filter 下推，不做召回后过滤。
- 索引版本通过 alias 切换发布。
- PostgreSQL 保存元数据、任务状态、权限主数据和索引版本主数据。

## 8. 认证与模型配置

v0 认证：

- 内置邮箱/用户名 + 密码登录。
- Session 使用 HttpOnly Secure Cookie。
- 支持邀请成员、禁用用户、退出登录、会话过期。
- 预留 OIDC/SSO 扩展点，但不作为 v0 必交付。

v0 模型：

- 抽象模型适配层。
- 首版只接一个主 LLM 和一个 embedding 模型。
- 平台级模型配置，不支持租户自带 key。
- 记录租户级 Token、耗时、错误码和调用量，不记录敏感 prompt 明文。

## 9. 后续阶段边界

v0 不交付以下能力，只在架构上预留扩展点：

- 公开 Open API/SDK、开发者应用、签名协议和第三方 SDK。
- 完整 MCP/第三方插件市场、用户自定义 MCP Server、任意脚本工具。
- 完整系统运维 Web 端、Kubernetes 治理、发布回滚页面、告警路由管理。
- PostgreSQL Patroni/同步复制/多从/自动故障切换演练。
- 企业 SSO/OIDC/MFA、复杂 ABAC、部门/岗位/字段级权限。
- 多供应商模型路由、BYOK、成本优化、自动 fallback。
