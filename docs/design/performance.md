# v0 性能、可靠性与运行治理设计

> 本文定义 v0 的性能、可靠性、部署、观测和安全治理口径。v0 不以完整生产 HA 为目标，而以可用 MVP、可观测、可备份、可迁移和可后续扩展为目标。

## 1. v0 运行目标

| 类型 | v0 目标 |
| --- | --- |
| 可用闭环 | 知识接入、构建、RAG、ReAct、工作流、审计和最小后台端到端可运行。 |
| 可靠执行 | ReAct 和工作流统一基于 Temporal 执行，支持持久化状态、重试、超时、取消和执行历史。 |
| 检索性能 | Elasticsearch 同时承担关键词检索和向量检索，权限过滤下推到查询阶段。 |
| 部署便利 | Docker Compose 是必交付；Helm/Kubernetes 只提供可选基线。 |
| 数据安全 | 文件进入 S3 兼容对象存储，权限主数据在 PostgreSQL，检索索引可重建。 |
| 可观测 | Go API、Python Worker、Temporal workflow、Elasticsearch 构建和模型调用都有 Trace、日志和指标。 |

## 2. 部署与组件形态

v0 必须提供 Docker Compose 部署，包含：

- Next.js Web
- Go API
- Python AI Worker
- Temporal
- PostgreSQL
- Elasticsearch
- Redis
- MinIO
- 可选 Grafana/Tempo/Prometheus 或等价观测组件

v0 产物必须容器化。Helm Chart 或 Kubernetes manifests 可提供实验性基线，但以下能力不作为 v0 验收门槛：

- HPA
- PDB
- 灰度发布
- 蓝绿发布
- Kubernetes 资源治理页面
- PostgreSQL Patroni/同步复制/自动切换

## 3. PostgreSQL v0 口径

v0 不做完整 PostgreSQL HA，只做生产可迁移的单主部署规范：

- 使用单主 PostgreSQL 或托管实例。
- 必须提供数据库迁移机制。
- 必须有自动备份方案；生产建议 PITR，测试/POC 至少日备份。
- 表结构、索引、审计、租户隔离按生产标准设计。
- 连接池可以先使用应用连接池；需要独立池化时再引入 pgbouncer。

v0 不交付：

- Patroni
- etcd 选主
- 同步复制
- 一主多从
- 自动故障切换演练
- pgbouncer 压测门槛

后续 v1+ 做 PG HA 时，不应改变业务数据模型和权限主数据边界。

## 4. Elasticsearch 检索治理

v0 使用 Elasticsearch 同时做关键词检索和向量检索：

- 每个切片包含权限过滤字段：`tenant_id`、`workspace_id`、`knowledge_base_id`、`document_id`、`version_id`、授权摘要字段。
- 权限过滤必须在 Elasticsearch query/filter 阶段下推。
- RAG 不允许只做召回后权限过滤。
- 索引按知识库和版本组织，可使用 alias 发布当前版本。
- PostgreSQL 保存索引版本主数据，Elasticsearch 保存可重建索引。
- 构建失败不得影响已发布 alias。
- 删除知识库或文档时，先在 PostgreSQL 标记状态，再异步清理 ES 索引。

v0 需要定义以下限制：

- 单文件最大大小。
- 单文档最大切片数。
- 单租户最大知识库数量。
- 单次检索 top-k 上限。
- 单次上下文 token 预算。
- ES 响应最大大小和超时。

## 5. Temporal 执行治理

Temporal 是 v0 统一执行引擎底座。

### 5.1 Workflow 类型

v0 至少包含：

- 知识构建 workflow。
- RAG 对话 workflow 或可追踪任务。
- ReAct 智能体 workflow。
- 可视化工作流 workflow。
- Human Approval 等待 workflow。

### 5.2 Activity 约束

每个 Activity 必须定义：

- 输入 schema。
- 输出 schema。
- 超时。
- 重试策略。
- 幂等键或去重策略。
- 错误码。
- 审计摘要。
- TraceId 传播。

LLM、Embedding、HTTP Request、Elasticsearch 写入、对象存储读写必须设置超时和最大响应大小。

### 5.3 运行限制

v0 必须支持：

- 工作流取消。
- 失败重试。
- 失败原因记录。
- 节点运行日志。
- 运行实例绑定发布版本。
- ReAct `max_steps`。
- Token 预算。
- HTTP allowlist。

v0 不做循环节点、并行分支、子工作流和定时触发器。

## 6. 并发、限流与资源隔离

v0 至少实现以下限流：

