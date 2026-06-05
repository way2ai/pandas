package platform_test

import (
	"encoding/json"
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
	service := auth.NewInMemoryService()
	if err := service.SeedUser("user@example.com", "user", "password123", "personal_user", "disabled"); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.UsersHandler(service)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}

	var payload struct {
		Data []map[string]string `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected one user, got %d", len(payload.Data))
	}
	if payload.Data[0]["email"] != "user@example.com" {
		t.Fatalf("expected user email, got %q", payload.Data[0]["email"])
	}
	if payload.Data[0]["status"] != "disabled" {
		t.Fatalf("expected disabled status, got %q", payload.Data[0]["status"])
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

func TestHomeHandlerRejectsWrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/home", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.HomeHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
	}
}

func TestUsersHandlerRejectsWrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/users", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.UsersHandler(auth.NewInMemoryService())).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
	}
}

func TestTenantsHandlerRejectsWrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/tenants", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(platform.TenantsHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
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
