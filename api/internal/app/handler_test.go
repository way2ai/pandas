package app_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/way2ai/pandas/api/internal/app"
	"github.com/way2ai/pandas/api/internal/httpx"
)

func TestHandlerReturnsTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/app/home", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(app.Handler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected trace header")
	}
}

func TestHandlerRejectsWrongMethod(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/app/home", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(app.Handler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "method_not_allowed") {
		t.Fatalf("expected method_not_allowed body, got %s", rec.Body.String())
	}
}
