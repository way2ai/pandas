# V0 Platform Foundation Design

## Goal

Build the first executable subproject of the V0 platform: a runnable foundation covering the single web app shell, the single Go API shell, built-in authentication, session handling, tenant and membership boundaries, minimal RBAC, health endpoints, and baseline audit logging. This foundation exists to support the later V0 knowledge, RAG, agent, and workflow capabilities without reworking identity, routing, or runtime boundaries.

## Scope

This subproject includes:

- One `Next.js + React` web app under `web/`
- One modular monolith `Go` API under `api/`
- Three route domains in the web app:
  - `/app`
  - `/tenant`
  - `/admin`
- Built-in username/email + password authentication
- Session management with `HttpOnly Secure Cookie`
- User states: active and disabled
- Tenant model with tenant admin and tenant member roles
- Personal workspace concept for personal users
- Minimal RBAC gates for:
  - platform admin
  - tenant admin
  - tenant member
  - personal user
- Knowledge-base-level authorization data model only as metadata groundwork
- Health endpoints
- Baseline audit events for login and admin/member operations
- Docker Compose startup for the platform skeleton

This subproject does not include:

- Knowledge ingestion or document parsing
- Temporal workflows beyond service placeholders/config wiring
- Elasticsearch, MinIO, or Python worker business logic
- RAG chat
- ReAct agents
- Workflow DSL or React Flow runtime
- Enterprise SSO/MFA/OIDC
- Complex ABAC or document-level authorization

## Why This First

The repository currently contains design documentation but almost no implementation. Starting with the platform foundation reduces later churn because every later V0 subsystem depends on identity, tenancy, permissions, routing, runtime configuration, and operational entrypoints. Building knowledge ingestion or RAG first would force rework across request context, session propagation, audit, and access boundaries.

## Approaches Considered

### Approach A: Foundation-first modular skeleton

Create the web, API, and Compose skeleton first, with real auth, tenant, membership, and route protections.

Pros:

- Matches the V0 design docs
- Minimizes rework later
- Gives every later subsystem a stable execution boundary

Cons:

- Less visually impressive than a quick RAG demo
- Requires more initial plumbing

### Approach B: Knowledge-first demo backend

Start from file upload and build indexing first, then add auth and tenancy later.

Pros:

- Faster path to searchable content

Cons:

- High rework risk
- Violates the intended V0 boundaries around tenancy and authorization

### Approach C: Demo-first UI shell

Build the visible `/app`, `/tenant`, `/admin` pages first with mocked APIs.

Pros:

- Fast front-end progress

Cons:

- Produces weak evidence toward the actual V0 objective
- Delays the hard parts into later rework

### Recommendation

Use Approach A. It is the only option that moves directly toward the documented V0 acceptance chain with minimal discard.

## Architecture

### System shape

The foundation keeps the documented V0 architecture:

- `web/`: single Next.js app responsible for UI, route boundaries, login flow, and calling the Go API
- `api/`: single Go API responsible for auth, session issuance, tenant boundaries, RBAC checks, audit, and health
- `postgres`: system-of-record for users, tenants, memberships, sessions, and audit
- `redis`: short-TTL support for session acceleration and login throttling
- `temporal`, `elasticsearch`, `minio`: present in Compose and configuration surface, but not yet used for business logic in this subproject

### Boundary rules

- Only the Go API talks to persistence directly
- Web never encodes authorization logic as trust; it only reflects server decisions
- Every authenticated request in the API carries:
  - `trace_id`
  - `user_id`
  - `principal_type`
  - active tenant or personal workspace context
- Audit logging is written by server-side use cases, not by UI events
- Tenant isolation is explicit in all tenant-scoped tables and handlers

## Web Design

### Routes

- `/login`
  - login form
  - disabled-user and failed-login feedback
- `/app`
  - personal user and tenant member entry area
  - placeholder dashboard
- `/tenant`
  - tenant admin area
  - tenant summary
  - member invitation/list page
- `/admin`
  - platform admin area
  - users and tenants summary pages

### Route guards

- Unauthenticated users are redirected to `/login`
- Disabled users cannot enter protected routes
- `/tenant` requires tenant-admin capability
- `/admin` requires platform-admin capability
- `/app` requires any authenticated user with a valid principal

### UI philosophy

Keep the first iteration quiet and utilitarian. No marketing layer. The UI should behave as an operational shell with:

- left navigation or compact top navigation
- dense but readable tables for users/members
- simple forms for login and invitation
- explicit status badges for active/disabled state

## API Design

### Modules

The Go API should be split by responsibility rather than by technical layer:

- `auth`
  - login
  - logout
  - session validation
  - login throttling
- `users`
  - current user
  - disable/enable user
- `tenants`
  - tenant listing
  - tenant creation bootstrap
  - tenant status
- `memberships`
  - invite member
  - list tenant members
  - disable invitation or membership
- `rbac`
  - role and authorization checks
- `audit`
  - audit event recording
- `health`
  - health/readiness endpoints
- `platform`
  - admin-only summaries

