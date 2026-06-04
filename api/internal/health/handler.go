package health

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

// NewHandler returns the health endpoint mux.
func NewHandler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/health/live", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{
				"status": "ok",
			},
		})
	})

	mux.HandleFunc("/api/v1/health/ready", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{
				"status": "ready",
			},
		})
	})

	return mux
}
