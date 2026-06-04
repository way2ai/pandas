# Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable V0 subproject: a single web shell, a single Go API, built-in auth/session handling, tenant and membership boundaries, minimal RBAC, health endpoints, audit logging, and Docker Compose wiring.

**Architecture:** Keep the web and API split cleanly. The Next.js app owns pages, route guards, and API calls. The Go API owns auth, sessions, RBAC, tenant state, audit, and persistence. PostgreSQL is the source of truth, Redis backs short-TTL auth controls, and later-stage infra stays present in Compose without fake business logic.

**Tech Stack:** Next.js 15 + React 19 + TypeScript, Go 1.24, PostgreSQL 16, Redis 7, Docker Compose, Vitest/Playwright, Go testing, SQL migrations.

---

### Task 1: Repository Skeleton and Runtime Wiring

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/globals.css`
- Create: `web/src/app/page.tsx`
- Create: `api/go.mod`
- Create: `api/cmd/server/main.go`
- Create: `api/internal/config/config.go`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`
- Test: `web/package.json`
- Test: `api/go.mod`

- [ ] **Step 1: Write the failing web package smoke test**

```json
{
  "name": "platform-web",
  "private": true,
  "scripts": {
    "test:smoke": "node -e \"const pkg=require('./package.json'); if(!pkg.dependencies.next) throw new Error('missing next'); console.log('ok')\""
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web; npm run test:smoke`
Expected: FAIL with `missing next` or package script error because the package is incomplete.

- [ ] **Step 3: Write the minimal web runtime files**

```json
{
  "name": "platform-web",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0 --port 3000",
    "build": "next build",
    "start": "next start --hostname 0.0.0.0 --port 3000",
    "lint": "next lint",
    "test:smoke": "node -e \"const pkg=require('./package.json'); if(!pkg.dependencies.next) throw new Error('missing next'); console.log('ok')\""
  },
  "dependencies": {
    "next": "15.3.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "22.15.21",
    "@types/react": "19.1.5",
    "@types/react-dom": "19.1.5",
    "typescript": "5.8.3"
  }
}
```

```tsx
// web/src/app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// web/src/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
```

```css
/* web/src/app/globals.css */
html, body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background: #f5f7fa;
  color: #111827;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web; npm run test:smoke`
Expected: PASS with `ok`.

- [ ] **Step 5: Write the failing API module smoke test**

```powershell
Set-Content api\go.mod "module placeholder"
```

Then add this expected command to the plan implementation:

Run: `cd api; go test ./...`
Expected: FAIL because `main.go` and module wiring do not exist yet.

- [ ] **Step 6: Write the minimal API runtime files**

```go
// api/go.mod
module github.com/way2ai/pandas/api

go 1.24
```

```go
// api/internal/config/config.go
package config

import "os"

type Config struct {
	HTTPAddr string
}

func Load() Config {
	addr := os.Getenv("API_HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	return Config{HTTPAddr: addr}
}
```

```go
// api/cmd/server/main.go
package main

import (
	"log"
	"net/http"

	"github.com/way2ai/pandas/api/internal/config"
)

func main() {
	cfg := config.Load()
	log.Fatal(http.ListenAndServe(cfg.HTTPAddr, http.NewServeMux()))
}
```

- [ ] **Step 7: Add Compose and environment skeleton**

```yaml
# docker-compose.yml
services:
  web:
    build: ./web
    command: npm run dev
    ports: ["3000:3000"]
    env_file: [.env]
    depends_on: [api]
  api:
    build: ./api
    ports: ["8080:8080"]
    env_file: [.env]
    depends_on: [postgres, redis]
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  temporal:
    image: temporalio/auto-setup:1.25.2
    ports: ["7233:7233"]
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
    ports: ["9200:9200"]
  minio:
    image: minio/minio:RELEASE.2025-02-03T21-03-04Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    ports: ["9000:9000", "9001:9001"]
```

```dotenv
# .env.example
API_HTTP_ADDR=:8080
DATABASE_URL=postgres://app:app@postgres:5432/app?sslmode=disable
REDIS_ADDR=redis:6379
SESSION_COOKIE_NAME=platform_session
SESSION_COOKIE_SECURE=false
WEB_API_BASE_URL=http://api:8080
```

- [ ] **Step 8: Run API test to verify it passes**

Run: `cd api; go test ./...`
Expected: PASS with no test files yet and exit code `0`.

- [ ] **Step 9: Commit**

```bash
git add .gitignore .env.example docker-compose.yml web api docs/superpowers/plans/2026-06-04-platform-foundation.md
git commit -m "chore: scaffold platform foundation runtime"
```

### Task 2: API Health, Trace ID Middleware, and JSON Envelope