### HTTP surface

Initial API surface:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/app/home`
- `GET /api/v1/tenant/home`
- `GET /api/v1/tenant/members`
- `POST /api/v1/tenant/members/invitations`
- `GET /api/v1/admin/home`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/tenants`
- `POST /api/v1/admin/users/{id}/disable`
- `POST /api/v1/admin/users/{id}/enable`

All endpoints return structured JSON with:

- `trace_id`
- `data` on success
- `error.code` and `error.message` on failure

## Data Model

### Required tables

The foundation should establish these minimum tables:

- `users`
  - identity record
  - login identifier fields
  - password hash
  - status
  - timestamps
- `sessions`
  - session id
  - user id
  - expiry
  - revocation state
  - last seen metadata
- `tenants`
  - tenant identity
  - name
  - status
  - timestamps
- `tenant_members`
  - tenant id
  - user id
  - role
  - status
  - timestamps
- `tenant_invitations`
  - tenant id
  - invitee identifier
  - inviter user id
  - role
  - status
  - expiry
- `personal_workspaces`
  - user id
  - status
- `knowledge_bases`
  - owner scope metadata only
  - workspace or tenant boundary
  - status
- `knowledge_base_memberships`
  - knowledge-base role metadata only
- `audit_logs`
  - actor
  - scope
  - action
  - result
  - trace id
  - payload summary

### Role model

System roles:

- `platform_admin`
- `personal_user`

Tenant roles:

- `tenant_admin`
- `tenant_member`

Knowledge base roles prepared in schema only:

- `owner`
- `admin`
- `editor`
- `viewer`

## Security Design

### Authentication

- Built-in credential login only
- Passwords stored as hashes, never plaintext
- Session cookie flags:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` or stricter unless local-dev override is needed
- Logout revokes the active session
- Disabled users are blocked at login and on session revalidation

### Login throttling

The foundation includes brute-force protection with per-account and per-IP throttling. Redis can back counters and short TTL lockouts. This is required in the first subproject because the V0 docs make login throttling part of the auth baseline, not a later enhancement.

### Tenant isolation

- Every tenant-scoped record includes `tenant_id`
- All tenant APIs resolve and verify tenant context on the server
- The API must not rely on front-end filtering for tenant isolation

## Audit and Trace

### Trace

Every API request receives or generates a `trace_id`. That id is:

- returned in the response
- attached to audit records
- included in structured logs

### Initial audit events

The foundation must audit at least:

- login success
- login failure
- logout
- user disable/enable
- tenant creation
- tenant invitation create
- tenant membership changes

Audit payloads must be summaries only. No password, cookie, token, or secret material is logged.

## Compose Design

### Required services in the first Compose file

- `web`
- `api`
- `postgres`
- `redis`
- `temporal`
- `elasticsearch`
- `minio`

For this subproject:

- `web`, `api`, `postgres`, and `redis` must be functionally wired
- `temporal`, `elasticsearch`, and `minio` may be health-only placeholders as long as configuration and service naming align with later stages

This keeps the deployed shape aligned with the documented V0 while avoiding fake business logic.

## Testing Strategy

The implementation phase should follow strict TDD.

### API tests

- auth login success/failure
- disabled user rejection
- session validation
- route authorization for `/app`, `/tenant`, `/admin`
- tenant member listing authorization
- invitation authorization
- admin user disable/enable
- health endpoint readiness behavior

### Web tests

- login page flow
- protected-route redirect behavior
- role-based access behavior for the three route domains

### Integration tests

- Compose boot with functional `web`, `api`, `postgres`, `redis`
- end-to-end login and protected route access

## Acceptance Criteria

This subproject is done when current evidence proves:

1. The web app runs and exposes `/login`, `/app`, `/tenant`, and `/admin`.
2. The Go API runs and exposes the auth, tenant, admin, and health endpoints listed above.
3. Users can log in with built-in credentials and receive a valid session cookie.
4. Logout invalidates the session.
5. Disabled users cannot log in or continue using protected routes.
6. Platform admin, tenant admin, tenant member, and personal user boundaries are enforced server-side.
7. Tenant admins can view members and create invitations within their tenant only.
8. Platform admins can view users and tenants, and can disable or enable users.
9. Audit events are written for the initial critical operations.
10. Each API response includes a `trace_id`.
11. Docker Compose starts the platform skeleton with the required service names.

## Risks and Controls

### Risk: overbuilding infrastructure before business value

Control: keep this subproject limited to identity, boundaries, and platform shell only.

### Risk: fake placeholders that will be thrown away later

Control: placeholder services are allowed only for later-stage infrastructure wiring, not for fake business features.

### Risk: authorization logic split between UI and API

Control: API remains authoritative; UI only uses API results and session state.

### Risk: schema drift before knowledge/RAG work starts

Control: include only the metadata fields required by the current design docs and later V0 boundaries. Do not add speculative v1 abstractions.

## Implementation Handoff

After review of this design doc, the next step is a concrete implementation plan for the platform foundation, followed by execution in small TDD-driven tasks.
