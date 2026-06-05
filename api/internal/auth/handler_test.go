package auth_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/auth"
	"github.com/way2ai/pandas/api/internal/httpx"
)

func seedHandler(t *testing.T) (*auth.InMemoryService, *audit.InMemoryService, *auth.Handler) {
	t.Helper()

	service := auth.NewInMemoryService()
	auditService := &audit.InMemoryService{}
	if err := service.SeedUser("admin@example.com", "admin", "password123", "platform_admin", "active"); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return service, auditService, auth.NewHandler(service, "platform_session", false, auditService)
}

func TestLoginHandlerReturnsTraceID(t *testing.T) {
	_, _, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	body := []byte(`{"identifier":"admin@example.com","password":"password123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestMeHandlerRejectsMissingSession(t *testing.T) {
	_, _, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestLogoutHandlerReturnsTraceID(t *testing.T) {
	service, _, handler := seedHandler(t)
	currentSession, err := service.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestLoginHandlerRejectsInvalidBody(t *testing.T) {
	_, _, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader([]byte(`{`)))
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestLoginHandlerRejectsBlankCredentials(t *testing.T) {
	_, _, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/login",
		bytes.NewReader([]byte(`{"identifier":"   ","password":"   "}`)),
	)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "identifier and password are required") {
		t.Fatalf("expected validation body, got %s", rec.Body.String())
	}
}

func TestMeHandlerRejectsWrongMethod(t *testing.T) {
	_, _, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/me", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
	}
}

func TestLoginHandlerRecordsAuditEventOnSuccess(t *testing.T) {
	_, auditService, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/login",
		bytes.NewReader([]byte(`{"identifier":"admin@example.com","password":"password123"}`)),
	)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	events := auditService.Events()
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].Action != "login" || events[0].Result != "success" {
		t.Fatalf("unexpected audit event: %+v", events[0])
	}
}

func TestLoginHandlerRecordsAuditEventOnFailure(t *testing.T) {
	_, auditService, handler := seedHandler(t)
	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth/login",
		bytes.NewReader([]byte(`{"identifier":"admin@example.com","password":"wrong"}`)),
	)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	events := auditService.Events()
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].Action != "login" || events[0].Result != "failure" {
		t.Fatalf("unexpected audit event: %+v", events[0])
	}
}

func TestLogoutHandlerRecordsAuditEvent(t *testing.T) {
	service, auditService, handler := seedHandler(t)
	currentSession, err := service.Login("admin@example.com", "password123", "127.0.0.1")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	mux := http.NewServeMux()
	handler.Mount(mux)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: "platform_session", Value: currentSession.ID})
	rec := httptest.NewRecorder()

	httpx.WithTrace(mux).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	events := auditService.Events()
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].Action != "logout" || events[0].Result != "success" {
		t.Fatalf("unexpected audit event: %+v", events[0])
	}
}