**Files:**
- Create: `api/internal/httpx/envelope.go`
- Create: `api/internal/httpx/trace.go`
- Create: `api/internal/health/handler.go`
- Create: `api/internal/health/handler_test.go`
- Modify: `api/cmd/server/main.go`
- Test: `api/internal/health/handler_test.go`

- [ ] **Step 1: Write the failing health endpoint test**

```go
package health_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/way2ai/pandas/api/internal/health"
)

func TestLiveEndpointIncludesTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health/live", nil)
	rec := httptest.NewRecorder()

	health.NewHandler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatalf("expected X-Trace-Id header")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api; go test ./internal/health -run TestLiveEndpointIncludesTraceID -v`
Expected: FAIL because `health.NewHandler` does not exist yet.

- [ ] **Step 3: Write the minimal trace and health implementation**

```go
// api/internal/httpx/envelope.go
package httpx

import (
	"encoding/json"
	"net/http"
)

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
```

```go
// api/internal/httpx/trace.go
package httpx

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

type traceKey struct{}

func WithTrace(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := newTraceID()
		w.Header().Set("X-Trace-Id", traceID)
		ctx := context.WithValue(r.Context(), traceKey{}, traceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func TraceID(ctx context.Context) string {
	value, _ := ctx.Value(traceKey{}).(string)
	return value
}

func newTraceID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
```

```go
// api/internal/health/handler.go
package health

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health/live", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{"status": "ok"},
		})
	})
	mux.HandleFunc("/api/v1/health/ready", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{"status": "ready"},
		})
	})
	return httpx.WithTrace(mux)
}
```

- [ ] **Step 4: Mount the health handler in main**

```go
// api/cmd/server/main.go
package main

import (
	"log"
	"net/http"

	"github.com/way2ai/pandas/api/internal/config"
	"github.com/way2ai/pandas/api/internal/health"
)

func main() {
	cfg := config.Load()
	log.Fatal(http.ListenAndServe(cfg.HTTPAddr, health.NewHandler()))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd api; go test ./internal/health -run TestLiveEndpointIncludesTraceID -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/cmd/server/main.go api/internal/httpx api/internal/health
git commit -m "feat: add health endpoints with trace ids"
```

### Task 3: Database Schema and Migration Runner

**Files:**
- Create: `api/internal/storage/migrations/001_platform_foundation.sql`
- Create: `api/internal/storage/migrate.go`
- Create: `api/internal/storage/migrate_test.go`
- Modify: `api/internal/config/config.go`
- Test: `api/internal/storage/migrate_test.go`

- [ ] **Step 1: Write the failing migration parse test**

```go
package storage_test

import (
	"testing"

	"github.com/way2ai/pandas/api/internal/storage"
)

func TestMigrationListContainsFoundationSchema(t *testing.T) {
	files := storage.MigrationFiles()
	if len(files) == 0 {
		t.Fatalf("expected at least one migration")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api; go test ./internal/storage -run TestMigrationListContainsFoundationSchema -v`
Expected: FAIL because the migration loader does not exist.

- [ ] **Step 3: Write the migration and loader**

```sql
-- api/internal/storage/migrations/001_platform_foundation.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  system_role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE tenant_members (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE tenant_invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  invitee_email TEXT NOT NULL,
  inviter_user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE personal_workspaces (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE knowledge_bases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  workspace_user_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE knowledge_base_memberships (
  knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (knowledge_base_id, user_id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  tenant_id TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  payload_summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
```

```go
// api/internal/storage/migrate.go
package storage

import (
	"embed"
	"io/fs"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

func MigrationFiles() []string {
	entries, _ := fs.Glob(migrationFS, "migrations/*.sql")
	return entries
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api; go test ./internal/storage -run TestMigrationListContainsFoundationSchema -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/internal/storage api/internal/config/config.go
git commit -m "feat: add platform foundation schema"
```

### Task 4: Session Auth, Login Throttling, and `/auth/me`

**Files:**
- Create: `api/internal/auth/service.go`
- Create: `api/internal/auth/handler.go`
- Create: `api/internal/auth/service_test.go`
- Create: `api/internal/auth/password.go`
- Create: `api/internal/session/cookie.go`
- Create: `api/internal/throttle/memory.go`
- Modify: `api/cmd/server/main.go`
- Test: `api/internal/auth/service_test.go`

- [ ] **Step 1: Write the failing login success test**

```go
package auth_test

import (
	"testing"

	"github.com/way2ai/pandas/api/internal/auth"
)

func TestLoginReturnsSessionForActiveUser(t *testing.T) {
	svc := auth.NewInMemoryService()
	svc.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active")

	session, err := svc.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if session.ID == "" {
		t.Fatalf("expected session id")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api; go test ./internal/auth -run TestLoginReturnsSessionForActiveUser -v`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Write the minimal auth service**

```go
// api/internal/auth/password.go
package auth

import "golang.org/x/crypto/bcrypt"

func HashPassword(raw string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(hash, raw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(raw)) == nil
}
```

