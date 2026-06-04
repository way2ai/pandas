# Agent 开发规范

本文件约束本仓库后续开发。任何实现、重构、测试和文档更新都必须优先遵守 `docs/design` 下的 v0 设计文档：

- `docs/design/plan.md`
- `docs/design/design.md`
- `docs/design/functions.md`
- `docs/design/performance.md`

如果本文件与上述设计文档冲突，以 `docs/design` 的 v0 设计为准；如果需要改变 v0 边界，必须先更新设计文档，再改代码。

## 1. 总目标

v0 只交付一个可运行、可演示、可继续扩展的智能体知识平台 MVP：

```text
内置账号 -> 个人/租户空间 -> 知识材料接入 -> Temporal 知识构建
-> Elasticsearch 关键词/向量检索 -> RAG 对话 -> ReAct 智能体
-> React Flow 可视化工作流 -> 审计/Trace/最小管理员后台
```

开发时优先完成端到端最小闭环，不要提前扩展企业级平台能力。

## 2. v0 不做范围

以下能力不进入 v0。除非设计文档先明确调整，否则不要实现、预留复杂实现或引入强依赖：

- 公开 Open API、SDK、开发者应用、签名协议。
- 完整 MCP、第三方插件市场、用户自定义 MCP Server。
- 任意脚本工具、本地命令执行、自定义代码节点。
- 完整系统运维 Web 端、Kubernetes 生产治理、发布回滚页面、告警路由管理。
- PostgreSQL Patroni、同步复制、多从、自动故障切换演练。
- 企业 SSO/OIDC/MFA、SAML、LDAP。
- 复杂 ABAC、部门、岗位、字段级、文档级、标签级权限。
- 多模型供应商路由、租户自带 key、BYOK、自动 fallback、成本优化。
- 网页递归爬取、登录态抓取、JS 渲染页面抓取、反爬绕过。
- 工作流循环、并行分支、子工作流、数据库查询节点、MCP 工具节点、定时触发器。

## 3. 架构边界

- 前端使用单个 `Next.js + React` 应用，通过 `/app`、`/tenant`、`/admin` 区分普通用户区、租户管理区和平台管理员区。
- 后端使用 `Go` 模块化单体，不按微服务拆分；模块边界体现在包、接口、数据模型和权限边界中。
- AI 与异步执行由 `Python AI Worker` 承担，文件解析、切片、Embedding、RAG、ReAct step、LLM 调用和内置工具执行都由 `Temporal` 调度。
- ReAct 智能体和可视化工作流必须共用 `Temporal` 执行底座、运行实例、步骤状态、变量上下文、审计、Trace 和运行日志。
- 检索统一使用 `Elasticsearch` 同时承载关键词检索和向量检索，不引入独立向量数据库。
- 文件和解析中间产物进入 S3 兼容对象存储；Compose 默认 `MinIO`，生产可迁移到 S3/OSS/COS。
- `PostgreSQL` 保存用户、租户、权限、知识库元数据、工作流/智能体定义、发布版本、任务索引、审计和索引版本主数据。
- `Redis` 只通过统一封装用于会话、短 TTL 状态和限流缓存；业务代码不得直接调用高风险原生命令。

## 4. 用户、入口与权限

- v0 用户类型固定为个人用户、租户管理员、租户成员、平台管理员。
- 个人用户和租户成员主要使用 `/app`。
- 租户管理员使用 `/tenant` 管理成员、知识库权限、工作流/智能体配置和基础审计。
- 平台管理员使用 `/admin` 管理用户、租户、任务、审计、健康和外部观测链接。
- 权限模型只做最小 RBAC + 知识库级资源权限。
- 知识库权限只允许 `owner`、`admin`、`editor`、`viewer`。
- 文档和切片继承知识库权限，不单独实现文档级或字段级权限。
- 任何查询、接口和异步任务都必须带上租户/空间/知识库边界，避免跨租户数据泄漏。

## 5. 认证与会话

- v0 使用内置邮箱/用户名 + 密码登录。
- Session 使用 `HttpOnly Secure Cookie`。
- 必须支持退出登录、会话过期、禁用用户和租户成员邀请。
- 可以预留 OIDC/SSO 扩展点，但不要把企业 SSO、SAML、LDAP、MFA 做进 v0 必交付。
- 登录必须按 IP 和账号维度做失败次数限制，防止暴力破解。

## 6. 知识库与文件接入

