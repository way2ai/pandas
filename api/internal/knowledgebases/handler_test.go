package knowledgebases_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/knowledgebases"
	"github.com/way2ai/pandas/api/internal/rbac"
)

func seedKnowledgeBaseService(t *testing.T) *auth.InMemoryService {
	t.Helper()

	service := auth.NewInMemoryService()
	users := []struct {
		email    string
		username string
		role     string
	}{
		{email: "admin@example.com", username: "admin", role: "platform_admin"},
		{email: "tenant-admin@example.com", username: "tenant-admin", role: "tenant_admin"},
		{email: "member@example.com", username: "member", role: "tenant_member"},
		{email: "user@example.com", username: "user", role: "personal_user"},
	}
	for _, user := range users {
		if err := service.SeedUser(user.email, user.username, "password123", user.role, "active"); err != nil {
			t.Fatalf("seed user %s: %v", user.email, err)
		}
	}
	return service
}

func loginSession(t *testing.T, service *auth.InMemoryService, identifier string) auth.Session {
	t.Helper()

	currentSession, err := service.Login(identifier, "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login %s: %v", identifier, err)
	}
	return currentSession
}

func TestAppKnowledgeBasesHandlerReturnsPersonalWorkspaceData(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "user@example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/app/knowledge-bases", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessApp, handler.AppKnowledgeBasesHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Personal Notes") {
		t.Fatalf("expected personal knowledge base body, got %s", rec.Body.String())
	}
}

func TestAppKnowledgeBasesHandlerRejectsNonPersonalCreate(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "member@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/app/knowledge-bases", strings.NewReader(`{"name":"Member KB"}`))
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessApp, handler.AppKnowledgeBasesHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestAppKnowledgeBasesHandlerCreatesPersonalKnowledgeBase(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	auditService := &audit.InMemoryService{}
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), auditService)
	currentSession := loginSession(t, authService, "user@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/app/knowledge-bases", strings.NewReader(`{"name":"Personal Drafts"}`))
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessApp, handler.AppKnowledgeBasesHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Personal Drafts") {
		t.Fatalf("expected created knowledge base, got %s", rec.Body.String())
	}
	events := auditService.Events()
	if len(events) != 1 || events[0].Action != "knowledge_base_create" {
		t.Fatalf("unexpected audit events: %+v", events)
	}
}

func TestTenantKnowledgeBasesHandlerCreatesTenantKnowledgeBase(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "tenant-admin@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenant/knowledge-bases", strings.NewReader(`{"name":"Support Playbooks"}`))
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessTenant, handler.TenantKnowledgeBasesHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Support Playbooks") {
		t.Fatalf("expected created tenant knowledge base, got %s", rec.Body.String())
	}
}

func TestAdminKnowledgeBasesHandlerListsAllKnowledgeBases(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "admin@example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/knowledge-bases", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessAdmin, handler.AdminKnowledgeBasesHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Tenant Handbook") || !strings.Contains(rec.Body.String(), "Personal Notes") {
		t.Fatalf("expected all knowledge bases, got %s", rec.Body.String())
	}
}

func TestAppKnowledgeBaseDocumentsHandlerListsDocuments(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "user@example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/app/knowledge-bases/kb-personal-1/documents", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessApp, handler.AppKnowledgeBaseDocumentsHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "notes.md") {
		t.Fatalf("expected seeded document, got %s", rec.Body.String())
	}
}

func TestAppKnowledgeBaseDocumentsHandlerCreatesDocument(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "user@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/app/knowledge-bases/kb-personal-1/documents", strings.NewReader(`{"name":"draft.md","source_type":"file"}`))
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessApp, handler.AppKnowledgeBaseDocumentsHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "draft.md") {
		t.Fatalf("expected created document, got %s", rec.Body.String())
	}
}

func TestTenantKnowledgeBaseBuildsHandlerQueuesBuild(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "tenant-admin@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenant/knowledge-bases/kb-tenant-1/builds", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessTenant, handler.TenantKnowledgeBaseBuildsHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "\"status\":\"queued\"") {
		t.Fatalf("expected queued build, got %s", rec.Body.String())
	}
}

func TestAppKnowledgeBaseBuildsHandlerRejectsEmptyKnowledgeBase(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	service := knowledgebases.NewInMemoryService()
	service.CreatePersonal("user@example.com", "Empty Personal KB")
	handler := knowledgebases.NewHandler(service, &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "user@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/app/knowledge-bases/kb-personal-3/builds", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessApp, handler.AppKnowledgeBaseBuildsHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "knowledge_base_has_no_documents") {
		t.Fatalf("expected empty knowledge base body, got %s", rec.Body.String())
	}
}

func TestAdminBuildsHandlerListsAllBuilds(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "admin@example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/builds", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessAdmin, handler.AdminBuildsHandler())).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "build-kb-tenant-1") {
		t.Fatalf("expected seeded build, got %s", rec.Body.String())
	}
}

func TestAdminBuildActionHandlerRetriesFailedBuild(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "admin@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/builds/build-kb-personal-failed/retry", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessAdmin, handler.AdminBuildActionHandler("retry"))).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "\"status\":\"queued\"") {
		t.Fatalf("expected queued build after retry, got %s", rec.Body.String())
	}
}

func TestAdminBuildActionHandlerCancelsQueuedBuild(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "admin@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/builds/build-kb-tenant-queued/cancel", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessAdmin, handler.AdminBuildActionHandler("cancel"))).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "\"status\":\"cancelled\"") {
		t.Fatalf("expected cancelled build, got %s", rec.Body.String())
	}
}

func TestAdminBuildActionHandlerRejectsInvalidRetry(t *testing.T) {
	authService := seedKnowledgeBaseService(t)
	handler := knowledgebases.NewHandler(knowledgebases.NewInMemoryService(), &audit.InMemoryService{})
	currentSession := loginSession(t, authService, "admin@example.com")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/builds/build-kb-tenant-1/retry", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(rbac.RequireRole("platform_session", authService, rbac.CanAccessAdmin, handler.AdminBuildActionHandler("retry"))).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "build_not_retryable") {
		t.Fatalf("expected build_not_retryable body, got %s", rec.Body.String())
	}
}