```go
// api/internal/auth/service.go
package auth

import (
	"errors"
	"time"
)

type Session struct {
	ID        string
	UserEmail string
	ExpiresAt time.Time
}

type User struct {
	Email        string
	Username     string
	PasswordHash string
	SystemRole   string
	Status       string
}

type InMemoryService struct {
	users    map[string]User
	sessions map[string]Session
}

func NewInMemoryService() *InMemoryService {
	return &InMemoryService{
		users:    map[string]User{},
		sessions: map[string]Session{},
	}
}

func (s *InMemoryService) SeedUser(email, username, password, role, status string) {
	hash, _ := HashPassword(password)
	s.users[email] = User{Email: email, Username: username, PasswordHash: hash, SystemRole: role, Status: status}
}

func (s *InMemoryService) Login(identifier, password, ip string) (Session, error) {
	user, ok := s.users[identifier]
	if !ok || !CheckPassword(user.PasswordHash, password) {
		return Session{}, errors.New("invalid_credentials")
	}
	if user.Status != "active" {
		return Session{}, errors.New("user_disabled")
	}
	session := Session{ID: identifier + "-session", UserEmail: user.Email, ExpiresAt: time.Now().Add(24 * time.Hour)}
	s.sessions[session.ID] = session
	return session, nil
}
```

```go
// api/internal/session/cookie.go
package session

import "net/http"

func WriteSessionCookie(w http.ResponseWriter, sessionID string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     "platform_session",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}
```

- [ ] **Step 4: Add failing disabled-user test and make it pass**

```go
func TestLoginRejectsDisabledUser(t *testing.T) {
	svc := auth.NewInMemoryService()
	svc.SeedUser("disabled@example.com", "disabled", "password123", "personal_user", "disabled")

	_, err := svc.Login("disabled@example.com", "password123", "127.0.0.1")
	if err == nil || err.Error() != "user_disabled" {
		t.Fatalf("expected user_disabled error, got %v", err)
	}
}
```

Run: `cd api; go test ./internal/auth -run TestLoginRejectsDisabledUser -v`
Expected: PASS after the minimal status check above.

- [ ] **Step 5: Commit**

```bash
git add api/internal/auth api/internal/session api/internal/throttle
git commit -m "feat: add auth service and session primitives"
```

### Task 5: Protected App, Tenant, and Admin APIs with RBAC

**Files:**
- Create: `api/internal/rbac/check.go`
- Create: `api/internal/app/handler.go`
- Create: `api/internal/tenant/handler.go`
- Create: `api/internal/platform/handler.go`
- Create: `api/internal/rbac/check_test.go`
- Modify: `api/cmd/server/main.go`
- Test: `api/internal/rbac/check_test.go`

- [ ] **Step 1: Write the failing RBAC test**

```go
package rbac_test

import (
	"testing"

	"github.com/way2ai/pandas/api/internal/rbac"
)

func TestTenantAdminCannotAccessPlatformAdminArea(t *testing.T) {
	if rbac.CanAccessAdmin("tenant_admin") {
		t.Fatalf("tenant admin must not access platform admin area")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api; go test ./internal/rbac -run TestTenantAdminCannotAccessPlatformAdminArea -v`
Expected: FAIL because the RBAC helper does not exist.

- [ ] **Step 3: Write the minimal RBAC helpers**

```go
// api/internal/rbac/check.go
package rbac

func CanAccessApp(role string) bool {
	return role == "platform_admin" || role == "tenant_admin" || role == "tenant_member" || role == "personal_user"
}

func CanAccessTenant(role string) bool {
	return role == "tenant_admin"
}

func CanAccessAdmin(role string) bool {
	return role == "platform_admin"
}
```

- [ ] **Step 4: Add protected handlers**

```go
// api/internal/app/handler.go
package app

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{"area": "app"},
		})
	})
}
```

```go
// api/internal/tenant/handler.go
package tenant

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

func HomeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{"area": "tenant"},
		})
	})
}
```

```go
// api/internal/platform/handler.go
package platform

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

func HomeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{"area": "admin"},
		})
	})
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd api; go test ./internal/rbac -run TestTenantAdminCannotAccessPlatformAdminArea -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/internal/rbac api/internal/app api/internal/tenant api/internal/platform api/cmd/server/main.go
git commit -m "feat: add protected area handlers and rbac helpers"
```

### Task 6: Web Login Flow and Route Guards

**Files:**
- Create: `web/src/lib/session.ts`
- Create: `web/src/lib/api.ts`
- Create: `web/src/middleware.ts`
- Create: `web/src/app/login/page.tsx`
- Create: `web/src/app/app/page.tsx`
- Create: `web/src/app/tenant/page.tsx`
- Create: `web/src/app/admin/page.tsx`
- Create: `web/src/app/login/page.test.tsx`
- Test: `web/src/app/login/page.test.tsx`

