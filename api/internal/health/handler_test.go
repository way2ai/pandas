package health_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/way2ai/pandas/api/internal/health"
	"github.com/way2ai/pandas/api/internal/httpx"
)

func TestLiveEndpointIncludesTraceID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health/live", nil)
	rec := httptest.NewRecorder()

	httpx.WithTrace(health.NewHandler()).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	if rec.Header().Get("X-Trace-Id") == "" {
		t.Fatal("expected X-Trace-Id header")
	}
}
