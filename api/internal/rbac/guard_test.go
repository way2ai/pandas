package rbac_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/rbac"
)

func seedRoleService(t *testing.T) *auth.InMemoryService {
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

func TestRequireRoleRejectsMissingSession(t *testing.T) {
	service := seedRoleService(t)
	handler := rbac.RequireRole(
		"platform_session",
		service,
		rbac.CanAccessApp,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("next handler should not be called")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/app/home", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireRoleRejectsForbiddenRole(t *testing.T) {
	service := seedRoleService(t)
	currentSession, err := service.Login("tenant-admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	handler := rbac.RequireRole(
		"platform_session",
		service,
		rbac.CanAccessAdmin,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("next handler should not be called")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/home", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestRequireRoleAllowsPersonalUserIntoAppArea(t *testing.T) {
	service := seedRoleService(t)
	currentSession, err := service.Login("user@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	called := false
	handler := rbac.RequireRole(
		"platform_session",
		service,
		rbac.CanAccessApp,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/app/home", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !called {
		t.Fatal("expected next handler to be called")
	}
}

func TestRequireRoleRejectsDisabledUserSession(t *testing.T) {
	service := seedRoleService(t)
	currentSession, err := service.Login("user@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if err := service.SetUserStatus("user@example.com", "disabled"); err != nil {
		t.Fatalf("disable user: %v", err)
	}

	handler := rbac.RequireRole(
		"platform_session",
		service,
		rbac.CanAccessApp,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("next handler should not be called")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/app/home", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}
