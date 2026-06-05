package memberships_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/way2ai/pandas/api/internal/audit"
	"github.com/way2ai/pandas/api/internal/httpx"
	"github.com/way2ai/pandas/api/internal/memberships"
)

func TestInvitationHandlerReturnsTraceID(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/tenant/members/invitations",
		strings.NewReader(`{"email":"trace@example.com","role":"tenant_member"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler := memberships.NewHandler(&audit.InMemoryService{})
	httpx.WithTrace(handler.InvitationHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestMembersHandlerReturnsTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tenant/members", nil)
	rec := httptest.NewRecorder()

	handler := memberships.NewHandler(&audit.InMemoryService{})
	httpx.WithTrace(handler.MembersHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestInvitationHandlerRejectsWrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tenant/members/invitations", nil)
	rec := httptest.NewRecorder()

	handler := memberships.NewHandler(&audit.InMemoryService{})
	httpx.WithTrace(handler.InvitationHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
	}
}

func TestInvitationHandlerReturnsInvitedMemberPayload(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/tenant/members/invitations",
		strings.NewReader(`{"email":"new@example.com","role":"tenant_admin"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler := memberships.NewHandler(&audit.InMemoryService{})
	httpx.WithTrace(handler.InvitationHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload struct {
		Data map[string]string `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data["email"] != "new@example.com" {
		t.Fatalf("expected invited email, got %q", payload.Data["email"])
	}
	if payload.Data["role"] != "tenant_admin" {
		t.Fatalf("expected invited role, got %q", payload.Data["role"])
	}
	if payload.Data["status"] != "invited" {
		t.Fatalf("expected invited status, got %q", payload.Data["status"])
	}
}

func TestInvitationHandlerRejectsInvalidBody(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tenant/members/invitations", strings.NewReader(`{`))
	rec := httptest.NewRecorder()

	handler := memberships.NewHandler(&audit.InMemoryService{})
	httpx.WithTrace(handler.InvitationHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "bad_request") {
		t.Fatalf("expected bad_request body, got %s", rec.Body.String())
	}
}

func TestInvitationHandlerRejectsBlankInvitationFields(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/tenant/members/invitations",
		strings.NewReader(`{"email":"   ","role":"   "}`),
	)
	rec := httptest.NewRecorder()

	handler := memberships.NewHandler(&audit.InMemoryService{})
	httpx.WithTrace(handler.InvitationHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "email and role are required") {
		t.Fatalf("expected validation body, got %s", rec.Body.String())
	}
}