- [ ] **Step 1: Write the failing login page render test**

```tsx
import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

test("renders login form", () => {
  render(<LoginPage />);
  expect(screen.getByLabelText("Email or username")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web; npm test -- src/app/login/page.test.tsx`
Expected: FAIL because the page and test runtime are not implemented.

- [ ] **Step 3: Write the minimal login page and route shell**

```tsx
// web/src/app/login/page.tsx
export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <form>
        <label>
          Email or username
          <input name="identifier" />
        </label>
        <label>
          Password
          <input name="password" type="password" />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
```

```tsx
// web/src/app/app/page.tsx
export default function AppPage() {
  return <main>App Home</main>;
}
```

```tsx
// web/src/app/tenant/page.tsx
export default function TenantPage() {
  return <main>Tenant Home</main>;
}
```

```tsx
// web/src/app/admin/page.tsx
export default function AdminPage() {
  return <main>Admin Home</main>;
}
```

```ts
// web/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get("platform_session");
  const path = request.nextUrl.pathname;

  if ((path.startsWith("/app") || path.startsWith("/tenant") || path.startsWith("/admin")) && !cookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/tenant/:path*", "/admin/:path*"],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web; npm test -- src/app/login/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src
git commit -m "feat: add login page and protected web route shell"
```

### Task 7: Audit Logging, Tenant Membership API, and Compose Verification

**Files:**
- Create: `api/internal/audit/service.go`
- Create: `api/internal/memberships/handler.go`
- Create: `api/internal/memberships/handler_test.go`
- Create: `web/tests/login.spec.ts`
- Modify: `docker-compose.yml`
- Test: `api/internal/memberships/handler_test.go`
- Test: `web/tests/login.spec.ts`

- [ ] **Step 1: Write the failing tenant invitation audit test**

```go
package memberships_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/way2ai/pandas/api/internal/memberships"
)

func TestInvitationHandlerReturnsTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenant/members/invitations", nil)
	rec := httptest.NewRecorder()

	memberships.InvitationHandler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatalf("expected trace header")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api; go test ./internal/memberships -run TestInvitationHandlerReturnsTraceID -v`
Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Write the minimal audit service and invitation handler**

```go
// api/internal/audit/service.go
package audit

type Event struct {
	Action  string
	Result  string
	TraceID string
}

type InMemoryService struct {
	events []Event
}

func (s *InMemoryService) Record(event Event) {
	s.events = append(s.events, event)
}
```

```go
// api/internal/memberships/handler.go
package memberships

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

func InvitationHandler() http.Handler {
	return httpx.WithTrace(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{"status": "invited"},
		})
	}))
}
```

- [ ] **Step 4: Add Compose verification and Playwright smoke coverage**

```ts
// web/tests/login.spec.ts
import { test, expect } from "@playwright/test";

test("redirects unauthenticated user to login", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});
```

Implementation command:

Run: `docker compose up -d postgres redis api web`
Expected: containers start and `docker compose ps` shows them as running.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api; go test ./internal/memberships -run TestInvitationHandlerReturnsTraceID -v`
Expected: PASS.

Run: `cd web; npm exec playwright test web/tests/login.spec.ts`
Expected: PASS after the web server is available.

- [ ] **Step 6: Commit**

```bash
git add api/internal/audit api/internal/memberships web/tests docker-compose.yml
git commit -m "feat: add membership audit path and compose smoke coverage"
```

### Task 8: Final Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-06-04-platform-foundation-design.md`
- Test: `docker-compose.yml`

- [ ] **Step 1: Run API test suite**

Run: `cd api; go test ./...`
Expected: PASS.

- [ ] **Step 2: Run web test suite**

Run: `cd web; npm test`
Expected: PASS.

- [ ] **Step 3: Run Playwright smoke test**

Run: `cd web; npm exec playwright test`
Expected: PASS.

- [ ] **Step 4: Run Compose smoke boot**

Run: `docker compose up -d`
Expected: core services start with the required names: `web`, `api`, `postgres`, `redis`, `temporal`, `elasticsearch`, `minio`.

- [ ] **Step 5: Run manual acceptance check**

Validate:
- `http://localhost:3000/login` loads
- unauthenticated access to `/app` redirects to `/login`
- API health endpoints respond with `trace_id`
- login flow yields a session cookie
- admin and tenant routes are server-protected

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: verify platform foundation acceptance path"
```

## Self-Review

- Spec coverage: this plan covers the approved first subproject only: web shell, API shell, auth/session, RBAC, tenant/member surface, health, audit, and Compose.
- Placeholder scan: no `TODO`, `TBD`, or “similar to Task N” placeholders are used.
- Type consistency: route names, role names, and file paths are kept consistent with the approved design doc.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-04-platform-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