- v0 支持 `PDF`、`Markdown`、`TXT`、`DOCX`、`CSV`、`XLSX`、`HTML`、`PPTX` 上传。
- v0 支持单 URL HTML 抓取，必须遵守 `robots.txt`，并限制超时、最大响应大小、content-type 和重定向次数。
- 表格只作为知识库检索材料，不做结构化数据分析；公式只读取计算后的展示值，不执行公式。
- 文件必须校验类型、大小和内容类型，上传后异步解析。
- 原始文件和解析中间产物必须进入对象存储。
- 知识构建流程必须由 `Temporal` 调度 Python Worker：

```text
上传/抓取 -> 校验 -> 对象存储落盘 -> 解析 -> 清洗 -> 切片
-> Embedding -> 写入 Elasticsearch -> 验证 -> alias 发布
```

- 构建任务必须支持状态查询、失败重试、取消和重新构建。
- 每次成功构建都生成索引版本，并通过 Elasticsearch alias 发布。
- 构建失败不得影响已发布 alias。

## 7. 检索与 RAG

- Elasticsearch 切片必须包含 `tenant_id`、`workspace_id`、`knowledge_base_id`、`document_id`、`version_id`、权限字段、文本和 embedding。
- 权限过滤必须在 Elasticsearch `query/filter` 阶段下推，禁止只依赖召回后过滤。
- 召回后可以做二次权限校验，但不能补救设计上的查询下推缺失。
- RAG 必须支持选择一个或多个授权知识库、关键词召回、向量召回、上下文裁剪、LLM 生成、多轮会话、用户反馈、来源引用、审计和 TraceId。
- RAG 不得通过答案、引用、摘要、统计或错误信息泄漏无权文档细节。
- 必须定义并执行单次检索 top-k、上下文 token 预算、ES 响应大小和超时限制。

## 8. ReAct 智能体

- ReAct 是受控智能体，不是开放工具执行平台。
- 智能体定义必须包含名称、描述、系统 Prompt、绑定知识库范围、可用 Action、`max_steps`、单步超时、总超时、Token 预算和失败停止策略。
- 智能体配置使用草稿 + 发布版本模型；运行实例必须绑定发布版本。
- v0 ReAct 只允许以下 Action：
  - `RAG Retrieve`
  - `LLM`
  - `HTTP Request`
  - `Final Answer`
- `HTTP Request` 必须受域名 allowlist、参数 schema、响应大小限制、超时限制和审计约束。
- 高风险 HTTP 请求必须进入 `Human Approval`。
- ReAct 不得执行任意代码、数据库查询、本地命令、写文件、操作系统资源或用户自定义 MCP Server。
- Temporal 必须记录每一步 `Thought/Action/Observation` 摘要、状态、耗时、错误和 TraceId。

## 9. 可视化工作流

- v0 使用 `React Flow` 作为画布，但后端只保存并执行平台自定义 `Workflow DSL`。
- 禁止把 React Flow 内部 JSON 作为后端执行协议。
- 后端必须校验 DSL schema 和节点规则。
- 工作流使用草稿 + 不可变发布版本模型；运行实例必须绑定发布版本。
- 修改草稿不得影响已运行或历史运行。
- 草稿同一时间只允许一个编辑者获得编辑锁，保存使用乐观锁。
- v0 只支持以下 8 类节点：
  - `Start`
  - `End`
  - `LLM`
  - `RAG Retrieve`
  - `ReAct Agent`
  - `HTTP Request`
  - `Condition`
  - `Human Approval`
- 节点运行历史必须记录输入/输出摘要、状态、耗时、错误和 TraceId。
- `Human Approval` 必须支持暂停和恢复运行。

## 10. Temporal 执行治理

- v0 至少包含知识构建 workflow、RAG 对话 workflow 或可追踪任务、ReAct 智能体 workflow、可视化工作流 workflow、Human Approval 等待 workflow。
- 每个 Activity 必须定义输入 schema、输出 schema、超时、重试策略、幂等键或去重策略、错误码、审计摘要和 TraceId 传播。
- LLM、Embedding、HTTP Request、Elasticsearch 写入、对象存储读写必须设置超时和最大响应大小。
- 运行必须支持取消、失败重试、失败原因记录、节点运行日志、发布版本绑定、`max_steps`、Token 预算和 HTTP allowlist。

## 11. 模型调用治理

- 必须保留模型适配层，但 v0 只启用一个主 LLM 和一个 embedding 模型；重排模型可选。
- 模型密钥由平台级配置提供，不支持租户自带 key。
- 配置项可以包含 provider、base URL、model、API key，但日志和审计中禁止记录 API key。
- 禁止记录敏感 prompt 明文。
- 必须记录租户、模型、Token、耗时、错误码和 TraceId。
- 模型调用必须设置总超时、首字超时、最大输出 token 和重试次数。
- 模型调用失败必须返回标准错误码，不能把底层敏感响应直接透出。