| 场景 | 维度 | 策略 |
| --- | --- | --- |
| 登录 | IP、账号 | 防暴力破解、失败次数限制 |
| 文件上传 | 用户、租户、文件大小 | 文件大小、频率、并发数限制 |
| 知识构建 | 租户、知识库 | 同时构建任务数限制 |
| RAG 对话 | 用户、租户 | 并发会话、请求频率、top-k、Token 预算 |
| ReAct | 用户、租户、智能体 | `max_steps`、总超时、单步超时、Token 预算 |
| 工作流运行 | 用户、租户、工作流 | 并发运行数、节点超时 |
| HTTP Request 节点 | 域名、租户 | allowlist、频率、响应大小、超时 |

Redis 可用于会话、短 TTL 状态和限流缓存。Redis 命令必须通过统一封装；禁止业务代码直接调用高风险原生命令。允许审计封装后的单 key 失效和受控 cursor scan。

## 7. 文件解析与安全

v0 文件接入支持 PDF、Markdown、TXT、DOCX、CSV、XLSX、HTML、单 URL 网页、PPTX。

要求：

- 校验文件类型、大小和内容类型。
- 上传后异步解析。
- 原文件进入对象存储。
- 解析结果和中间产物进入对象存储或数据库摘要。
- 解析失败可重试。
- 网页抓取遵守 robots.txt。
- 表格公式只读取计算后展示值，不执行公式。
- 不做图片 OCR、音视频、登录态网页抓取、递归爬站。

建议 v0 预留病毒扫描接口；如果首版不接实际扫描引擎，必须在文档中标注环境风险。

## 8. 模型调用治理

v0 抽象模型适配层，但首版只启用：

- 一个主 LLM。
- 一个 embedding 模型。
- 可选重排模型。

模型治理要求：

- 平台级模型配置，不支持租户自带 key。
- 配置 provider、base URL、model、API key。
- 不记录 API key。
- 不记录敏感 prompt 明文。
- 记录租户、模型、Token、耗时、错误码和 TraceId。
- 设置总超时、首字超时、最大输出 token 和重试次数。
- 模型调用失败应返回标准错误码。

## 9. 观测与审计

### 9.1 指标

v0 至少采集：

- Go API 请求量、错误率、P95/P99 延迟。
- 登录失败次数。
- 文件上传成功/失败。
- 知识构建耗时、失败率、队列等待时间。
- Elasticsearch 查询耗时、写入耗时、错误率。
- RAG 召回数量、生成耗时、引用数量。
- ReAct 步骤数、失败率、平均耗时。
- 工作流运行数、失败数、取消数、节点耗时。
- LLM/Embedding Token、耗时、错误率。
- Temporal workflow/activity 失败和重试。

### 9.2 日志与 Trace

- 每个前端请求、Go API 请求、Temporal workflow、Python activity、模型调用、ES 查询都必须关联 TraceId。
- 审计日志和业务日志分离。
- 日志中禁止记录密码、Token、API key、模型密钥、Cookie、原始敏感 prompt、内部物理路径。
- HTTP Request 节点日志只记录脱敏后的 URL、方法、状态码、耗时、响应摘要。

### 9.3 审计事件

v0 必须审计：

- 登录、退出、登录失败。
- 创建/更新/删除知识库。
- 上传文件、抓取网页。
- 发布知识库索引版本。
- 创建/发布/停用智能体。
- 创建/发布/停用工作流。
- 运行 ReAct 智能体和工作流。
- HTTP Request 节点调用。
- Human Approval 操作。
- 管理员禁用用户、修改租户状态、重试/取消任务。

## 10. v0 验收口径

v0 验收应以具体链路为准：

- 内置账号可登录，租户成员可邀请。
- 个人空间和企业租户数据隔离。
- 知识库可上传 PDF/Markdown/TXT/DOCX/CSV/XLSX/HTML/PPTX，单 URL 网页抓取遵守 robots.txt。
- 知识构建可通过 Temporal 执行，失败可重试，成功后发布 ES alias。
- RAG 对话可基于授权知识库回答并返回来源引用。
- ES 权限过滤下推通过测试，不能召回未授权知识库切片。
- ReAct 智能体可在受控 Action 范围内运行，并受 `max_steps`、超时和 Token 预算限制。
- React Flow 工作流可编辑、发布、运行，并绑定发布版本。
- Human Approval 节点可暂停和恢复运行。
- 最小管理员后台可查看用户、租户、任务、审计和健康。
- Compose 一键启动核心组件。
- 核心链路具备 TraceId、审计日志和基础指标。

## 11. v1+ 后置治理

以下能力放到 v1+：

- 完整 Kubernetes 生产治理。
- PostgreSQL Patroni/同步复制/多从 HA。
- 完整告警路由、值班和升级策略。
- 公开 Open API/SDK。
- 完整 MCP/插件市场。
- 多模型供应商路由、BYOK。
- 企业 SSO、MFA、复杂 ABAC。
