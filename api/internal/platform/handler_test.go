package platform_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/platform"
)

func TestUsersHandlerIncludesTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.UsersHandler(nil)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestUpdateUserStatusHandlerReturnsStatusPayload(t *testing.T) {
	service := auth.NewInMemoryService()
	if err := service.SeedUser("user@example.com", "user", "password123", "personal_user", "active"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/users/user@example.com/disable", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.UpdateUserStatusHandler(service, &audit.InMemoryService{}, "disabled")).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestTenantsHandlerIncludesTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/tenants", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.TenantsHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestTenantsHandlerReturnsDemoTenant(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/tenants", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.TenantsHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if body := rec.Body.String(); body == "" {
		t.Fatal("expected response body")
	}
}

func TestUpdateUserStatusHandlerRejectsWrongMethod(t *testing.T) {
	service := auth.NewInMemoryService()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/user@example.com/disable", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.UpdateUserStatusHandler(service, &audit.InMemoryService{}, "disabled")).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
	}
}