## 12. 观测、日志与审计

- 每个前端请求、Go API 请求、Temporal workflow、Python activity、模型调用和 ES 查询都必须关联 TraceId。
- 审计日志和业务日志必须分离。
- 日志中禁止记录密码、Token、API key、模型密钥、Cookie、原始敏感 prompt、内部物理路径。
- HTTP Request 节点日志只记录脱敏 URL、方法、状态码、耗时和响应摘要。
- v0 至少采集 Go API 请求量、错误率、P95/P99 延迟、登录失败、文件上传成功/失败、知识构建耗时和失败率、ES 查询/写入耗时、RAG 召回和生成耗时、ReAct 步骤和失败率、工作流运行数、LLM/Embedding Token 和 Temporal 失败/重试指标。
- 必须审计登录、退出、登录失败、知识库变更、文件上传、网页抓取、索引版本发布、智能体创建/发布/停用、工作流创建/发布/停用、ReAct 和工作流运行、HTTP Request 调用、Human Approval 操作、管理员禁用用户、租户状态修改、任务重试和取消。

## 13. 部署与运行

- Docker Compose 是 v0 必交付，必须能启动 Next.js Web、Go API、Python AI Worker、Temporal、PostgreSQL、Elasticsearch、Redis 和 MinIO。
- 可选提供 Grafana、Tempo、Prometheus 或等价观测组件。
- v0 产物必须容器化。
- Helm Chart 或 Kubernetes manifests 只能作为实验性基线，不作为 v0 验收门槛。
- PostgreSQL v0 使用单主或托管实例，必须提供数据库迁移机制和自动备份方案。
- 生产建议 PITR，测试/POC 至少日备份。
- 表结构、索引、审计和租户隔离按生产标准设计，即使 v0 不做完整 HA。

## 14. 限流与资源保护

- 登录按 IP 和账号限流。
- 文件上传按用户、租户、文件大小、频率和并发数限制。
- 知识构建按租户和知识库限制同时构建任务数。
- RAG 按用户和租户限制并发会话、请求频率、top-k 和 Token 预算。
- ReAct 按用户、租户和智能体限制 `max_steps`、总超时、单步超时和 Token 预算。
- 工作流运行按用户、租户和工作流限制并发运行数和节点超时。
- HTTP Request 节点按域名和租户限制 allowlist、频率、响应大小和超时。

## 15. 开发工作方式

- 开发任何功能前，先对照 `docs/design` 确认它属于 v0 范围。
- 优先实现纵向闭环，再补横向完备性。
- 新增模块必须有明确边界，不为 v1+ 能力提前引入复杂抽象。
- 设计数据库、索引和接口时必须显式包含租户、空间、权限和审计字段。
- 涉及检索、RAG、ReAct、工作流、HTTP Request、模型调用和文件处理的代码必须包含安全限制、超时、错误码、TraceId 和审计。
- 新增异步任务必须说明 Temporal workflow/activity 边界、重试、幂等和取消行为。
- 新增前端入口必须匹配 `/app`、`/tenant`、`/admin` 的用户边界和权限。
- 不要绕过统一封装直接访问 Redis、对象存储、模型 provider、HTTP 外呼或 Elasticsearch。
- 不要在日志、错误、测试快照或示例数据中写入真实密钥、Token、Cookie、敏感 prompt 或内部路径。

## 16. v0 验收检查

提交或合并前，至少确认当前改动没有破坏以下 v0 验收链路：

- 内置账号可登录，租户成员可邀请。
- 个人空间和企业租户数据隔离。
- 支持范围内文件可上传并异步构建。
- 单 URL 网页抓取遵守 `robots.txt`。
- 知识构建由 Temporal 执行，失败可重试，成功后发布 ES alias。
- RAG 只基于授权知识库回答，并返回来源引用。
- ES 权限过滤下推通过测试，不能召回未授权切片。
- ReAct 只在受控 Action 范围内运行，并受 `max_steps`、超时和 Token 预算限制。
- React Flow 工作流可编辑、发布、运行，并绑定发布版本。
- Human Approval 节点可暂停和恢复。
- 最小管理员后台可查看用户、租户、任务、审计和健康。
- Compose 可以复现启动核心组件。
- 核心链路具备 TraceId、审计日志和基础指标。
